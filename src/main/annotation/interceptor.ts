/**
 * @module Interceptor annotation for class, ES7 decorator hanlder will pick up the interceptor with the metadata, and register it to interceptor registry
 *
 * @author leezhenghui@gmail.com 
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
