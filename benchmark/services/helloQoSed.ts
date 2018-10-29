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
	InvocationContext
}                      from '../../dist/index'; 

@Interceptor({
	"interactionStyle": InteractionStyleType.SYNC
})
class Logger extends AbstractInterceptor{
	private LOG_PREFIX: string = '[logger] ';

	constructor(config: any) {
		super(config);	
	}

	private getTargetFullName (context: InvocationContext): string {
		let targetFullName = context.__interaction__.omd.__className__ + 
			'.' + 
			context.__interaction__.omd.__operationName__;

		return targetFullName;
	}

	public init (context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + '<init> ');
		done();
	}

	public handleRequest(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + '<request> ' + 
			this.getTargetFullName(context) + '; [input]: "' + 
			context.input + '"; [timestamp]: ' + new Date().getTime());
		// console.log('callstack:', new Error());
		done();	
	}

	public handleResponse(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + '<response> ' + 
			this.getTargetFullName(context) + '; [output]: "' + context.output + 
			'"; [timestamp]: ' + new Date().getTime());
		// console.log('callstack:', new Error());
		done();	
	}

	public handleFault(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + '<fault> ' + 
			this.getTargetFullName(context) + '; [fault]: ' + context.fault + 
			'; [timestamp]: ' + new Date().getTime());
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
export class QoSedHello {

	constructor() {}

	@InteractionStyle(InteractionStyleType.SYNC)
	@QoS({interceptorType: Logger})
	greet(name: string): string {
		console.log('[QoSedHello.greet]    ==> I am saying hello to', name);
		return '[QoSed] Hello, ' + name;	
	}
}
