import {
  Component,
  QoS,
  InteractionStyle,
  Completion,
  Callback,
  Fault,
  Output,
  InteractionStyleType,
} from '../../dist/index';
import { Logger } from './qos/logger';
import * as Q from 'q';

@Component()
export class QoSedHello {
  constructor() {}

  @InteractionStyle(InteractionStyleType.SYNC)
  @QoS({ interceptorType: Logger })
  greet(name: string): string {
    console.log('[QoSedHello.greet]    ==> I am saying hello to', name);
    return '[QoSed] Hello, ' + name;
  }

  @InteractionStyle(InteractionStyleType.SYNC)
  @QoS({ interceptorType: Logger })
  greetCallback(name: string, @Completion cb: (error: Error, message: string) => void): void {
    console.log('[QoSedHello.greetCallback]    ==> I am saying hello to', name);
    let reval: string = 'Hello, ' + name;
    cb(null, reval);
  }

  @InteractionStyle(InteractionStyleType.ASYNC)
  @QoS({ interceptorType: Logger })
  greetAsyncPromise(name: string): Q.Promise<string> {
    const self: QoSedHello = this;
    console.log('[QoSedHello.greetAsyncPromise]    ==> I am saying hello to', name);
    return Q()
      .then(function() {
        let reval: string = 'Hello, ' + name;
        return reval;
      })
      .fail(function(err) {
        console.error('Error in greetAsyncPromise()', err);
        throw err;
      });
  }

  @InteractionStyle(InteractionStyleType.ASYNC)
  @QoS({ interceptorType: Logger })
  greetAsyncCallback(name: string, cb: (error: Error, message: string) => void): void {
    const self: QoSedHello = this;
    console.log('[QoSedHello.greetAsyncCallback]    ==> I am saying hello to', name);
    Q()
      .then(function() {
        let reval: string = 'Hello, ' + name;
        return reval;
      })
      .nodeify(cb);
  }
}
