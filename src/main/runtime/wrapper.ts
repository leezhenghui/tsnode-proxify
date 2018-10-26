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

import * as Debug                                              from 'debug';
import { InteractionStyleType, isComponentManagedProp, isCallbackWrappedProp }        from '../metadata/common';
import { ComponentMetadata, COMPONENT_METADATA_SLOT }          from '../metadata/component';
import { OperationMetadata, OPERATION_METADATA_SLOT }          from '../metadata/operation';
import { CallbackMetadata, CALLBACK_METADATA_SLOT }            from '../metadata/callback';
import { InvocationContext, EndpointInvoker, Fault }                  from './invocation';

const debug:Debug.IDebugger = Debug('proxify:runtime:wrapper');

const CALLBACK_ENDPOINT_INVOKER_PROP = '__callback_endpoint_invoker__';
const CALLBACK_INVOCATION_CONTEXT_PROP = '__callback_invocation_context__';

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

	constructor(metadata: CallbackMetadata, endpointInvoker: EndpointInvoker, context: InvocationContext) {
		this.metadata = metadata;
		this.invoker = endpointInvoker;
		this.iCtx = context;
	}

	public get(target: any, name: string): any {
		let method: string = 'CallbackMethodWrapperTrapHandler.get';
		debug(method + ' [Enter]', target, name);
		if (isCallbackWrappedProp === name) {
			debug(method + ' [Exit]', true);
			return true; 
		}
		debug(method + ' [Exit]', target[name]);
		return target[name];
	}

	public set(target: any, name: string, value: any): any{
		if (CALLBACK_INVOCATION_CONTEXT_PROP === name) {
			this.iCtx = value;
			return;
		}

		if (CALLBACK_ENDPOINT_INVOKER_PROP === name) {
			this.invoker = value;
			return;
		}

		target[name] = value;
	}
	
	apply(operation: Function, context: any, args: any[]): any {
		const self: CallbackMethodWrapperTrapHandler = this;
		let method: string = 'CallbackMethodWrapperTrapHandler.apply';

		try {
			debug(method + ' [Enter]', operation.name, args, this.metadata);
			let fault: Fault = null;
			if (self.metadata) {
				let i: number = 0;
				for (i =0; i < args.length; i++) {
					if (self.metadata.isFaultParam(i) && args[i] !== null && args[i] !== undefined) {
						fault = new Fault(null, null, null, args[i]);
						fault.isBizFault = true;
						break;
					}	
				}
			} 

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
				self.iCtx.__interaction__.__isCallbackStyle__ = true;
			} else {
				debug(method + ' skip proxify handling');
			}

			let reval = Reflect.apply(operation, context, args);
			this.invoker = null;
			this.iCtx = null;
			debug(method + ' [Exit]', reval);
			return reval;

		} catch(err) {
			console.error('Error: ' + method, err);
			throw err;
		}
	}	
}

/**
 * Method Proxy wrapper trap handler
 */
class MethodWrapperTrapHandler {

	constructor(metadata: OperationMetadata, targetObject: any) {
		this.metadata = metadata;
		this.targetObject = targetObject;
	}
	private metadata: OperationMetadata;
	private targetObject: any;

	public get(target: any, name: string): any {
		let method: string = 'MethodWrapperTrapHandler.get';
		debug(method + ' [Enter]', target, name);
		if (isComponentManagedProp === name) {
			debug(method + ' [Exit]', true);
			return true; 
		}
		debug(method + ' [Exit]', target[name]);
		return target[name];
	}

