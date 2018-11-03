/**
 * Copyright 2018, leezhenghui@gmail.com.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 *
 * @module Provides runtime invocation framework
 *
 */

import * as Debug from 'debug';
import * as Q from 'q';
import { InteractionStyleType } from '../metadata/common';
import { OperationMetadata, InterceptorFactory } from '../metadata/operation';
import { InterceptorMetadata } from '../metadata/interceptor';
import { AnyFn } from '../util/types';
import { interceptorRegistry } from './interceptor';

const debug: Debug.IDebugger = Debug('proxify:runtime:invocation');

export type ProcessorNexter = (error: any, status: ProcessStatus) => void;
export type canProcessCallbackFn = (error: any, canProcess: boolean) => void;

export enum InteractionType {
  UNSUPPORTED = 0,
  INTERACTION_LOCATE = 1,
  INTERACTION_LOCATE_RESULT = 2,
  INTERACTION_INVOKE = 4,
  INTERACTION_INVOKE_RESULT = 8,
  INTERACTION_INVOKE_FAULT = 16,
}

export enum CompletionStyle {
  UNKNOWN = 0,
  SYNC_DIRECTLY = 1,
  SYNC_CALLBACK = 2,
  ASYNC_PROMISE = 4,
  ASYNC_CALLBACK = 8,
}

export class Interaction {
  public interactionType: InteractionType;
  public omd: OperationMetadata;
  public _isTargetInvoked: boolean = false;
  public __hold_on_nexter__: ProcessorNexter;
  public __completion_style__: CompletionStyle;
  public __isCallbackStyle__: boolean;
}

/**
 * Base Fault class
 */
export class Fault {
  public errorCode: string;
  public reason: string;
  public details: any;
  public thrownBy: string;
  public isBizFault: boolean = false;

  constructor(thrownBy: string, errorCode: string, reason: string, details: any) {
    this.thrownBy = thrownBy;
    this.errorCode = errorCode;
    this.reason = reason;
    this.details = details;
  }
}

export class InvocationContext {
  private currentProssor: Processor = null;

  /**
   * Session contains all of data for
   * current invocation, including domain/tenant
   * info
   */
  private slots: Map<string, any> = new Map<string, any>();

  /**
   * arguments for the invocation
   */
  public input: any[];

  /**
   * The invocation result
   */
  public output: any;

  /**
   * Either Business Fault or Runtime Fault
   *
   */
  public fault: Fault;

  /**
   * The this argument for the target object of invocation
   */
  public targetObj: any;

  /**
   * Advanced metadata info which will used
   * to navigate the processing direction.
   * Only accessable for the code within this module, e.g:
   * built-in interceptors: * HeaderIntercepor, TailInterceptor and Invoker need these
   * info to perform the processing. Highlevel interceptor should extend from BaseInterceptor,
   * can not access these hiden metadata
   */
  private __interaction__: Interaction;

  public getInteraction(): Interaction {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    return self.__interaction__;
  }

