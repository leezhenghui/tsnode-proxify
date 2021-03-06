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
 * @module Provides Class and Method Wrapper features in runtime perspective
 *
 */

import * as Debug from 'debug';
import {
  InteractionStyleType,
  isComponentManagedProp,
  isCallbackWrappedProp,
  isBindWrappedProp,
} from '../metadata/common';
import { ComponentMetadata, COMPONENT_METADATA_SLOT } from '../metadata/component';
import { OperationMetadata, OPERATION_METADATA_SLOT } from '../metadata/operation';
import { CallbackMetadata, CALLBACK_METADATA_SLOT } from '../metadata/callback';
import { InvocationContext, EndpointInvoker, Fault } from './invocation';
import { AnyFn } from '../util/types';

const debug: Debug.IDebugger = Debug('proxify:runtime:wrapper');

const CALLBACK_STACK_CONTEXT_PUSH = '__callback_stack_context_push__';

/**
 * Callback method wrapper trap handler
 *
 * Wrapper the callback parameter if it is repsesented in the invocation
 *
 */
class CallbackMethodWrapperTrapHandler {
  private metadata: CallbackMetadata;
  private invoker: EndpointInvoker;
  private iCtx: InvocationContext;
  private ctxStack: Array<{
    metadata?: CallbackMetadata;
    invoker: EndpointInvoker;
    iCtx: InvocationContext;
  }> = new Array();

  constructor(metadata: CallbackMetadata, endpointInvoker: EndpointInvoker, context: InvocationContext) {
    // current metadata
    this.metadata = metadata;
    // current invoker
    this.invoker = endpointInvoker;
    // current invocation context
    this.iCtx = context;

    this.ctxStack.push({
      metadata: metadata,
      invoker: endpointInvoker,
      iCtx: context,
    });
  }

  public get(target: any, name: string): any {
    const method: string = 'CallbackMethodWrapperTrapHandler.get';
    debug(method + ' [Enter]', target, name);
    if (isCallbackWrappedProp === name) {
      debug(method + ' [Exit]', true);
      return true;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString
    // The toString() method will throw a TypeError exception ("Function.prototype.toString called on incompatible object"),
    // if its this value object is not a Function object. It will also throw for Proxy objects
    if ('toString' === name) {
      return function() {
        return target.toString();
      };
    }

    debug(method + ' [Exit]', target[name]);
    return target[name];
  }

  public set(target: any, name: string, value: any): any {
    try {
      if (CALLBACK_STACK_CONTEXT_PUSH === name) {
        this.metadata = value.metadata;
        this.invoker = value.invoker;
        this.iCtx = value.iCtx;

        this.ctxStack.push(value);
        return true;
      }

      target[name] = value;
    } catch (err) {
      debug('Failed to perform "set" operation for value: ', value);
    }
  }

  public apply(operation: AnyFn, context: any, args: any[]): any {
    const self: CallbackMethodWrapperTrapHandler = this;
    const method: string = 'CallbackMethodWrapperTrapHandler.apply';

    try {
      debug(method + ' [Enter]', operation.name, args, this.metadata);
      while (self.popStackContext()) {
        let fault: Fault = null;

        if (self.metadata) {
          let i: number = 0;
          for (i = 0; i < args.length; i++) {
            if (self.metadata.isFaultParam(i) && args[i] !== null && args[i] !== undefined) {
              fault = new Fault(null, null, null, args[i]);
              fault.isBizFault = true;
              break;
            }
          }
        }

        self.iCtx._setCallbackStyle(true);
        if (self.invoker && self.iCtx) {
          if (fault) {
            // console.log('==>[invokeFaultAsync Flow]: ', operation, args, this.metadata);
            debug(method + ' [InvokeFaultAsyncFlow]', operation, args, this.metadata);
            self.iCtx.fault = fault;
            self.invoker.invokeFaultAsync(self.iCtx);
          } else {
            // console.log('==>[invokeResultAsync Flow]: ', operation, args, this.metadata);
            debug(method + ' [InvokeResultAsyncFlow]', operation, args, this.metadata);
            self.invoker.invokeResultAsync(self.iCtx);
          }
        } else {
          debug(method + ' skip proxify handling');
        }
      }

      const reval = Reflect.apply(operation, context, args);
      self.invoker = null;
      self.iCtx = null;
      debug(method + ' [Exit]', reval);
      return reval;
    } catch (err) {
      console.error('Error: ' + method, err);
      throw err;
    }
  }

  private popStackContext(): {
    metadata?: CallbackMetadata;
    invoker: EndpointInvoker;
    iCtx: InvocationContext;
  } {
    const self: CallbackMethodWrapperTrapHandler = this;

    const sc: {
      metadata?: CallbackMetadata;
      invoker: EndpointInvoker;
      iCtx: InvocationContext;
    } = self.ctxStack.pop();

    if (sc) {
      self.metadata = sc.metadata;
      self.invoker = sc.invoker;
      self.iCtx = sc.iCtx;
    } else {
      self.metadata = null;
      self.invoker = null;
      self.iCtx = null;
    }

    return sc;
  }
}

class BindWrapperTrapHandler {
  private metadata: OperationMetadata;
  private origFn: AnyFn;

