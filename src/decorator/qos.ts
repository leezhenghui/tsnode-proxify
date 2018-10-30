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
 * @module Provides the method level decorator of QoS via ECMAScript 2016 decorator,
 * which is aimed to enable an proxified method managed by node-proxify framework
 *
 */

import * as Debug from 'debug';
import { OPERATION_METADATA_SLOT, OperationMetadata } from '../metadata/operation';
import { AbstractInterceptor } from '../runtime/interceptor';
import { AnyFn } from '../util/types';

const debug: Debug.IDebugger = Debug('proxify:decorator:qos');

/**
 * @QoS, method level decorator
 * Mark the method as node-proxify managed with the metadata for the interceptors.
 *
 * Note: Seems tsc can not work properly on the class type, means it can not match a class
 * to AnyFn, so we need to use "any" here, even this is not suggested by tsline
 *
 */
export function QoS(config?: { interceptorType?: any; initParams?: any; singleton?: AbstractInterceptor }) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method: string = 'decorator.qos';

    const operation: AnyFn = target[propertyKey];
    debug(method + ' [Enter]', operation.name);

    let omd: OperationMetadata = operation[OPERATION_METADATA_SLOT];
    if (!omd) {
      omd = new OperationMetadata();
    }

    omd.__target_fn__ = omd.__target_fn__ || operation;
    omd.__operationName__ = omd.__operationName__ || propertyKey;
    if (config) {
			if (config.interceptorType &&  ! (typeof config.interceptorType === 'function')) {
		     throw Error('Invalid interceptorType: '+ config.interceptorType);	
			}
      omd.addQoS(config.interceptorType, config.initParams, config.singleton);
    }
    operation[OPERATION_METADATA_SLOT] = omd;
    debug(method + ' [Exit]', operation.name, omd);
  };
}
