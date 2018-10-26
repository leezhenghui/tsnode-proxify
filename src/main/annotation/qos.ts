/**
 * @module Provides the method level annotation of QoS via ECMAScript 2016 decorator, which is aimed to enable an proxified method managed by node-proxify framework 
 *
 * @author leezhenghui@gmail.com 
 */

import * as Debug                                     from 'debug';
import { OPERATION_METADATA_SLOT, OperationMetadata } from '../metadata/operation'; 
import { Interceptor }                                from '../runtime/interceptor';

const debug:Debug.IDebugger = Debug('proxify:annotation:qos');

/**
 * @QoS, method level decorator
 * Mark the method as node-proxify managed with the metadata for the interceptors.
 *
 */
export function QoS(config ?: {
  interceptorType: Function,
	initParams: any,
	singleton: Interceptor
}) {

	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const method: string = 'decorator.qos';

		let operation: Function = target[propertyKey];
		debug(method + ' [Enter]', operation.name);

		let omd: OperationMetadata = operation[OPERATION_METADATA_SLOT];
		if (! omd) {
			omd = new OperationMetadata();
		}

		omd.__target_fn__ = omd.__target_fn__ || operation;
		omd.__operationName__ = omd.__operationName__ || propertyKey;
		if (config) {
			omd.addQoS(config.interceptorType, config.initParams, config.singleton);
		}
		operation[OPERATION_METADATA_SLOT] = omd;
		debug(method + ' [Exit]', operation.name, omd);
	}
}