  constructor(metadata: OperationMetadata, origFn: AnyFn) {
    this.metadata = metadata;
    this.origFn = origFn;
  }

  public get(target: any, name: string): any {
    const method: string = 'BindWrapperTrapHandler.get';
    const self: BindWrapperTrapHandler = this;

    debug(method + ' [Enter]', target, name);
    if (isBindWrappedProp === name) {
      debug(method + ' [Exit]', true);
      return true;
    }
    debug(method + ' [Exit]', target[name]);
    return target[name];
  }

  public apply(operation: AnyFn, context: any, args: any[]): any {
    const method: string = 'BindWrapperTrapHandler.apply';
    const self: BindWrapperTrapHandler = this;

    debug(method + ' [Enter]', operation.name, args, this.metadata);

    // use self.origFn as context, do not use the passed in param "context"
    // as that will create a new proxy instance, which will make a duplicated wrapper
    // for the bindedFn
    const bindedFn = Reflect.apply(operation, self.origFn, args);
    if (bindedFn[isComponentManagedProp]) {
      return bindedFn;
    }

    const wrappedMethod: AnyFn = new Proxy(bindedFn, new MethodWrapperTrapHandler(self.metadata, null, bindedFn));

    debug(method + ' [Enter]', operation.name, args, this.metadata);
    return wrappedMethod;
  }
}

const BIND_METHOD: string = 'bind';

/**
 * Method Proxy wrapper trap handler
 */
class MethodWrapperTrapHandler {
  private metadata: OperationMetadata;
  private targetObject: any;
  private origFn: AnyFn;

  constructor(metadata: OperationMetadata, targetObject: any, origFn: AnyFn) {
    this.metadata = metadata;
    this.targetObject = targetObject;
    this.origFn = origFn;
  }

  public get(target: any, name: string): any {
    const method: string = 'MethodWrapperTrapHandler.get';
    const self: MethodWrapperTrapHandler = this;
    debug(method + ' [Enter]', target, name);
    if (isComponentManagedProp === name) {
      debug(method + ' [Exit]', true);
      return true;
    }

    if (OPERATION_METADATA_SLOT === name) {
      debug(method + ' [Exit]', this.metadata);
      return this.metadata;
    }

    if (BIND_METHOD === name) {
      if (target[name][isBindWrappedProp]) {
        return target[name];
      }
      const bindWrappedFn: AnyFn = new Proxy(target[name], new BindWrapperTrapHandler(self.metadata, self.origFn));
      target[name] = bindWrappedFn;
    }
    debug(method + ' [Exit]', target[name]);
    return target[name];
  }

  public apply(operation: AnyFn, context: any, args: any[]): any {
    const method: string = 'MethodWrapperTrapHandler.apply';
    debug(method + ' [Enter]', operation.name, args, this.metadata);

    try {
      const invoker: EndpointInvoker = new EndpointInvoker(this.metadata, operation);
      const iCtx: InvocationContext = new InvocationContext();
      iCtx.input = args;
      iCtx.targetObj = this.targetObject;

      // wrapper callback method, if the callback parameter is represented
      // in args list
      const cbParamPos = this.metadata.__completion_fn_param_position__;
      if (cbParamPos !== undefined && cbParamPos !== null) {
        if (args[cbParamPos] && 'function' === typeof args[cbParamPos]) {
          debug(method + ' wrapper callback method', args[cbParamPos]);
          const origCB = args[cbParamPos];

          let proxiedCB = origCB;
          if (origCB[isCallbackWrappedProp]) {
            debug(method + ' nested wrapper', args[cbParamPos]);
            const currentMetadta = origCB[CALLBACK_METADATA_SLOT];
            origCB[CALLBACK_STACK_CONTEXT_PUSH] = {
              metadata: currentMetadta,
              invoker: invoker,
              iCtx: iCtx,
            };
          } else {
            proxiedCB = new Proxy(
              origCB,
              new CallbackMethodWrapperTrapHandler(origCB[CALLBACK_METADATA_SLOT], invoker, iCtx),
            );
          }
          args[cbParamPos] = proxiedCB;
        }
      }

      // let reval = Reflect.apply(operation, this.targetObject, args);
      const reval = invoker.invoke(iCtx);
      debug(method + ' [Exit]', reval);
      return reval;
    } catch (err) {
      debug('Error: ' + method, err);
      throw err;
    }
  }
}

/**
 * The object instance proxy wrapper trap handler
 *
 */
class ObjectWrapperTrapHandler {
  protected metadata: ComponentMetadata;
  protected reservedJSFunctions: Set<string> = new Set([
    'constructor',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toSource',
    'toLocaleString',
    'toString',
    'unwatch',
    'valueOf',
    '__noSuchMethod__',
    '__proto__',
    'watch',
    'Symbol(Symbol.hasInstance)',
  ]);