  public _setInteraction(i: Interaction): void {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }
    self.__interaction__ = i;
  }

  public getInteractionType(): InteractionType {
    const self: InvocationContext = this;
    if (self.__interaction__) {
      return self.__interaction__.interactionType;
    }

    return null;
  }

  public setInteractionType(interactionType: InteractionType): void {
    const self: InvocationContext = this;

    self.__interaction__.interactionType = interactionType;
  }

  public getCompletionStyle(): CompletionStyle {
    const self: InvocationContext = this;

    return self.__interaction__.__completion_style__;
  }

  public _setCompletionStyle(s: CompletionStyle): void {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    self.__interaction__.__completion_style__ = s;
  }

  public _setOperationMetadata(omtdt: OperationMetadata): void {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    self.__interaction__.omd = omtdt;
  }

  public getHoldOnNexter(): ProcessorNexter {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    return self.__interaction__.__hold_on_nexter__;
  }

  public _setHoldOnNexter(nexter: ProcessorNexter): void {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    self.__interaction__.__hold_on_nexter__ = nexter;
  }

  public _setCallbackStyle(isCallbackStyle: boolean): void {
    const self: InvocationContext = this;
    if (!self.isRunningInSystemProcessor()) {
      throw new Error('Forbidden operation, this operation only be allowed in internal processor!');
    }

    self.__interaction__.__isCallbackStyle__ = isCallbackStyle;
  }

  private isRunningInSystemProcessor(): boolean {
    const self: InvocationContext = this;

    if (!self.currentProssor) {
      // still not get into processor, e.g: in the endpoint invoker
      return true;
    }

    if (self.currentProssor.getName().indexOf('system:') === 0) {
      return true;
    }

    return false;
  }

  public __setCurrentProcessor(p: Processor): void {
    const self: InvocationContext = this;
    const origP = self.currentProssor;

    self.currentProssor = p;
    debug(
      'Processor shift: ' +
        (origP ? origP.getName() : 'null') +
        ' --> ' +
        (p ? p.getName() : 'null') +
        '; InteractionType: ' +
        self.getInteractionType(),
    );
  }

  public getClassName(): string {
    const self: InvocationContext = this;
    return self.__interaction__.omd.__className__;
  }

  public getOperationName(): string {
    const self: InvocationContext = this;
    return self.__interaction__.omd.__operationName__;
  }

  public _isCallbackSupported(): boolean {
    if (this.__interaction__.omd.__completion_fn_param_position__ === undefined) {
      return false;
    }

    if (!this.input || this.input.length === 0) {
      return false;
    }

    if (!this.input[this.__interaction__.omd.__completion_fn_param_position__]) {
      return false;
    }

    return true;
  }

  public _isPromiseReturned(): boolean {
    const self: InvocationContext = this;
    if (
      self.__interaction__.interactionType !== InteractionType.INTERACTION_INVOKE_RESULT &&
      self.__interaction__.interactionType !== InteractionType.INTERACTION_INVOKE_FAULT
    ) {
      throw new Fault('node.proxify.runtime', 'E_INTERCEPTOR_0091', 'Call in wrong context phases', null);
    }

    if (!self.output) {
      return false;
    }
    return Q.isPromiseAlike(self.output);
  }

  public _targetInvoked(): void {
    this.__interaction__._isTargetInvoked = true;
  }

  public _isTargetInvoked(): boolean {
    return this.__interaction__._isTargetInvoked;
  }

  public getSlotContext(): any {
    const self: InvocationContext = this;

    if (!self.currentProssor) {
      return;
    }

    const slotCtx: any = self.slots.get(self.currentProssor.getName());

    return slotCtx;
  }

  public setSlotContext(slotCtx: any): void {
    const self: InvocationContext = this;
    if (!self.currentProssor) {
      return;
    }
    self.slots.set(self.currentProssor.getName(), slotCtx);
  }
}

export class ProcessStatus {
  public interactionType: InteractionType;
  public status: string;

  public constructor(interactionType: InteractionType, status: string) {
    this.interactionType = interactionType;
    this.status = status;
  }
}

export abstract class Processor {
  private __next: Processor;
  private __previous: Processor;
  private __frozen: boolean;

  constructor() {
    this.__frozen = false;
    this.__next = null;
    this.__previous = null;
  }

  public abstract canProcess(context: InvocationContext, callback: canProcessCallbackFn): void;
  public abstract getName(): string;

  /**
   * Not like protected modifier in java, typescript does not have the accessiable control for
   * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
   * we want this method only be accessed within same module/namespace, so make the method start with "_"
   * to indicate this intention
   * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
   */
  public abstract _process(context: InvocationContext, next: ProcessorNexter): void;

  /**
   * Public method to set next interceptor
   *
   * Not like protected modifier in java, typescript does not have the accessiable control for
   * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
   * we want this method only be accessed within same module/namespace, so make the method start with "_"
   * to indicate this intention
   * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
   */
  public _setNext(next: Processor): void {
    if (this.__frozen) {
      throw Error('Forbidden to reset next interceptor once the interceptor is frozen');
    }
    this.__next = next;
  }

