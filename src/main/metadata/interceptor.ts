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
 * @module Provides interceptor relevant metadata definitions
 *
 */

import * as Debug                 from 'debug';
import { InteractionStyleType }   from './common';

export const INTERCEPTOR_METADATA_SLOT: string = '__interceptor_metadata_slot__';

const debug:Debug.IDebugger = Debug('proxify:metadata:interceptor');

export class InterceptorMetadata {
   public __class__: Function;
	 public interactionStyle: InteractionStyleType;
}

