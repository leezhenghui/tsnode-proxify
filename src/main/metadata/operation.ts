/**
 * 
 * @module Provides component relevant metadata definitions
 *
 * @author leezhenghui@gmail.com 
 *
 */

import * as Debug                    from 'debug';
import { InteractionStyleType }      from './common';
import { Interceptor }               from '../runtime/interceptor';

const debug:Debug.IDebugger = Debug('proxify:metadata:qos');

export const OPERATION_METADATA_SLOT: string  = '__operation_metadata_slot__';

export class InterceptorFactory {
	private clz: Function;
	private args: any[];
	private instance: Interceptor;

	constructor(clz: Function, args: any, singleton: Interceptor) {
		this.clz= clz;
		this.args= args || [];

		if (! Array.isArray(this.args)) {
			this.args = [this.args];
		}
		this.instance = singleton;
	}

	public create(): Interceptor {
		const method: string = 'create';
		const self: InterceptorFactory = this;
    if (self.instance) {
			debug(method, ' return the singleton interceptor: ', self.instance.getName());
	    return self.instance;	
		}	

		let interceptor: Interceptor;
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

	public addQoS(interceptorType: Function, params: any, singleton: Interceptor) {
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