  /**
   * Public method to get next interceptor
   *
   * Not like protected modifier in java, typescript does not have the accessiable control for
   * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
   * we want this method only be accessed within same module/namespace, so make the method start with "_"
   * to indicate this intention
   * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
   */
  public _getNext(): Processor {
    return this.__next;
  }

  /**
   * Public method to set previous interceptor
   *
   * Not like protected modifier in java, typescript does not have the accessiable control for
   * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
   * we want this method only be accessed within same module/namespace, so make the method start with "_"
   * to indicate this intention
   * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
   */
  public _setPrevious(previous: Processor): void {
    if (this.__frozen) {
      throw Error('Forbidden to reset next interceptor once the interceptor is frozen');
    }
    this.__previous = previous;
  }

  /**
   * Public method to get previous interceptor
   *
   * Not like protected modifier in java, typescript does not have the accessiable control for
   * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
   * we want this method only be accessed within same module/namespace, so make the method start with "_"
   * to indicate this intention
   *
   * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
   */
  public _getPrevious(): Processor {
    return this.__previous;
  }

  /**
   * Public method to freeze the interceptor interceptor status for given runtime endpoint invocation chain
   */
  public freeze() {
    this.__frozen = true;
  }
}

/**
 * Predefined built-in interceptor, which is the first interceptor in invocation chain.
 * After the invocation chain initailed, it will fire a LOCATE process tomake sure all of interceptors are ready to process the request.
 * In *_result interaction type, it will change report the result/response to caller
 */
class HeaderInvoker extends Processor {
  private omd: OperationMetadata;
  public constructor(omd: OperationMetadata) {
    super();
    this.omd = omd;
  }

  public canProcess(context: InvocationContext, callback: canProcessCallbackFn): void {
    callback(null, true);
  }

  public getName(): string {
    return 'system:internal:header';
  }

  public _process(context: InvocationContext, next: ProcessorNexter): void {
    const self: HeaderInvoker = this;
    const method: string = self.getName() + '._process';
    context.__setCurrentProcessor(self);

    if (!context.getInteraction()) {
      context._setInteraction(new Interaction());
      context._setOperationMetadata(self.omd);
      context.setInteractionType(InteractionType.INTERACTION_LOCATE);
    }

    debug(method, '[header]', context.getInteractionType());
    // console.log('==>[header]: processing ' + context.getInteractionType());

    self.canProcess(
      context,
      function(error: any, canProcess: boolean) {
        const interactionType: InteractionType = context.getInteractionType();
        switch (interactionType) {
          case InteractionType.INTERACTION_LOCATE:
          case InteractionType.INTERACTION_INVOKE:
            return self._getNext()._process(
              context,
              function(error: any, status: ProcessStatus) {
                next(error, status);
              }.bind(self),
            );
          case InteractionType.INTERACTION_LOCATE_RESULT:
            context.setInteractionType(InteractionType.INTERACTION_INVOKE);
            return self._process(
              context,
              function(error: any, status: ProcessStatus) {
                next(error, status);
              }.bind(self),
            );
          case InteractionType.INTERACTION_INVOKE_RESULT:
          case InteractionType.INTERACTION_INVOKE_FAULT:
            return next(null, new ProcessStatus(interactionType, 'done'));
          default:
            throw new Error('Unsupported interaction type: ' + interactionType);
        }
      }.bind(self),
    );
  }
}

/**
 * Predefined built-in interceptor, which is the last interceptor in
 * invocation chain.
 *   In REQUEST interaction type, it will call to invoker.
 *   In LOCATE interaction type, it will change the type to LOCATE_RESULT
 */
class TailInvoker extends Processor {
  private targetFn: AnyFn;

  public constructor(targetFn: AnyFn) {
    super();
    this.targetFn = targetFn;
  }

