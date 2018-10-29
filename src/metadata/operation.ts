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
 * @module Provides component relevant metadata definitions
 *
 */

import * as Debug                    from 'debug';
import { InteractionStyleType }      from './common';
import { AbstractInterceptor }       from '../runtime/interceptor';

const debug:Debug.IDebugger = Debug('proxify:metadata:qos');

export const OPERATION_METADATA_SLOT: string  = '__operation_metadata_slot__';

export class InterceptorFactory {
	private clz: Function;
	private args: any[];
	private instance: AbstractInterceptor;

	constructor(clz: Function, args: any, singleton: AbstractInterceptor) {
		this.clz= clz;
		this.args= args || [];

		if (! Array.isArray(this.args)) {
			this.args = [this.args];
		}
		this.instance = singleton;
	}

	public create(): AbstractInterceptor {
		const method: string = 'create';
		const self: InterceptorFactory = this;
    if (self.instance) {
			debug(method, ' return the singleton interceptor: ', self.instance.getName());
	    return self.instance;	
		}	

		let interceptor: AbstractInterceptor;
		interceptor = Reflect.construct(self.clz, self.args);
		debug(method, ' Create interceptor instance: ', interceptor.getName());
		return interceptor;
	}
}

/**
 * Metadata provided by proxify method annoation
 */
export class OperationMetadata{
	public __className__: string;
	public __target_class__: Function;

	public __operationName__: string;
	public __target_fn__: Function;
	public interactionStyle: InteractionStyleType;
	private __factories__: InterceptorFactory[] = new Array();
	public __completion_fn_param_position__: number;

	public addQoS(interceptorType: Function, params: any, singleton: AbstractInterceptor) {
		let factory: InterceptorFactory = new InterceptorFactory(interceptorType, params, singleton);
		this.__factories__.push(factory);
	}

	public hasQoS(): boolean {
    if ( 0 === this.__factories__.length) {
			return false;
		}	
		return true;
	}

	public sizeOfQoS(): number {
		return this.__factories__.length;
	}

	public getInterceptorFactories(): InterceptorFactory[] {
    return this.__factories__;	
	}
}

