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

import {
  Interceptor,
  Component,
  QoS,
  InteractionStyle,
  Completion,
  Callback,
  Fault,
  Output,
  InteractionStyleType,
  AbstractInterceptor,
  InvocationContext,
} from '../dist/index';

@Interceptor({
  interactionStyle: InteractionStyleType.SYNC,
})
class Logger extends AbstractInterceptor {
  private LOG_PREFIX: string = '[logger] ';

  constructor(config: any) {
    super(config);
  }

  private getTargetFullName(context: InvocationContext): string {
    let targetFullName =
      context.__interaction__.omd.__className__ + '.' + context.__interaction__.omd.__operationName__;

    return targetFullName;
  }

  public init(context: InvocationContext, done: Function): void {
    console.log(this.LOG_PREFIX + '<init> ');
    done();
  }

  public handleRequest(context: InvocationContext, done: Function): void {
    console.log(
      this.LOG_PREFIX +
        '<request> ' +
        this.getTargetFullName(context) +
        '; [input]: "' +
        context.input +
        '"; [timestamp]: ' +
        new Date().getTime(),
    );
    // console.log('callstack:', new Error());
    done();
  }

  public handleResponse(context: InvocationContext, done: Function): void {
    console.log(
      this.LOG_PREFIX +
        '<response> ' +
        this.getTargetFullName(context) +
        '; [output]: "' +
        context.output +
        '"; [timestamp]: ' +
        new Date().getTime(),
    );
    // console.log('callstack:', new Error());
    done();
  }

  public handleFault(context: InvocationContext, done: Function): void {
    console.log(
      this.LOG_PREFIX +
        '<fault> ' +
        this.getTargetFullName(context) +
        '; [fault]: ' +
        context.fault +
        '; [timestamp]: ' +
        new Date().getTime(),
    );
    done();
  }

  public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
    callback(null, true);
  }

  public getName(): string {
    return 'Logger';
  }
}

@Component()
class Hello {
  constructor() {}

  @InteractionStyle(InteractionStyleType.SYNC)
  @QoS({ interceptorType: Logger })
  greet(name: string): string {
    console.log('[greet]    ==> I am saying hello to', name);
    // console.log('[greet]    callstack:', new Error());
    return 'Hello, ' + name;
  }
}

//=====================
//    main
//====================

let hello: Hello = new Hello();
console.log('[result]: "' + hello.greet('World') + '"');
