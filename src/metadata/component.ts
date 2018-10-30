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

import * as Debug from 'debug';
import { AnyFn } from '../util/types';

const debug: Debug.IDebugger = Debug('proxify:metadata:component');

export const COMPONENT_METADATA_SLOT: string = '__component_metadata_slot__';

/**
 * Metadata provided by proxify class decorator
 */
export class ComponentMetadata {
  public __className__: string;
  public __target_class__: AnyFn;
  public componentName: string;
}
