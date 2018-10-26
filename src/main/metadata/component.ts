/**
 * 
 * @module Provides component relevant metadata definitions
 *
 * @author leezhenghui@gmail.com 
 *
 */

import * as Debug from 'debug';

const debug:Debug.IDebugger = Debug('proxify:metadata:component');

export const COMPONENT_METADATA_SLOT: string  = '__component_metadata_slot__';

/**
 * Metadata provided by proxify class annoation
 */
export class ComponentMetadata {
	public __className__: string;
	public __target_class__: Function;
	public componentName: string;
}