  public canProcess(context: InvocationContext, callback: canProcessCallbackFn): void {
    callback(null, true);
  }

  public getName(): string {
    return 'system:internal:tail';
  }

  public _process(context: InvocationContext, next: ProcessorNexter): void {
    const self: TailInvoker = this;
    const method: string = self.getName() + '._process';
    context.__setCurrentProcessor(self);
    // console.log('==>[tail]: processing ' + context.getInteractionType());
    debug(method, '[tail]', context.getInteractionType());

    self.canProcess(
      context,
      function(error: any, canProcess: boolean) {
        const interactionType: InteractionType = context.getInteractionType();
        switch (interactionType) {
          case InteractionType.INTERACTION_LOCATE:
            context.setInteractionType(InteractionType.INTERACTION_LOCATE_RESULT);
            return self._process(context, function(error: any, status: ProcessStatus) {
              next(error, status);
            });
          case InteractionType.INTERACTION_INVOKE_RESULT:
          case InteractionType.INTERACTION_INVOKE_FAULT:
          case InteractionType.INTERACTION_LOCATE_RESULT:
            return self._getPrevious()._process(context, function(error: any, status: ProcessStatus) {
              next(error, status);
            });
          case InteractionType.INTERACTION_INVOKE:
            try {
              context._setHoldOnNexter(next);
              const reval = self.invoke(context.targetObj, context.input);
              context.output = reval;

              // sync callback mode
              if (
                context.getInteractionType() === InteractionType.INTERACTION_INVOKE_RESULT ||
                context.getInteractionType() === InteractionType.INTERACTION_INVOKE_FAULT
              ) {
                debug(method, '[tail] sync callback mode');
                context._setCompletionStyle(CompletionStyle.SYNC_CALLBACK);
                return;
              }

              // async callback mode
              if (context._isCallbackSupported()) {
                debug(method, '[tail] async callback mode');
                context._setCompletionStyle(CompletionStyle.ASYNC_CALLBACK);
                return;
              }

              // async promise mode
              if (Q.isPromiseAlike(reval)) {
                debug(method, '[tail] async promise mode');
                context._setCompletionStyle(CompletionStyle.ASYNC_PROMISE);

                let realResult: any = null;
                let realError: any = null;
                context.output = Q(reval)
                  .then(
                    function(result: any) {
                      context.setInteractionType(InteractionType.INTERACTION_INVOKE_RESULT);
                      realResult = result;
                      const deferred: Q.Deferred<any> = Q.defer<any>();
                      self._process(
                        context,
                        function(error: any, status: ProcessStatus) {
                          deferred.resolve();
                          return next(error, status);
                        }.bind(self),
                      );
                      return deferred.promise;
                    }.bind(self),
                    function(error: any) {
                      realError = error;
                      context.setInteractionType(InteractionType.INTERACTION_INVOKE_FAULT);
                      const deferred: Q.Deferred<any> = Q.defer<any>();
                      self._process(
                        context,
                        function(error: any, status: ProcessStatus) {
                          deferred.resolve();
                          return next(error, status);
                        }.bind(self),
                      );
                      return deferred.promise;
                    }.bind(self),
                  )
                  .then(
                    function(processStatus) {
                      if (realError) {
                        return Q.reject(realError);
                      }
                      return Q(realResult);
                    }.bind(self),
                  );
                return;
              }

              // sync-directly
              debug(method, '[tail] sync directly return value mode');
              context._setCompletionStyle(CompletionStyle.SYNC_DIRECTLY);
              context.setInteractionType(InteractionType.INTERACTION_INVOKE_RESULT);
              self._process(
                context,
                function(error: any, status: ProcessStatus) {
                  return next(error, status);
                }.bind(self),
              );
              return;
            } catch (error) {
              // TODO, fault handling
              const fault: Fault = new Fault(self.getName(), null, null, null);
              fault.errorCode = error.errorCode;
              fault.reason = error.message || error.reason;
              fault.details = error;
              fault.isBizFault = true;
              context.setInteractionType(InteractionType.INTERACTION_INVOKE_FAULT);
              self._process(
                context,
                function(error: any, status: ProcessStatus) {
                  return next(error, status);
                }.bind(self),
              );
            } // try/catch
          default:
            throw new Error('Invalid interaction type: ' + interactionType);
        } // switch
      }.bind(self),
    );
  }

