import {
  Interceptor,
  InteractionStyleType,
  AbstractInterceptor,
  InvocationContext,
  doneFn,
  canProcessCallbackFn,
} from '../../../dist/index';

@Interceptor({
  interactionStyle: InteractionStyleType.SYNC,
})
export class Logger extends AbstractInterceptor {
  private LOG_PREFIX: string = '[logger] ';

  constructor(config: any) {
    super(config);
  }

  private getTargetFullName(context: InvocationContext): string {
    let targetFullName = context.getClassName() + '.' + context.getOperationName();

    return targetFullName;
  }

  public init(context: InvocationContext, done: doneFn): void {
    console.log(this.LOG_PREFIX + '<init> ');
    done();
  }

  public handleRequest(context: InvocationContext, done: doneFn): void {
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

  public handleResponse(context: InvocationContext, done: doneFn): void {
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

  public handleFault(context: InvocationContext, done: doneFn): void {
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

  public canProcess(context: InvocationContext, callback: canProcessCallbackFn): void {
    callback(null, true);
  }

  public getName(): string {
    return 'Logger';
  }
}
