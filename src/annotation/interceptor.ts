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
 * @module Interceptor annotation for class, 
 * ES7 decorator hanlder will pick up the interceptor with the metadata, and register it to interceptor registry
 *
 */

import * as Debug                                                  from 'debug';
import { interceptorRegistry }                                     from '../runtime/interceptor';
import { InterceptorMetadata, INTERCEPTOR_METADATA_SLOT }          from '../metadata/interceptor';
import { InteractionStyleType }                                    from '../metadata/common';

const debug:Debug.IDebugger = Debug('proxify:annotation:interceptor');

/**
 * Interceptor annotation class
 * The annotation is used to mark the class to be interceptor, and providing the runtime metadata :
 *   interactionStyle: InteractionStyle.ASYNC | InteractionStyle.SYNC 
 *
 * The annotated interceptor will be registered into interceptor registry
 *
 */
export function Interceptor(annotation?: {
	interactionStyle: InteractionStyleType
}): Function {
	return function (clz: any) {
		let method: string = 'decorate.interceptor';
		debug(method + ' [Enter]', clz.name);
		if (clz[INTERCEPTOR_METADATA_SLOT]) {
			debug(method + ' [Exit](already registered)', clz.name);
			return clz;
		}

		let metadata: InterceptorMetadata = new InterceptorMetadata();
		metadata.__class__ = clz;
		metadata.interactionStyle = annotation.interactionStyle;

		// register interceptor 
		interceptorRegistry.register(metadata);
		clz[INTERCEPTOR_METADATA_SLOT] = metadata;
		debug(method + ' [Exit]', clz.name, metadata);
		return clz;
	};
}
