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
 * @module Interceptor decorator for class,
 * ES7 decorator hanlder will pick up the interceptor with the metadata, and register it to interceptor registry
 *
 */

import * as Debug from 'debug';
import { interceptorRegistry } from '../runtime/interceptor';
import { InterceptorMetadata, INTERCEPTOR_METADATA_SLOT } from '../metadata/interceptor';
import { InteractionStyleType } from '../metadata/common';
import { AnyFn } from '../util/types';

const debug: Debug.IDebugger = Debug('proxify:decorator:interceptor');

/**
 * Interceptor decorator class
 * The decorator is used to mark the class to be interceptor, and providing the runtime metadata :
 *   interactionStyle: InteractionStyle.ASYNC | InteractionStyle.SYNC
 *
 * The decorator interceptor will be registered into interceptor registry
 *
 */
export function Interceptor(decorator?: { interactionStyle: InteractionStyleType }): AnyFn {
  return function(clz: any): AnyFn {
    const method: string = 'decorate.interceptor';
    debug(method + ' [Enter]', clz.name);
    if (clz[INTERCEPTOR_METADATA_SLOT]) {
      debug(method + ' [Exit](already registered)', clz.name);
      return clz;
    }

    const metadata: InterceptorMetadata = new InterceptorMetadata();
    metadata.__class__ = clz;
    metadata.interactionStyle = decorator.interactionStyle;

    // register interceptor
    interceptorRegistry.register(metadata);
    clz[INTERCEPTOR_METADATA_SLOT] = metadata;
    debug(method + ' [Exit]', clz.name, metadata);
    return clz;
  };
}
