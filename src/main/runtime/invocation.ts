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

import * as Debug                                                                                  from 'debug';
import * as Q                                                                                      from 'q';
import { InteractionStyleType }                                                                    from '../metadata/common';
import { OperationMetadata, InterceptorFactory }                                                   from '../metadata/operation';

const debug:Debug.IDebugger = Debug('proxify:runtime:invocation');

export enum InteractionType {
	INTERACTION_LOCATE = 0,
	INTERACTION_LOCATE_RESULT = 1,
  INTERACTION_INVOKE = 2,
	INTERACTION_INVOKE_RESULT = 4,
	INTERACTION_INVOKE_FAULT = 8,
}

export class Interaction {
  public interactionType: InteractionType; 
	public omd: OperationMetadata;
	public _isTargetInvoked: boolean = false;
	public __hold_on_nexter__: (error: any, status: ProcessStatus) => void;
}

/**
 * Base Fault class
 */
export class Fault {
	constructor(thrownBy: string, errorCode: string, reason: string, details: any) {
		this.thrownBy = thrownBy;
		this.errorCode = errorCode;
		this.reason = reason;
		this.details = details;
	}

	public errorCode: string;
	public reason: string;
	public details: any;
	public thrownBy: string;
	public isBizFault: boolean = false;
}

export class InvocationContext {

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
	 public __interaction__: Interaction;

	 /**
		* Session contains all of data for 
		* current invocation, including domain/tenant
		* info
		*/
	 public slots: Map<string, any>;

	public _isCallbackSupported(): boolean {
		if (this.__interaction__.omd.__completion_fn_param_position__ === undefined) {
	    return false;	
		}
	
		if (! this.input || this.input.length === 0) {
	    return false;	
		}

		if (! this.input[this.__interaction__.omd.__completion_fn_param_position__]) {
	    return false;	
		}

		return true;
	}

	public _isPromiseReturned(): boolean {
		const self: InvocationContext = this;
		if (self.__interaction__.interactionType !== InteractionType.INTERACTION_INVOKE_RESULT &&
			  self.__interaction__.interactionType !== InteractionType.INTERACTION_INVOKE_FAULT) {
			throw new Fault('node.proxify.runtime', 'E_INTERCEPTOR_0091', 'Call in wrong context phases', null);
		}

		if (! self.output) {
	    return false;	
		}
		return Q.isPromise(self.output);
	}

	public _targetInvoked(): void {
		this.__interaction__._isTargetInvoked = true;
	}

