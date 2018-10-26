/**
 * 
 * @module Provides interceptor relevant metadata definitions
 *
 * @author leezhenghui@gmail.com 
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