  constructor(metadata: ComponentMetadata) {
    this.metadata = metadata;
  }

  public set(target: any, name: string, value: any): boolean {
    const method: string = 'ObjectWrapperTrapHandler.set';
    debug(method + ' [Enter]', name.toString(), value);
    target[name] = value;
    debug(method + ' [Exit]', name.toString());
    return true;
  }

  public getPrototypeOf(target: any): any {
    const method: string = 'ObjectWrapperTrapHandler.getPrototypeOf';
    debug(method + ' [Enter]', target);
    const proto: any = Reflect.getPrototypeOf(target);
    debug(method + ' [Exit]', proto);
    return proto;
  }

  public get(target: any, name: string): any {
    const method: string = 'ObjectWrapperTrapHandler.get';
    debug(method + ' [Enter]', name, target);

    if (isComponentManagedProp === name.toString()) {
      debug(method + ' [Exit]', name.toString(), true);
      return true;
    }

    if ('function' !== typeof target[name]) {
      debug(method + ' [Exit]', name.toString());
      return target[name];
    }

    // all of properties defined in Object class will not wrap,
    // e.g: instanceof operation depends on the constructor
    // we need to unwrap constructor
    if (this.reservedJSFunctions.has(name.toString())) {
      debug(method + ' [Exit](without wrapper as JS reserved functions)', name.toString());
      return target[name];
    }

    if (target[name][isComponentManagedProp]) {
      debug(method + ' [Exit](already wrapped method, no need duplicated wrapper)', name.toString());
      return target[name];
    }

    const omd: OperationMetadata = target[name][OPERATION_METADATA_SLOT];

    if (!omd) {
      debug(method + ' [Exit](not a QoS concerned method)', name.toString());
      return target[name];
    }

    if (!omd.hasQoS()) {
      debug(method + ' Warning: NO QoS bound', name.toString());
    }

    omd.__target_fn__ = target[name];
    omd.__operationName__ = name.toString();

    if (omd.interactionStyle === undefined) {
      omd.interactionStyle = InteractionStyleType.SYNC;
    }
    omd.__target_class__ = this.metadata.__target_class__;
    omd.__className__ = this.metadata.__className__;

    debug(method + ' method level metadata:', omd);

    const wrappedMethod: AnyFn = new Proxy(target[name], new MethodWrapperTrapHandler(omd, target, target[name]));

    // note: we need replace the original function
    // otherwise, <obj>.<fn> !== this.<fn>
    target[name] = wrappedMethod;

    debug(method + ' [Exit](wrapped)', name.toString());
    return wrappedMethod;
  }
}

/**
 * The class(function) wrapper proxy trap handler
 * In JS class(constructor) actually is function, function is one kind of
 * object, the ClassWrapperTrapHandler extends from ObjectWrapper, in this way
 * all of the method defined as property of Class(a,k.a static method) can be wrapped
 * up and do the Proxy-AOP around aspect
 *
 */
class ClassWrapperTrapHandler extends ObjectWrapperTrapHandler {
  constructor(metadata: ComponentMetadata) {
    super(metadata);
  }

  /**
   * Extends get method from ObjectWrapperTrapHandler to enable
   * static method wrapper
   *
   */
  public get(target: any, name: string): any {
    const method: string = 'ClassWrapperTrapHandler.get';
    debug(method + ' [Enter]', target, name);
    const reval: any = super.get(target, name);
    debug(method + ' [Exit]');
    return reval;
  }

  public construct(target: any, args: any[]): any {
    const method: string = 'ClassWrapperTrapHandler.construct';
    debug(method + ' [Enter]', target, args);
    const targetInst: any = Reflect.construct(target, args);
    const wrappedInst: any = new Proxy(targetInst, new ObjectWrapperTrapHandler(this.metadata));
    debug(method + ' [Exit]', wrappedInst);
    return wrappedInst;
  }
}

/**
 * Export class for Wrapper
 */
export class Wrapper {
  public static wrap(clz: AnyFn, options: any): AnyFn {
    const method: string = 'Wrapper.wrap';
    debug(method + ' [Enter]', clz, options);

    if (clz[isComponentManagedProp]) {
      debug(method + ' [Exit](alread wrapped class)', clz, options);
      return clz;
    }

    let metadata: ComponentMetadata = options && options.metadata ? options.metadata : null;
    if (!metadata) {
      debug(method + ' Read metadata from class level proxify metadata hodler:', clz[COMPONENT_METADATA_SLOT]);
      metadata = clz[COMPONENT_METADATA_SLOT];
    }
    const clzWrapperTrapHandler: ClassWrapperTrapHandler = new ClassWrapperTrapHandler(metadata);
    const wrappedClz: any = new Proxy(clz, clzWrapperTrapHandler);
    debug(method + ' [Exit]');
    return wrappedClz;
  }
}