	public _isTargetInvoked(): boolean {
    return this.__interaction__._isTargetInvoked;	
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
	constructor() {
    this.__frozen = false;
    this.__next = null;
    this.__previous = null;
	}

	public abstract canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void;
	public abstract getName(): string;

	private __next: Processor;
	private __previous: Processor;
	private __frozen: boolean;

  /**
	 * Not like protected modifier in java, typescript does not have the accessiable control for 
	 * same "package"(a.k.a namespace), so we need to to use public modfier in this case, but actually,
	 * we want this method only be accessed within same module/namespace, so make the method start with "_"
	 * to indicate this intention
	 * Sugguested usage is only be accessed in same module, e.g: BaseInterceptor
	 */
	public abstract _process(context: InvocationContext, next: (error: any, status: ProcessStatus) => void): void;

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
	public _getNext(): Processor{
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
	public _getPrevious(): Processor{
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
class HeaderProcessor extends Processor {
	private omd: OperationMetadata;
	public constructor(omd: OperationMetadata) {
    super();	
		this.omd = omd;
	}

	public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
		callback(null, true);
	}

	public getName(): string {
    return 'system:internal:header';	
	}

	public _process(context: InvocationContext, next: (error: any, status: ProcessStatus) => void): void {
		let self: Processor = this;
		let method: string = self.getName() + '._process';

		if (! context.__interaction__) {
			context.__interaction__ = new Interaction();
			context.__interaction__.omd = this.omd;
			context.__interaction__.interactionType = InteractionType.INTERACTION_LOCATE;
		}

		debug(method, '[header]', context.__interaction__.interactionType);
		// console.log('==>[header]: processing ' + context.__interaction__.interactionType);

		self.canProcess(context, function(error: any, canProcess: boolean) {
			let interactionType: InteractionType = context.__interaction__.interactionType;
			switch(interactionType) {
				case InteractionType.INTERACTION_LOCATE:
				case InteractionType.INTERACTION_INVOKE:
					return self._getNext()._process(context, function(error: any, status: ProcessStatus) {
						next(error, status);
					}.bind(self));
				case InteractionType.INTERACTION_LOCATE_RESULT:
					context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE;
					return self._process(context, function(error: any, status: ProcessStatus) {
						next(error, status);
					}.bind(self));
				case InteractionType.INTERACTION_INVOKE_RESULT:
				case InteractionType.INTERACTION_INVOKE_FAULT:
					return next(null, new ProcessStatus(interactionType, 'done'));
				default:
					throw new Error('Unsupported interaction type: ' + interactionType);
			}
		}.bind(self));
	}
}

/**
 * Predefined built-in interceptor, which is the last interceptor in 
 * invocation chain. 
 *   In REQUEST interaction type, it will call to invoker.
 *   In LOCATE interaction type, it will change the type to LOCATE_RESULT 
 */
class TailProcessor extends Processor {
	private targetFn: Function;
	public constructor(targetFn: Function) {
    super();	
		this.targetFn = targetFn;
	}
	
	public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
		callback(null, true);
	}
	
	public getName(): string {
    return 'system:internal:tail';	
	}

	private invoke(thisArg: any, args: any[]): any {
		const self: TailProcessor = this;
		let reval = Reflect.apply(self.targetFn, thisArg, args); 	
		return reval;
	}

	public _process(context: InvocationContext, next: (error: any, status: ProcessStatus) => void): void {
		let self: TailProcessor = this;
		let method: string = self.getName() + '._process';
		// console.log('==>[tail]: processing ' + context.__interaction__.interactionType);
		debug(method, '[tail]', context.__interaction__.interactionType);

		self.canProcess(context, function(error: any, canProcess: boolean) {
			let interactionType: InteractionType = context.__interaction__.interactionType;
			switch(interactionType) {
				case InteractionType.INTERACTION_LOCATE:
					context.__interaction__.interactionType = InteractionType.INTERACTION_LOCATE_RESULT;
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
						context.__interaction__.__hold_on_nexter__ = next;
						let reval = self.invoke(context.targetObj, context.input);
						context.output = reval;

						// sync callback mode
						if (context.__interaction__.interactionType === InteractionType.INTERACTION_INVOKE_RESULT ||
						    context.__interaction__.interactionType === InteractionType.INTERACTION_INVOKE_FAULT) {
							console.log('==>[tail]: sync callback mode');
							debug(method, '[tail] sync callback mode');
							return;
						}
						
						// async promise mode
						if (Q.isPromise(reval)) {
							console.log('==>[tail]: async promise mode');
							debug(method, '[tail] async promise mode');
							let realResult: any = null;
							let realError: any = null; 
							context.output = Q(reval).then(function(result: any) {
								context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_RESULT;
								realResult = result;
								let deferred: Q.Deferred<any> = Q.defer<any>();
								self._process(context, function(error: any, status: ProcessStatus) {
									deferred.resolve();
							    return next(error, status);
								}.bind(self));
								return deferred.promise;
							}.bind(self), function(error: any) {
								realError = error;
								context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_FAULT;
								let deferred: Q.Deferred<any> = Q.defer<any>();
								self._process(context, function(error: any, status: ProcessStatus) {
									deferred.resolve();
							    return next(error, status);
								}.bind(self));
								return deferred.promise;
							}.bind(self)).then(function(processStatus) {
								if (realError) {
									return Q.reject(realError);
								} 
								return Q(realResult);	
							}.bind(self));
							return;
						}
						
						// async callback mode
						if (context._isCallbackSupported()) {
							debug(method, '[tail] async callback mode');
							console.log('==>[tail]: async callback mode');
							return;
						}

						// sync without callback
						console.log('==>[tail]: sync w/o callback mode');
						debug(method, '[tail] sync directly return value mode');
						context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_RESULT;
						self._process(context, function(error: any, status: ProcessStatus) {
							return next(error, status);
						}.bind(self));
						return;
					} catch(error) {
						//TODO, fault handling
						let fault: Fault = new Fault(self.getName(), null, null, null);
						fault.errorCode = error.errorCode;
						fault.reason = error.message || error.reason;
						fault.details = error;
						fault.isBizFault = true;
						context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_FAULT;
						self._process(context, function(error: any, status: ProcessStatus) {
							return next(error, status);
						}.bind(self));
					} // try/catch
				default:
					throw new Error('Invalid interaction type: ' + interactionType);
			} // switch
		}.bind(self));
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
	private targetFn: Function;
	private header: HeaderProcessor;
	private tail: TailProcessor;
	private isInited: boolean = false;

	public constructor(omd: OperationMetadata, targetFn: Function) {
		this.omd = omd;
		this.targetFn = targetFn;

		this.header = new HeaderProcessor(omd);
		this.tail = new TailProcessor(targetFn);

		this.header._setNext(this.tail);
		this.tail._setPrevious(this.header);
	}

	private init(): void {
		const self: EndpointInvoker = this; 
    let factories: InterceptorFactory[] = this.omd.getInterceptorFactories();

		factories.forEach(function(factory) {
			let p: Processor = factory.create();
			//TODO, do validation
			
			let previous: Processor = self.tail._getPrevious();
			p._setPrevious(previous);
			p._setNext(self.tail);
			previous._setNext(p);
			self.tail._setPrevious(p);
		});

		this.isInited = true;
	}

	public invoke(context: InvocationContext): any {
		const method: string = 'invoke';
		const self: EndpointInvoker = this;

		if (! self.isInited) {
	    self.init();	
		}

		let processStatus: ProcessStatus;
		let deferred: Q.Deferred<any> = Q.defer<any>();

		self.header._process(context, function(error: any, status: ProcessStatus) {
			processStatus = status;
			if (Q.isPromise(context.output)) {
		    return deferred.resolve(context.output);	
			}
			deferred.resolve();
		}.bind(self));

		// sync call with either return value or callback function specified
		if (processStatus &&  processStatus.interactionType === InteractionType.INTERACTION_INVOKE_RESULT) {
			console.log('==>[invoker] sync call');
			debug(method, 'sync call mode(either return value directly or callback)');
	    return context.output;	
		}
		
		// sync call with exception thrown
		if (processStatus &&  processStatus.interactionType === InteractionType.INTERACTION_INVOKE_FAULT) {
			console.log('==>[invoker] sync call with fault');
			debug(method, 'sync call mode with fault');
			throw context.fault.details;
		}

		// async call without callback specified, so it should be promise sytle return value
	 	if (! context._isCallbackSupported()) {
			console.log('==>[invoker] async call with promise');
			debug(method, 'async call mode with promise');
			return deferred.promise;
		}

		// async call with callback function specified.
		console.log('==>[invoker] async call with callback');
		debug(method, 'async call mode with callback');
		return context.output;
	}

	public invokeResultAsync(context: InvocationContext) {
		const self: EndpointInvoker = this;
		const method: string = 'invokeResultAsync';
		if (! self.isInited) {
	    self.init();	
		}

		debug(method, context);

		const holdOnNexter = context.__interaction__.__hold_on_nexter__;
		context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_RESULT;

		self.tail._process(context, function(error: any, status: ProcessStatus) {
			return holdOnNexter(error, status);
		}.bind(self));
	}

	public invokeFaultAsync(context: InvocationContext) {
		const method: string = 'invokeFaultAsync';
		const self: EndpointInvoker = this;
		if (! self.isInited) {
	    self.init();	
		}

		debug(method, context);

		const holdOnNexter = context.__interaction__.__hold_on_nexter__;
		context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_FAULT;

		self.tail._process(context, function(error: any, status: ProcessStatus) {
			return holdOnNexter(error, status);
		}.bind(self));
	}
}
