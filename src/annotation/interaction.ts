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
 * @module Provides the method level annotation of QoS via ECMAScript 2016 decorator,
 * which is aimed to enable an proxified method managed by node-proxify framework
 *
 */

import * as Debug from 'debug';
import { OPERATION_METADATA_SLOT, OperationMetadata } from '../metadata/operation';
import { InteractionStyleType } from '../metadata/common';
import { CALLBACK_METADATA_SLOT, CallbackMetadata } from '../metadata/callback';

const debug: Debug.IDebugger = Debug('proxify:annotation:interaction');

/**
 * @annotation for method level, InteractionStyle
 *
 * The annotation is used to mark the method to be sync or asyn interaction style
 *
 */
export function InteractionStyle(value: InteractionStyleType) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method: string = 'decorator.qos';

    let operation: Function = target[propertyKey];
    debug(method + ' [Enter]', operation.name);

    let omd: OperationMetadata = operation[OPERATION_METADATA_SLOT];
    if (!omd) {
      omd = new OperationMetadata();
    }

    omd.interactionStyle = value;
    operation[OPERATION_METADATA_SLOT] = omd;
    debug(method + ' [Exit]', operation.name, omd);
  };
}

/**
 * @annotation Completion
 *
 * Method parameter annotation, which used to mark the parameter as completion method
 *
 * Usage:
 *  greet(name: string, @Completion cb: Function)
 *
 */
export function Completion(target: any, propertyKey: string, parameterIndex: number) {
  const method: string = 'decorator.completion';

  let operation: Function = target[propertyKey];
  debug(method + ' [Enter]', operation.name);

  let omd: OperationMetadata = operation[OPERATION_METADATA_SLOT];
  if (!omd) {
    omd = new OperationMetadata();
  }

  omd.__completion_fn_param_position__ = parameterIndex;
  operation[OPERATION_METADATA_SLOT] = omd;
  debug(method + ' [Exit]', operation.name, omd);
}

/**
 * @annotation Callback
 *
 * Method parameter annotation, which used to mark the parameter as callback method
 *
 * Usage:
 * @Callback
 * cb_fn(@Fault error, @Output result)
 */

export function Callback(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const method: string = 'decorator.callback';

  let cbFn: Function = target[propertyKey];
  debug(method + ' [Enter]', cbFn.name);

  let cmd: CallbackMetadata = cbFn[CALLBACK_METADATA_SLOT];
  if (!cmd) {
    cmd = new CallbackMetadata();
  }

  cbFn[CALLBACK_METADATA_SLOT] = cmd;
  debug(method + ' [Exit]', cbFn.name, cmd);
}

export function Fault(target: any, propertyKey: string, parameterIndex: number) {
  const method: string = 'decorator.fault';

  let cbFn: Function = target[propertyKey];
  debug(method + ' [Enter]', cbFn.name);
  let cmd: CallbackMetadata = cbFn[CALLBACK_METADATA_SLOT];
  if (!cmd) {
    cmd = new CallbackMetadata();
  }
  cmd.addFaultParam(parameterIndex);
  cbFn[CALLBACK_METADATA_SLOT] = cmd;
  debug(method + ' [Exit]', cbFn.name, cmd);
}

export function Output(target: any, propertyKey: string, parameterIndex: number) {
  const method: string = 'decorator.output';

  let cbFn: Function = target[propertyKey];
  debug(method + ' [Enter]', cbFn.name);
  let cmd: CallbackMetadata = cbFn[CALLBACK_METADATA_SLOT];
  if (!cmd) {
    cmd = new CallbackMetadata();
  }
  cmd.addOutputParam(parameterIndex);
  cbFn[CALLBACK_METADATA_SLOT] = cmd;
  debug(method + ' [Exit]', cbFn.name, cmd);
}
