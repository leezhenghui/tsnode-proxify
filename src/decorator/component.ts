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
 * @module Provides the decorator of class component via ECMAScript 2016 decorator,
 * which is aimed to  mark the class to be managed by node-proxify framework
 *
 */

import * as Debug from 'debug';
import { COMPONENT_METADATA_SLOT, ComponentMetadata } from '../metadata/component';
import { isComponentManagedProp } from '../metadata/common';
import { Wrapper } from '../runtime/wrapper';
import { AnyFn } from '../util/types';

const debug: Debug.IDebugger = Debug('proxify:decorator:component');

/**
 * @Component, class level decorator
 * Mark the class as node-proxify managed.
 *
 * config:
 *   {
 *     name: "MyComponent" // the QName of component
 *
 *   }
 *
 */
export function Component(config?: { componentName?: string }): AnyFn {
  return function(clz: any): AnyFn {
    const method: string = 'decorator.component';
    debug(method + '[Enter]', clz.name);

    if (clz[isComponentManagedProp]) {
      debug(method + '[Exit](ingored)', clz.name);
      return clz;
    }

    const md: ComponentMetadata = new ComponentMetadata();
    md.__className__ = clz.name;
    md.__target_class__ = clz;
    md.componentName = config && config.componentName ? config.componentName : clz.name;
    clz[COMPONENT_METADATA_SLOT] = md;

    const clzWrapper: AnyFn  = Wrapper.wrap(clz, null);
    debug(method + '[Exit]', clz.name);
    return clzWrapper;
  };
}