  private invoke(thisArg: any, args: any[]): any {
    const self: TailInvoker = this;
    const reval = Reflect.apply(self.targetFn, thisArg, args);
    return reval;
  }
}

/* 
	* Predefined built-in processor, which will be called when the method completion occurs in an callback approach, e.g: async-callback. 
	* 
 */
class OnInvokeResponser extends Processor {
  public constructor(tail: TailInvoker) {
    super();
    this._setPrevious(tail);
  }

  public canProcess(context: InvocationContext, callback: canProcessCallbackFn): void {
    callback(null, true);
  }

  public getName(): string {
    return 'system:internal:onInvokeResponser';
  }

  public _process(context: InvocationContext, next: ProcessorNexter): void {
    const self: OnInvokeResponser = this;
    context.__setCurrentProcessor(self);
    const holdOnNexter = context.getHoldOnNexter();

    self._getPrevious()._process(
      context,
      function(error: any, status: ProcessStatus) {
        return holdOnNexter(error, status);
      }.bind(self),
    );
  }

  public onInvokeResponse(context: InvocationContext): void {
    const self: OnInvokeResponser = this;
    context.setInteractionType(InteractionType.INTERACTION_INVOKE_RESULT);

    self._process(context, null);
  }

  public onInvokeFault(context: InvocationContext): void {
    const self: OnInvokeResponser = this;
    context.setInteractionType(InteractionType.INTERACTION_INVOKE_FAULT);

    self._process(context, null);
  }
}

/**
 * The final invoker to target function via reflect API. Also, support/unify the two
 * kind of completion hints
 * e.g:
 *    If the return value is promise, do nothing
 *    If the completion hints is callback method, switch it to promise, unify the behavior in
 *    the internal implementation
 *
 */
export class EndpointInvoker {
  private omd: OperationMetadata;
  private targetFn: AnyFn;
  private header: HeaderInvoker;
  private tail: TailInvoker;
  private isInited: boolean = false;

  public constructor(omd: OperationMetadata, targetFn: AnyFn) {
    this.omd = omd;
    this.targetFn = targetFn;

    this.header = new HeaderInvoker(omd);
    this.tail = new TailInvoker(targetFn);

    this.header._setNext(this.tail);
    this.tail._setPrevious(this.header);
  }

