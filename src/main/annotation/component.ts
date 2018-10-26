/**
 * @module Provides the annoation of class component via ECMAScript 2016 decorator, which is aimed to  mark the class to be managed by node-proxify framework 
 *
 * @author leezhenghui@gmail.com 
 */

import * as Debug                                          from 'debug';
import { COMPONENT_METADATA_SLOT, ComponentMetadata }      from '../metadata/component';
import { isComponentManagedProp }                          from '../metadata/common';
import { Wrapper }                                         from '../runtime/wrapper';

const debug:Debug.IDebugger = Debug('proxify:annotation:component');

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
export function Component(config ?: {
	componentName: string,
}): Function {
	return function(clz: any) {
		const method: string = 'decorator.component';
		debug(method + '[Enter]', clz.name);

		if (clz[isComponentManagedProp]) {
			debug(method + '[Exit](ingored)', clz.name);
			return clz;
		}

		let md: ComponentMetadata = new ComponentMetadata();
		md.__className__ = clz.name;
		md.__target_class__ = clz;
		md.componentName= (config) ? config.componentName: null;
		clz[COMPONENT_METADATA_SLOT] = md;

		let clzWrapper: Function = Wrapper.wrap(clz, null);
		debug(method + '[Exit]', clz.name);
		return clzWrapper;
	}
}
