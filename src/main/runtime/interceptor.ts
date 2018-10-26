/**
 * 
 * @module Provides interceptor framework
 *
 * @author leezhenghui@gmail.com 
 *
 */

import * as Debug                       from 'debug';
import * as Q                           from 'q';
import { InteractionStyleType }         from '../metadata/common';
import { InterceptorMetadata }          from '../metadata/interceptor';
import { OperationMetadata }            from '../metadata/operation';
import { InteractionType, Interaction, Fault, InvocationContext, Processor, ProcessStatus}                       from '../runtime/invocation';

const debug:Debug.IDebugger = Debug('proxify:runtime:interceptor');

export abstract class Interceptor extends Processor {
	constructor(config: any) {
    super();	
	}
	
	public abstract canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void;
	
  public init (context: InvocationContext, done: Function): void {
  	done();
  }

	public handleRequest(context: InvocationContext, done: Function): void {
    done();	
	}

	public handleResponse(context: InvocationContext, done: Function): void {
    done();	
	}

	public handleFault(context: InvocationContext, done: Function): void {
    done();	
	}

	private switchToFaultFlow(error: any, context: InvocationContext, next: (error: any, status: ProcessStatus) => void ): void{
		const self: Interceptor = this;
		let fault: Fault;
		if ( error instanceof Fault ) {
			fault = error;
		} else {
			fault = new Fault(self.getName(), null, null, null); 
			fault.errorCode = error.errorCode;
			fault.reason = error.message || error.reason;
			fault.details = error;
		}
		context.__interaction__.interactionType = InteractionType.INTERACTION_INVOKE_FAULT;
		context.fault = fault;

		self._process(context, function(error: any, status: ProcessStatus) {
			next(error, status);
		}.bind(self));
	}

	public _process(context: InvocationContext, next: (error: any, status: ProcessStatus) => void): void {
		const self: Interceptor = this;
		let method: string = self.getName() + '._process';
    debug(method + ' [Etner]', context);

		self.canProcess(context, function(error: any, canProcess: boolean) {
			let interactionType: InteractionType = context.__interaction__.interactionType;
			if (! canProcess) {
		     if (interactionType === InteractionType.INTERACTION_LOCATE || interactionType === InteractionType.INTERACTION_INVOKE) {
					 self._getNext()._process(context, function(error: any, status: ProcessStatus) {
					    next(error, status); 
					 }.bind(self));
				 } else {
					 self._getPrevious()._process(context, function(error: any, status: ProcessStatus) {
					    next(error, status); 
					 }.bind(self));
				 }	
				return;
			}

			try {
				switch(interactionType) {
					case InteractionType.INTERACTION_LOCATE:
						self.init(context, function(error: any) {
							if (error) {
								return self.switchToFaultFlow(error, context, function(error: any, status: ProcessStatus) { next(error, status); }.bind(self));
							}
							return  self._getNext()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
						}.bind(self));
						break;
					case InteractionType.INTERACTION_LOCATE_RESULT:
						self._getPrevious()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
            break;
					case InteractionType.INTERACTION_INVOKE:
						self.handleRequest(context, function(error: any) {
							if (error) {
								return self.switchToFaultFlow(error, context, function(error: any, status: ProcessStatus) { next(error, status); }.bind(self));
							}
							return  self._getNext()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
						}.bind(self));
						break;
					case InteractionType.INTERACTION_INVOKE_RESULT:
						self.handleResponse(context, function(error: any) {
							if (error) {
								return self.switchToFaultFlow(error, context, function(error: any, status: ProcessStatus) { next(error, status); }.bind(self));
							}
							return  self._getPrevious()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
						}.bind(self));
						break;
					case InteractionType.INTERACTION_INVOKE_FAULT:
						self.handleFault(context, function(error: any) {
							return  self._getPrevious()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
						}.bind(self));
						break;
					default:
						throw new Error('Invalid interaction type: ' + interactionType);
				}
			} catch(error) {
				debug(method + ' [catch error]: ', error);
				switch(interactionType) {
					case InteractionType.INTERACTION_LOCATE:
					case InteractionType.INTERACTION_LOCATE_RESULT:
					case InteractionType.INTERACTION_INVOKE:
					case InteractionType.INTERACTION_INVOKE_RESULT:
						self.switchToFaultFlow(error, context, function(error: any, status: ProcessStatus) { next(error, status); }.bind(self));
						break;
					case InteractionType.INTERACTION_INVOKE_FAULT:
						// TODO, log error here
						self._getPrevious()._process(context, function(error: any, status: ProcessStatus) { next(error, status);}.bind(self));
						break;
					default:
						throw new Error('Invalid interaction type: ' + interactionType);
				}
			} // end catch
		
		}.bind(self)); 
	}
}

/**
 * Interceptor registry class
 *
 */
export class Registry<I extends Processor, M extends InterceptorMetadata> {
  constructor() {}

	private __interceptors__: { [name: string]: M;} = {};
  
	/**
	 * @method, get interceptor class definition 
	 *
	 */
  public getInterceptorClass(name: string): Function {
		let method: string = 'Registry.getInterceptorClass';
		debug(method + ' [Enter]', name);

    let ides: M = this.__interceptors__[name];	
		if (! ides) {
			debug(method + ' [WARNING]: Missing interceptor "' + name+ '" in registry'); 
			debug(method + ' [Exit]');
	    return null;	
		}

		debug(method + ' [Exit]', name, ides.__class__);
		return ides.__class__;
	}
	
	/**
	 * @method, get interceptor metadata 
	 *
	 */
  public getInterceptorMetadata(name: string): M {
		let method: string = 'Registry.getInterceptorMetadata';
		debug(method + ' [Enter]', name);

    let ides: M = this.__interceptors__[name];	
		if (! ides) {
			debug(method + ' [WARNING]: Missing interceptor "' + name+ '" in registry'); 
			debug(method + ' [Exit]');
	    return null;	
		}

		debug(method + ' [Exit]', name, ides);
		return ides;
	}

	/**
	 * @method, register a new interceptor with metadata
	 *
	 */
	public register(ides: M): void {
		let method: string = 'Registry.register';
		debug(method + ' [Enter]', ides);
		if (! ides) {
			debug(method + ' [Exit]', ides);
			return;
		}	

		if (this.__interceptors__[ides.__class__.name]) {
			console.error(method + ' [WARNING]: Dumplicated interceptor definitions: "' + ides.__class__.name+ '" in registry'); 

			debug(method + ' [Exit](failed)', ides);
			return;
		}
		this.__interceptors__[ides.__class__.name] = ides;
		debug(method + ' [Exit]', ides);
	}
}

/**
 * Export singletone registry
 */
export let interceptorRegistry: Registry<Processor, InterceptorMetadata> = new Registry();
