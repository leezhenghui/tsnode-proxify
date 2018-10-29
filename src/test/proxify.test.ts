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
 * @module, Provides unit test cases for interceptor
 *
 */

import { expect }                                      from 'chai';
import * as Q                                          from 'q';
import * as Debug                                      from 'debug';
import { Interceptor }                                 from '../main/annotation/interceptor'; 
import { Component }                                   from '../main/annotation/component';
import { QoS }                                         from '../main/annotation/qos';
import { InteractionStyle, Completion, Callback, Fault, Output }                            from '../main/annotation/interaction';
import { InteractionStyleType, isComponentManagedProp, isCallbackWrappedProp } from '../main/metadata/common';
import { INTERCEPTOR_METADATA_SLOT }                   from '../main/metadata/interceptor';
import { OPERATION_METADATA_SLOT }                     from '../main/metadata/operation';
import { CALLBACK_METADATA_SLOT }                      from '../main/metadata/callback'; 
import * as interceptor                                from '../main/runtime/interceptor';
import { InvocationContext, Processor, ProcessStatus } from '../main/runtime/invocation';


//=================================================
//   Interceptor Registry Function Test Content
//=================================================

	@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
	})
	class FooInterceptor extends interceptor.Interceptor {
		constructor(config: any) {
			super(config);	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'FooInterceptor';	
		}
	}

	@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
	})
	class BarInterceptor extends interceptor.Interceptor{
		constructor(config: any) {
			super(config);	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'BarInterceptor';	
		}
	}

	class BarInterceptorWithoutAnnotation extends interceptor.Interceptor{
		constructor(config: any) {
			super(config);	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'BarInterceptorWithoutAnnotation';	
		}
	}

