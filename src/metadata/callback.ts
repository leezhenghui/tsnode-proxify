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
 * @module Provides proxify wrapper relevant metadata definitions
 *
 */

import * as Debug from 'debug';

const debug: Debug.IDebugger = Debug('proxify:metadata:callback');

export const CALLBACK_METADATA_SLOT: string = '__callback_metadata_slot__';

export class CallbackMetadata {
  public __target_fn__: Function;
  public __operationName__: string;

  private __fault_param_positions__: Set<number> = new Set<number>();
  private __output_param_positions__: Set<number> = new Set<number>();

  public addFaultParam(position: number): void {
    this.__fault_param_positions__.add(position);
  }

  public isFaultParam(position: number): boolean {
    return this.__fault_param_positions__.has(position);
  }

  public sizeOfFaultParams(): number {
    return this.__fault_param_positions__.size;
  }

  public addOutputParam(position: number): void {
    this.__output_param_positions__.add(position);
  }

  public isOutputParam(position: number): boolean {
    return this.__output_param_positions__.has(position);
  }

  public sizeOfOutputParams(): number {
    return this.__output_param_positions__.size;
  }
}