  public invoke(context: InvocationContext): any {
    const method: string = 'invoke';
    const self: EndpointInvoker = this;

    if (!self.isInited) {
      self.init();
    }

    let processStatus: ProcessStatus;
    const deferred: Q.Deferred<any> = Q.defer<any>();

    self.header._process(
      context,
      function(error: any, status: ProcessStatus) {
        processStatus = status;
        if (Q.isPromiseAlike(context.output)) {
          return deferred.resolve(context.output);
        }
        deferred.resolve();
      }.bind(self),
    );

    // ==========================================================
    // if all interceptors perform sync behavior in request path
    // we can do a more accurate determination
    // ==========================================================

    // sync-callback or sync-return
    if (
      (context.getCompletionStyle() === CompletionStyle.SYNC_DIRECTLY ||
        context.getCompletionStyle() === CompletionStyle.SYNC_CALLBACK) &&
      processStatus.interactionType === InteractionType.INTERACTION_INVOKE_RESULT
    ) {
      if (context.getCompletionStyle() === CompletionStyle.SYNC_DIRECTLY) {
        debug(method, 'sync-directly mode');
        // console.log(method, 'sync-directly mode');
      } else {
        debug(method, 'sync-callback mode');
        // console.log(method, 'sync-callback mode');
      }
      return context.output;
    }

    // async-promise
    if (context.getCompletionStyle() === CompletionStyle.ASYNC_PROMISE) {
      debug(method, 'async call mode with promise');
      // console.log(method, 'async call mode with promise');
      return deferred.promise;
    }

    // async-callback
    if (context.getCompletionStyle() === CompletionStyle.ASYNC_CALLBACK) {
      debug(method, 'async call mode with callback');
      // console.log(method, 'async call mode with callback');
      return context.output;
    }

    // sync call with exception thrown
    if (processStatus && processStatus.interactionType === InteractionType.INTERACTION_INVOKE_FAULT) {
      if (context.getCompletionStyle() === CompletionStyle.SYNC_DIRECTLY) {
        debug(method, 'sync-directly mode with fault');
        // console.log(method, 'sync-directly mode with fault');
      } else if (context.getCompletionStyle() === CompletionStyle.SYNC_CALLBACK) {
        debug(method, 'sync-callback mode with fault');
        // console.log(method, 'sync-callback mode with fault');
      } else {
        debug(method, 'interceptor runtime fault  mode');
        // console.log(method, 'interceptor runtime fault  mode');
      }
      throw context.fault.details;
    }

    //=================================================
    // Contains async interceptors in request path
    //
    // This implying:
    // target method must be an async interaction
    // and if callback method exists in request
    // parameter, the callback is precedence approach
    //=================================================

    // async-promise
    if (!context._isCallbackSupported()) {
      debug(method, 'async call mode with promise');
      // console.log(method, 'async call mode with promise');
      return deferred.promise;
    }

    // async-callback
    debug(method, 'async call mode with callback');
    // console.log(method, 'async call mode with callback');
    return context.output;
  }

  public invokeResultAsync(context: InvocationContext) {
    const self: EndpointInvoker = this;
    const method: string = 'invokeResultAsync';
    if (!self.isInited) {
      self.init();
    }

    debug(method, context);

    const onInvokeResponser: OnInvokeResponser = new OnInvokeResponser(self.tail);
    onInvokeResponser.onInvokeResponse(context);
  }

  public invokeFaultAsync(context: InvocationContext) {
    const method: string = 'invokeFaultAsync';
    const self: EndpointInvoker = this;
    if (!self.isInited) {
      self.init();
    }

    debug(method, context);

    const onInvokeResponser: OnInvokeResponser = new OnInvokeResponser(self.tail);
    onInvokeResponser.onInvokeFault(context);
  }

  private init(): void {
    const self: EndpointInvoker = this;
    const factories: InterceptorFactory[] = this.omd.getInterceptorFactories();
    const asyncNotAllowed: boolean = self.omd.interactionStyle === InteractionStyleType.SYNC ? true : false;
    const appliedInterceptorNames: Set<string> = new Set<string>();

    factories.forEach(function(factory) {
      const p: Processor = factory.create();

      const imtdt: InterceptorMetadata = interceptorRegistry.getInterceptorMetadata(p.getName());

      if (!imtdt) {
        throw new Error(
          'Interceptor "' +
            p.getName() +
            '" was not registered, probably cause by a wrong interceptor name as it class name',
        );
      }

      if (asyncNotAllowed && imtdt.interactionStyle === InteractionStyleType.ASYNC) {
        throw new Error(
          'Invalid interaction styles: target method is sync, but the interceptor "' +
            p.getName() +
            '" is async style!',
        );
      }

      if (appliedInterceptorNames.has(p.getName())) {
        throw new Error('Conflict interceptor name: ' + p.getName());
      } else {
        appliedInterceptorNames.add(p.getName());
      }

      const previous: Processor = self.tail._getPrevious();
      p._setPrevious(previous);
      p._setNext(self.tail);
      previous._setNext(p);
      self.tail._setPrevious(p);
    });

    this.isInited = true;
  }
}