//=================================================
// Proxify Decorators Basic Function Test Content
//=================================================

	@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
	})
	class FakeInterceptor extends interceptor.Interceptor{
		constructor(config: any) {
			super(config);	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'FooInterceptor';	
		}
	}
	@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
	})
	class LoggingInterceptor extends interceptor.Interceptor{
		private debug:Debug.IDebugger = Debug('proxify:LoggingInterceptor');
		private LOG_PREFIX: string = '[LoggingInterceptor] ';
		constructor(config: any) {
			super(config);	
		}

		private getTargetFullName (context: InvocationContext): string {
			let targetFullName = context.__interaction__.omd.__className__ + '.' + context.__interaction__.omd.__operationName__;

			return targetFullName;
		}

		public init (context: InvocationContext, done: Function): void {
			this.debug(this.LOG_PREFIX + ' init ');
			done();
		}

		public handleRequest(context: InvocationContext, done: Function): void {
			this.debug(this.LOG_PREFIX + ' handleRequest: ' + this.getTargetFullName(context));
			done();	
		}

		public handleResponse(context: InvocationContext, done: Function): void {
			this.debug(this.LOG_PREFIX + ' handleResponse: '+ this.getTargetFullName(context));
			done();	
		}

		public handleFault(context: InvocationContext, done: Function): void {
			this.debug(this.LOG_PREFIX + ' handleFault: '+ this.getTargetFullName(context));
			done();	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'LoggingInterceptor';	
		}
	}

	class Foo {
		constructor() {}	
		public getId() {
			return 'id';
		}
	}

	class Stock {
		private stocks: any[] = [];
		public servedCount: number = 0;
		protected scope:any = null; 

		constructor(name: string, price: number) {
			if ( ! name) return this;
			this.stocks.push({
				name: name,
				price: price
			});	
		}

		static get DEFAULT_UNIT() {
			return '$';	
		}

		static set DEFAULT_UNIT(val:string) {
			Stock.DEFAULT_UNIT = val;	
		}

		@QoS({
			interceptorType: FakeInterceptor,
			initParams: null,
			singleton: null
		})
		@QoS({
			interceptorType: LoggingInterceptor,
			initParams: null,
			singleton: null
		})
		static getVersion(@Completion cb: Function): string {
			if (cb) {
				return cb(null, 'v1.0.0');	
			}
			return 'v1.0.0';	
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({
			interceptorType: FakeInterceptor,
			initParams: null,
			singleton: null
		})
		@QoS({
			interceptorType: LoggingInterceptor,
			initParams: null,
			singleton: null
		})
		getPrice(name: string, @Completion cb: Function) {
			// console.log('[getPrice]', name);

			var reval = null;
			this.stocks.some(function(stock) {
				if (name === stock.name) {
					reval = stock;
					return true;
				}	
			});
			if (cb) return cb(null, reval.price);
			return reval.price;	
		}

		@QoS({
			interceptorType: FakeInterceptor,
			initParams: null,
			singleton: null
		})
		@QoS({
			interceptorType: LoggingInterceptor,
			initParams: null,
			singleton: null
		})
		setPrice(name: string, price: number) {
			// console.log('[setPrice]', name, price);
			this.stocks.push({
				name: name,
				price: price
			});	
		}

		printPrice(name: string, price: number): void {
			// console.log('[printPrice]: ', name, price);
		}
	}

	@Component({
		"componentName": 'HKStock',
	})
	class HKStock extends Stock {
		constructor(name: string, price: number) {
			super(name, price); 
		}
	}

	@Component({
		"componentName": 'USStock',
	})
	class USStock extends Stock {
		constructor(name: string, price: number) {
			super(name, price); 
		}
	}

	class  CBClass {
		private QNAME: string = 'CBClass';
		public reval: any;

		@Callback
		cb(@Fault error: any, @Output result: any) {
			if (error) {
				// console.error('Error occurs in callback method, due to: ', error);
				return;
			}	

			// console.log(this.QNAME, '>>>> reval:', result);
			this.reval = result;
			// console.log(this.QNAME, '>>>> this:', this);
			return result;
		}	
	}

//=================================================
//   Integration Test Content
//=================================================

	@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
	})
	class Logger extends interceptor.Interceptor{
		private LOG_PREFIX: string = '[Logger] ';
		private debug:Debug.IDebugger = Debug('proxify:Logger');

		public initMethodCalledCount: number = 0;
		public handleRequestMethodCalledCount: number = 0;
		public handleResponseMethodCalledCount: number = 0;
		public handleFaultMethodCalledCount: number = 0;

		private callStack: Array<number> = new Array<number>();

		constructor(config: any) {
			super(config);	
		}

		private getTargetFullName (context: InvocationContext): string {
			let targetFullName = context.__interaction__.omd.__className__ + '.' + context.__interaction__.omd.__operationName__;

			return targetFullName;
		}

		public init (context: InvocationContext, done: Function): void {
			const self: Logger = this; 
			this.debug(this.LOG_PREFIX + ' init');
			this.initMethodCalledCount ++;
			context.slots.set(self.getName(), {});
			done();
		}

		public handleRequest(context: InvocationContext, done: Function): void {
			const self: Logger = this; 
			this.debug(this.LOG_PREFIX + ' handleRequest: ' + this.getTargetFullName(context));
			this.handleRequestMethodCalledCount ++;
      let logCtx: any = context.slots.get(self.getName()).iid = self.handleRequestMethodCalledCount;
			// console.log('---> request iid: ' + this.handleRequestMethodCalledCount);
			self.callStack.push(self.handleRequestMethodCalledCount);
			done();	
		}

		public handleResponse(context: InvocationContext, done: Function): void {
			const self: Logger = this; 
			this.debug(this.LOG_PREFIX + ' handleResponse: '+ this.getTargetFullName(context));
			this.handleResponseMethodCalledCount ++;
			// console.log('<--- response iid: ' + context.slots.get(self.getName()).iid);
			let iidInCS: number  = self.callStack.pop();

			if (iidInCS !== context.slots.get(self.getName()).iid) {
		    throw new Error('Mismatched callstack, actual: ' +  iidInCS + ', but expected: ' + context.slots.get(self.getName()).iid);	
			}
			done();	
		}

		public handleFault(context: InvocationContext, done: Function): void {
			const self: Logger = this; 
			this.debug(this.LOG_PREFIX + ' handleFault: '+ this.getTargetFullName(context));
			this.handleFaultMethodCalledCount ++;
			// console.log('<--- fault iid: ' + context.slots.get(self.getName()).iid);
			let iidInCS: number  = self.callStack.pop();

			if (iidInCS !== context.slots.get(self.getName()).iid) {
		    throw new Error('Mismatched callstack, actual: ' +  iidInCS + ', but expected: ' + context.slots.get(self.getName()).iid);	
			}
			done();	
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			callback(null, true);	
		}

		public getName(): string {
			return 'Logger';	
		}

		public reset(): void {
	    this.initMethodCalledCount = 0;
			this.handleRequestMethodCalledCount = 0;
			this.handleResponseMethodCalledCount = 0;
			this.handleFaultMethodCalledCount = 0;
		}
	}
	
	@Interceptor({
		"interactionStyle": InteractionStyleType.ASYNC
	})
	class AsyncLogger extends interceptor.Interceptor{
		private LOG_PREFIX: string = '[Logger] ';
		private debug:Debug.IDebugger = Debug('proxify:Logger');

		public initMethodCalledCount: number = 0;
		public handleRequestMethodCalledCount: number = 0;
		public handleResponseMethodCalledCount: number = 0;
		public handleFaultMethodCalledCount: number = 0;

		constructor(config: any) {
			super(config);	
		}

		private getTargetFullName (context: InvocationContext): string {
			let targetFullName = context.__interaction__.omd.__className__ + '.' + context.__interaction__.omd.__operationName__;

			return targetFullName;
		}

		public init (context: InvocationContext, done: Function): void {
			const self: AsyncLogger = this;
			Q().then(function() {
				self.debug(self.LOG_PREFIX + ' init');
				self.initMethodCalledCount ++;
				done();
			});
		}

		public handleRequest(context: InvocationContext, done: Function): void {
			const self: AsyncLogger = this;
			Q().then(function() {
				self.debug(self.LOG_PREFIX + ' handleRequest: ' + self.getTargetFullName(context));
				self.handleRequestMethodCalledCount ++;
				done();	
			});
		}

		public handleResponse(context: InvocationContext, done: Function): void {
			const self: AsyncLogger = this;
			Q().then(function() {
				self.debug(self.LOG_PREFIX + ' handleResponse: '+ self.getTargetFullName(context));
				self.handleResponseMethodCalledCount ++;
				done();	
			});
		}

		public handleFault(context: InvocationContext, done: Function): void {
			const self: AsyncLogger = this;
			Q().then(function() {
				self.debug(self.LOG_PREFIX + ' handleFault: '+ self.getTargetFullName(context));
				self.handleFaultMethodCalledCount ++;
			done();	
			});
		}

		public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
			const self: AsyncLogger = this;
			Q().then(function() {
				callback(null, true);	
			});
		}

		public getName(): string {
			return 'AsyncLogger';	
		}

		public reset(): void {
	    this.initMethodCalledCount = 0;
			this.handleRequestMethodCalledCount = 0;
			this.handleResponseMethodCalledCount = 0;
			this.handleFaultMethodCalledCount = 0;
		}
	}

	const logger = new Logger({});
	const asyncLogger = new AsyncLogger({});

	const DELAY_EXECUTION_TIME = 100;

	@Component({
		"componentName": 'StockService',
	})
	class StockService {
		private stocks: any[] = [];
		public servedCount: number = 0;
		protected scope:any = null; 

		public isCallbackCalled: boolean = false;

		constructor(name: string, price: number) {
			if ( ! name) return this;
			this.stocks.push({
				name: name,
				price: price
			});	
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({ singleton: logger})
		static getUnit(): string {
			return '$';	
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({ singleton: logger})
		getPrice(name: string): number {
			// console.log('[getPrice]', name);

			var reval = null;
			this.stocks.some(function(stock) {
				if (name === stock.name) {
					reval = stock;
					return true;
				}	
			});
			return reval.price;	
		}
		
		@InteractionStyle(InteractionStyleType.ASYNC)
		@QoS({ singleton: logger})
		getPriceAsync(name: string): Q.Promise<number> {
			const self: StockService =  this;
			let deferred: Q.Deferred<any> = Q.defer<any>();
			setTimeout(function() {
				var reval = null;
				self.stocks.some(function(stock) {
					if (name === stock.name) {
						reval = stock;
						return true;
					}	
				});
				deferred.resolve(reval.price);
			}, DELAY_EXECUTION_TIME);
			return deferred.promise;
		}
		
		@InteractionStyle(InteractionStyleType.ASYNC)
		@QoS({ singleton: asyncLogger})
		getPriceAsyncWithAsyncInterceptor(name: string): Q.Promise<number> {
			const self: StockService =  this;
			let deferred: Q.Deferred<any> = Q.defer<any>();
			setTimeout(function() {
				var reval = null;
				self.stocks.some(function(stock) {
					if (name === stock.name) {
						reval = stock;
						return true;
					}	
				});
				deferred.resolve(reval.price);
			}, DELAY_EXECUTION_TIME);
			return deferred.promise;
		}
		
		@InteractionStyle(InteractionStyleType.ASYNC)
		@QoS({ singleton: logger})
		getPriceAsyncCallback(name: string, @Completion cb: (error: any, result: number) => void): void{
			const self: StockService =  this;
			setTimeout(function() {
				// console.log('[getPriceAsyncCallback]', name);
				var reval = null;
				self.stocks.some(function(stock) {
					if (name === stock.name) {
						reval = stock;
						return true;
					}	
				});
				cb(null, reval);
			}, DELAY_EXECUTION_TIME);
		}
		
		@InteractionStyle(InteractionStyleType.ASYNC)
		@QoS({ singleton: asyncLogger})
		getPriceAsyncCallbackWithAsyncInterceptor(name: string, @Completion cb: (error: any, result: number) => void): void{
			const self: StockService =  this;
			setTimeout(function() {
				// console.log('[getPriceAsyncCallback]', name);
				var reval = null;
				self.stocks.some(function(stock) {
					if (name === stock.name) {
						reval = stock;
						return true;
					}	
				});
				cb(null, reval);
			}, DELAY_EXECUTION_TIME);
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({ singleton: logger})
		setPrice(name: string, price: number): void {
			// console.log('[setPrice]', name, price);
			this.stocks.push({
				name: name,
				price: price
			});	
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({ singleton: logger})
		printPrice(name: string, @Completion cb: (error: any, result: number) => void): void {
			// console.log('[printPrice]: ', name);
			var reval = null;
			this.stocks.some(function(stock) {
				if (name === stock.name) {
					reval = stock;
					return true;
				}	
			});

			cb(null, reval);
		}

		@Callback
		print(@Fault error: any, @Output result: number): void {
			if (error) {
				console.error('Error occurs in callback method, due to: ', error);
				return;
			}	
			this.isCallbackCalled = true;
			// console.log('[Printer]:', result);
		}	

		public reset(): void {
	    this.isCallbackCalled = false;	
		}
	}

	const MAX_NESTED_STACK_DEPTH = 160;

	@Component({
		"componentName": 'NestedInvocation',
	})
	class NestedInvocation {
		public callbackMethodCalledCount: number = 0;
		public stackDepth: number = 0;

		invoke(): void {
			// console.log('this.nestInvoke isComponentManagedProp? :', this.nestInvoke[isComponentManagedProp]);
			this.nestInvoke('nested-tester', this.callback.bind(this));
		}

		@InteractionStyle(InteractionStyleType.SYNC)
		@QoS({ singleton: logger})
		nestInvoke(name: string, @Completion cb: (error: any, result: string) => void): void {
			const self: NestedInvocation = this;

			// console.log('isCallbackWrappedCallback? :', cb[isCallbackWrappedProp]);
			// console.log('self.nestInvoke isComponentManagedProp? :', self.nestInvoke[isComponentManagedProp]);
			self.stackDepth ++;
			if (self.stackDepth === MAX_NESTED_STACK_DEPTH) {
				cb(null, 'OK');
			} else {
		    self.nestInvoke(name, cb);
			}
		}

		public reset(): void {
		  this.callbackMethodCalledCount = 0;
			this.stackDepth = 0;
		}
		
		@Callback
		callback(@Fault error: any, @Output result: string): void {
			if (error) {
				console.error('Error occurs in callback method, due to: ', error);
				return;
			}	
			this.callbackMethodCalledCount ++;
		}	

		fnEquals(nestInvokeFn: Function): boolean {
	
			if (this.nestInvoke === nestInvokeFn) {
		    return true;	
			}

			return false;
		}

		equals(o: NestedInvocation): boolean {
	    if (this === o) {
		    return true;	
			}	
			return false;
		}
	}

//=================================================
//   Interceptor Registry Function Test
//=================================================

describe('@Interceptor Tests', function() {

	it('Register Interceptor Class/Metadata Via Annotation', function() {
		let creator: Function = interceptor.interceptorRegistry.getInterceptorClass(FooInterceptor.name);	
		expect(creator.name).to.equal(FooInterceptor.name);
		creator = interceptor.interceptorRegistry.getInterceptorClass(BarInterceptor.name);
		expect(creator.name).to.equal(BarInterceptor.name);
		expect(creator[INTERCEPTOR_METADATA_SLOT].interactionStyle).to.equal(InteractionStyleType.SYNC);
		creator = interceptor.interceptorRegistry.getInterceptorClass(BarInterceptorWithoutAnnotation.name);
		expect(creator).to.equal(null);
	});
});

//=================================================
//   Proxify Decorators Basic Function Test
//=================================================

describe('@Component, @QoS, @Completion, @Callback Basic Function Tests', function() {

	it('Reflect to create an interceptor instance', function() {
		let iFn: Function = LoggingInterceptor;
		let initParams = [];

		expect(iFn.name).to.equal('LoggingInterceptor');
		let i: interceptor.Interceptor = Reflect.construct(iFn, initParams);
		expect(i instanceof interceptor.Interceptor).to.equal(true);
		expect(i instanceof Processor).to.equal(true);
		expect(i.getName()).to.equal('LoggingInterceptor');
	});

	it('Instanceof Operator Tests on the Class without Proxify Annotation', function() {
		let foo: Foo = new Foo();
		expect(foo instanceof Foo).to.equal(true);
		expect(foo instanceof Stock).to.equal(false);
	});

	it('Instanceof Operator Tests on the Class with Proxify Annotation', function() {
		let foo: USStock = new USStock('IBM', 100);
		expect(foo instanceof Stock).to.equal(true);
	});

	it('Class Without Proxify annotation should not be wrapped by Proxy', function() {
		expect(Stock[isComponentManagedProp]).to.equal(undefined);
	});

	it('Class With @Component should be wrapped by Proxy', function() {
		expect(HKStock[isComponentManagedProp]).to.equal(true);
		expect(USStock[isComponentManagedProp]).to.equal(true);
	});

	it('Typeof operation on the Class With @Component should be wrapped by Proxy', function() {
		expect(typeof HKStock).to.equal('function');
		expect(typeof USStock).to.equal('function');
	});

	it('Instanceof operation on the Class With @Component should be wrapped by Proxy', function() {
		expect(HKStock instanceof Function).to.equal(true);
		expect(USStock instanceof Function).to.equal(true);
		expect(Stock instanceof Function).to.equal(true);
	});

	it('Object instance created by Wrapped Class should also be wrapped by Proxy', function() {
		let stock: USStock = new USStock('IBM', 100);
		expect(stock[isComponentManagedProp]).to.equal(true);
	});

	it('Typeof operator on object instance which created by Wrapped Class', function() {
		let stock: USStock = new USStock('IBM', 100);
		expect(typeof stock).to.equal('object');
	});

	it('Instanceof operator should work on wrapped object which is created by wrapped class', function() {
		let stock: HKStock = new HKStock('Tecent', 200);
		expect(stock instanceof Object).to.equal(true);
		expect(stock instanceof HKStock).to.equal(true);
		expect(stock instanceof Stock).to.equal(true);
		expect(stock instanceof USStock).to.equal(false);
		expect(stock instanceof Foo).to.equal(false);
	});

	it('Constructor property of object instance not equals to Proxied constuctor', function() {
		let stock: USStock = new USStock('IBM', 100);
		// the stock is created by original USStock class
		// within decorator factory function, the USStock used out of
		// decorator will point to the proxied one 
		expect(stock.constructor === USStock).to.equal(false);
	});

	it('Proxied object __proto__ property equals to <proxied-constructor>.prorotype', function() {
		let protoKey: string = '__proto__';
		let stock: USStock = new USStock('IBM', 100);
		// console.log('USStock.prototype:', USStock.prototype);
		// console.log('stock.__proto__', stock[protoKey]);
		expect(stock[protoKey]=== USStock.prototype).to.equal(true);
		expect(stock.constructor.prototype === USStock.prototype).to.equal(true);
	});

	it('Object instance method contains metadata attachment', function() {
		let stock: USStock = new USStock('IBM', 100);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
		expect(stock.getPrice[OPERATION_METADATA_SLOT].sizeOfQoS()).to.equal(2);
	});

	it('Method which returned by bind() method contains metadata attachment', function() {
		let stock: USStock = new USStock('IBM', 100);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
		expect(stock.getPrice.bind(stock)[OPERATION_METADATA_SLOT] !== undefined).to.equal(true);
	});

	it('@QoS on static method', function() {
		expect(USStock.getVersion[isComponentManagedProp]).to.equal(true);
		expect(USStock.getVersion[OPERATION_METADATA_SLOT].sizeOfQoS()).to.equal(2);
	});

	it('Method without QoS decorator should NOT be wrapped by Proxy', function() {
		let stock: USStock = new USStock('IBM', 100);
		expect(stock.printPrice[isComponentManagedProp]).to.equal(undefined);
	});

	it('@QoS wrapped proxy', function() {
		let stock: USStock = new USStock('IBM', 100);
		stock.getPrice('IBM', null);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
	});

	it('@QoS on object method with bind()ed context', function() {
		let stock: USStock = new USStock('IBM', 100);
		let v: any = stock.getPrice('IBM', null);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
		let getPriceFn: Function = stock.getPrice.bind(stock);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
		expect(getPriceFn[isComponentManagedProp]).to.equal(true);
		expect(v).to.equal(100);
	});

	it('@QoS on static method invocation', function() {
		let v: string = USStock.getVersion(null);
		expect(USStock.getVersion[isComponentManagedProp]).to.equal(true);
		expect(v).to.equal('v1.0.0');
	});

	it('@Fault decorator metadata test', function() {
		let cb = new CBClass();
		expect(cb.cb[CALLBACK_METADATA_SLOT].sizeOfFaultParams()).to.equal(1);
		expect(cb.cb[CALLBACK_METADATA_SLOT].isFaultParam(0)).to.equal(true);
	});

	it('@Output decorator metadata test', function() {
		let cb = new CBClass();
		expect(cb.cb[CALLBACK_METADATA_SLOT].sizeOfOutputParams()).to.equal(1);
		expect(cb.cb[CALLBACK_METADATA_SLOT].isOutputParam(1)).to.equal(true);
	});

	it('@Completion on object method', function() {
		let completion_fn_position = '__completion_fn_param_position__';
		let stock: USStock = new USStock('IBM', 100);
		expect(stock.getPrice[isComponentManagedProp]).to.equal(true);
		expect(stock.getPrice[OPERATION_METADATA_SLOT][completion_fn_position]).to.equal(1);
		let cbobj =  new CBClass();
		let cbm = cbobj.cb;
		stock.getPrice('IBM', cbm.bind(cbobj));
		// stock.getPrice('IBM', cbm);
		// console.log('>>>>', cbobj);
		expect(cbobj.reval).to.equal(100);
	});

	it('@Completion on a static method', function() {
		let completion_fn_position = '__completion_fn_param_position__';
		expect(USStock.getVersion[isComponentManagedProp]).to.equal(true);
		expect(USStock.getVersion[OPERATION_METADATA_SLOT][completion_fn_position]).to.equal(0);
	});

	it('@Completion decorator points to a static callback method', function() {
		expect(USStock.getVersion[isComponentManagedProp]).to.equal(true);

		let cbobj =  new CBClass();
		let cbm = cbobj.cb;
		expect(cbm[CALLBACK_METADATA_SLOT].sizeOfOutputParams()).to.equal(1);
		expect(cbm[CALLBACK_METADATA_SLOT].isOutputParam(1)).to.equal(true);
		expect(cbm[CALLBACK_METADATA_SLOT].sizeOfFaultParams()).to.equal(1);
		expect(cbm[CALLBACK_METADATA_SLOT].isFaultParam(0)).to.equal(true);
		USStock.getVersion(cbm.bind(cbobj));
		// USStock.getVersion(cbm);
		// console.log('>>>>', cbobj);
		expect(cbobj.reval).to.equal('v1.0.0');
	});
	
	it('Proxified method should be equals for <obj>.<fn> and this.<fn>', function() {
		let ni: NestedInvocation = new NestedInvocation();
		expect(true).to.equal(ni.equals(ni));
		expect(true).to.equal(ni.fnEquals(ni.nestInvoke));
	});
});

//=================================================
//             Integration Test
//=================================================

describe('Integration Tests', function() {

	it('@QoS on static sync-return method with sync-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		let unit: string = StockService.getUnit();
		expect(unit).to.equal('$');
		expect(logger.initMethodCalledCount).to.equal(1);
		expect(logger.handleRequestMethodCalledCount).to.equal(1);
		expect(logger.handleResponseMethodCalledCount).to.equal(1);
	});

	it('@QoS on sync-return method with sync-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		let price: number = ss.getPrice('IBM');
		expect(price).to.equal(100);
		expect(logger.initMethodCalledCount).to.equal(1);
		expect(logger.handleRequestMethodCalledCount).to.equal(1);
		expect(logger.handleResponseMethodCalledCount).to.equal(1);
	});
	
	it('@QoS on sync-callback method with sync-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		ss.reset();
		ss.printPrice('IBM', ss.print.bind(ss));
		expect(ss.isCallbackCalled).to.equal(true);
		expect(logger.initMethodCalledCount).to.equal(1);
		expect(logger.handleRequestMethodCalledCount).to.equal(1);
		expect(logger.handleResponseMethodCalledCount).to.equal(1);
	});
	
	it('@QoS on async-promise method with sync-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		ss.reset();
		let promsie: Q.Promise<number> = ss.getPriceAsync('IBM');
		// console.log('--> Waiting for promise resolved');
		return promsie.then(function(price) {
			expect(price).to.equal(100);
			expect(logger.initMethodCalledCount).to.equal(1);
			expect(logger.handleRequestMethodCalledCount).to.equal(1);
			expect(logger.handleResponseMethodCalledCount).to.equal(1);
		});
	});
	
	it('@QoS on async-promise method with async-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		asyncLogger.reset();
		ss.reset();
		let promsie: Q.Promise<number> = ss.getPriceAsyncWithAsyncInterceptor('IBM');
		// console.log('--> Waiting for promise resolved');
		return promsie.then(function(price) {
			expect(price).to.equal(100);
			expect(asyncLogger.initMethodCalledCount).to.equal(1);
			expect(asyncLogger.handleRequestMethodCalledCount).to.equal(1);
			expect(asyncLogger.handleResponseMethodCalledCount).to.equal(1);
		});
	});
	
	it('@QoS on async-callback method with sync-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		ss.reset();
		let isCallbackCalled: boolean = false;
		let deferred: Q.Deferred<any> = Q.defer<any>();

		ss.getPriceAsyncCallback('IBM', function(error: any, result: number) {
			isCallbackCalled = true;
			deferred.resolve();
		});

		return deferred.promise.then(function() {
			expect(isCallbackCalled).to.equal(true);
			expect(logger.initMethodCalledCount).to.equal(1);
			expect(logger.handleRequestMethodCalledCount).to.equal(1);
			expect(logger.handleResponseMethodCalledCount).to.equal(1);
			// console.log('---> asset done');
		});
	});
	
	it('@QoS on async-callback method with async-interceptor', function() {
		let ss: StockService = new StockService('IBM', 100);
		asyncLogger.reset();
		ss.reset();
		let isCallbackCalled: boolean = false;
		let deferred: Q.Deferred<any> = Q.defer<any>();

		ss.getPriceAsyncCallbackWithAsyncInterceptor('IBM', function(error: any, result: number) {
			isCallbackCalled = true;

			// wait for invocation completion
			setTimeout(function() {
				deferred.resolve();
			}, DELAY_EXECUTION_TIME + 50);
		});

		return deferred.promise.then(function() {
			expect(isCallbackCalled).to.equal(true);
			expect(asyncLogger.initMethodCalledCount).to.equal(1);
			expect(asyncLogger.handleRequestMethodCalledCount).to.equal(1);
			expect(asyncLogger.handleResponseMethodCalledCount).to.equal(1);
			// console.log('---> asset done');
		});
	});
	
	it('@QoS on sync-callback method with pass-through/nested callback handler', function() {
		let ni: NestedInvocation = new NestedInvocation();
		logger.reset();
		ni.reset();
		// expect(true).to.equal(ni.equals(ni));
		// expect(true).to.equal(ni.fnEquals(ni.nestInvoke));
		ni.nestInvoke('nested-tester', ni.callback.bind(ni));
		expect(ni.callbackMethodCalledCount).to.equal(1);
		expect(logger.initMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
		expect(logger.handleRequestMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
		expect(logger.handleResponseMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
	});

	it('@QoS on a method with nested invocations, QoSed method is triggered by "this" reference', function() {
		let ni: NestedInvocation = new NestedInvocation();
		logger.reset();
		ni.reset();
		ni.invoke();
		expect(ni.callbackMethodCalledCount).to.equal(1);
		expect(logger.initMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
		expect(logger.handleRequestMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
		expect(logger.handleResponseMethodCalledCount).to.equal(MAX_NESTED_STACK_DEPTH);
	});

	it('@QoS on sync-return bind()ed method', function() {
		let ss: StockService = new StockService('IBM', 100);
		logger.reset();
		let bindedFn = ss.getPrice.bind(ss);
		let price: number = bindedFn('IBM');
		expect(price).to.equal(100);
		expect(logger.initMethodCalledCount).to.equal(1);
		expect(logger.handleRequestMethodCalledCount).to.equal(1);
		expect(logger.handleResponseMethodCalledCount).to.equal(1);
	});
});
