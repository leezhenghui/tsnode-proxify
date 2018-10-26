/**
 * 
 * @module Provides proxify wrapper relevant metadata definitions
 *
 * @author leezhenghui@gmail.com 
 *
 */

import * as Debug                from 'debug';

const debug:Debug.IDebugger = Debug('proxify:metadata:common');

export enum InteractionStyleType {
	ASYNC = 0,
	SYNC = 1
}

export const isComponentManagedProp: string = '__is_component_managed__'; 

export const isCallbackWrappedProp: string = '__is_callback_wrapped__'; 