	apply(operation: Function, context: any, args: any[]): any {
		let method: string = 'MethodWrapperTrapHandler.apply';
		debug(method + ' [Enter]', operation.name, args, this.metadata);

		try {
			let invoker: EndpointInvoker = new EndpointInvoker(this.metadata, operation);
			let iCtx: InvocationContext  = new InvocationContext();
			iCtx.input = args;
			iCtx.targetObj = this.targetObject;

			// wrapper callback method, if the callback parameter is represented 
			// in args list
			let cbParamPos = this.metadata.__completion_fn_param_position__;
			if (cbParamPos !== undefined && cbParamPos !== null) {
				if (args[cbParamPos] && 'function' === typeof args[cbParamPos]) {

					debug(method + ' wrapper callback method', args[cbParamPos]);
					let origCB = args[cbParamPos];

					let proxiedCB = origCB; 
					if (origCB[isCallbackWrappedProp]) {
						origCB[CALLBACK_ENDPOINT_INVOKER_PROP] = invoker;
						origCB[CALLBACK_INVOCATION_CONTEXT_PROP] = iCtx;
					} else {
						proxiedCB =  new Proxy(origCB, new CallbackMethodWrapperTrapHandler(origCB[CALLBACK_METADATA_SLOT], invoker, iCtx));
					}
					// console.log(method, 'callback_metadata: ', origCB[CALLBACK_METADATA_SLOT]);
					args[cbParamPos] = proxiedCB;
				}
			} 

			// let reval = Reflect.apply(operation, this.targetObject, args);
			let reval = invoker.invoke(iCtx);
			debug(method + ' [Exit]', reval);
			// console.log('>>>> [post-invoke]: ', reval);
			return reval;
		} catch(err) {
			console.error('Error: ' + method, err);
			throw err;
		}
	}	
}

/**
 * The object instance proxy wrapper trap handler
 *
 */
class ObjectWrapperTrapHandler {
	constructor(metadata: ComponentMetadata) {
		this.metadata = metadata;
	}

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
																										'Symbol(Symbol.hasInstance)'
																									 ]); 

	public set(target: any, name:string, value: any): boolean {
		let method: string = 'ObjectWrapperTrapHandler.set';
		debug(method + ' [Enter]',  name.toString(), value);
		target[name] = value;
		debug(method + ' [Exit]', name.toString());
		return true;
	}
	
	public getPrototypeOf(target: any): any {
		let method: string = 'ObjectWrapperTrapHandler.getPrototypeOf';
		debug(method + ' [Enter]',  target);
		let proto: any = Reflect.getPrototypeOf(target);
		debug(method + ' [Exit]',  proto);
		return proto; 
	}
	
	public get(target: any, name: string): any {
		let method: string = 'ObjectWrapperTrapHandler.get';
		debug(method + ' [Enter]', name.toString(), target);
		
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
		if ( this.reservedJSFunctions.has(name.toString())) {
			debug(method + ' [Exit](without wrapper as JS reserved functions)', name.toString());
			return target[name];
		}

		if (target[name][isComponentManagedProp]) {
			debug(method + ' [Exit](already wrapped method, no need duplicated wrapper)', name.toString());
			return target[name];
		}

		let omd: OperationMetadata = target[name][OPERATION_METADATA_SLOT];

		if (! omd ) {
			debug(method + ' [Exit](not a QoS concerned method)', name.toString());
			return target[name];
		}

		if (! omd.hasQoS()) {
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

		let wrappedMethod: Function = new Proxy(target[name], new MethodWrapperTrapHandler(omd, target));
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
		 let method: string = 'ClassWrapperTrapHandler.get';
		 debug(method + ' [Enter]', target, name);
		 let reval: any = super.get(target, name);
		 debug(method + ' [Exit]');
		 return reval;
	 }

	 public construct(target: any, args: any[]): any {
		 let method: string = 'ClassWrapperTrapHandler.construct';
		 debug(method + ' [Enter]', target, args);
		 let targetInst: any = Reflect.construct(target, args);
		 let wrappedInst: any = new Proxy(targetInst, new ObjectWrapperTrapHandler(this.metadata));
		 debug(method + ' [Exit]', wrappedInst);
		 return wrappedInst;
	 }
}

/**
 * Export class for Wrapper
 */
export class Wrapper {

	static wrap(clz: Function, options: any): Function {
		let method: string = 'Wrapper.wrap';
		debug(method + ' [Enter]', clz, options);

		if (clz[isComponentManagedProp]) {
			debug(method + ' [Exit](alread wrapped class)', clz, options);
	    return clz;	
		}

		let metadata:ComponentMetadata = (options && options.metadata) ? options.metadata : null;
		if (! metadata) {
			debug(method + ' Read metadata from class level proxify metadata hodler:', clz[COMPONENT_METADATA_SLOT]);
	    metadata = clz[COMPONENT_METADATA_SLOT];	
		}
		let clzWrapperTrapHandler: ClassWrapperTrapHandler = new ClassWrapperTrapHandler(metadata);	
		let wrappedClz: any = new Proxy(clz, clzWrapperTrapHandler);
		debug(method + ' [Exit]');
		return wrappedClz;
	}
}
