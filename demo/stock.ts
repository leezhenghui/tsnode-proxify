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

import { Interceptor }                                 from '../src/annotation/interceptor'; 
import { Component }                                   from '../src/annotation/component';
import { QoS }                                         from '../src/annotation/qos';
import { InteractionStyle, Completion, Callback, Fault, Output } from '../src/annotation/interaction';
import { InteractionStyleType }                        from '../src/metadata/common';
import * as interceptor                                from '../src/runtime/interceptor';
import { InvocationContext }                           from '../src/runtime/invocation';

@Interceptor({
	"interactionStyle": InteractionStyleType.SYNC
})
class LoggingInterceptor extends interceptor.Interceptor{
	private LOG_PREFIX: string = '[LoggingInterceptor] ';

	constructor(config: any) {
		super(config);	
	}

	private getTargetFullName (context: InvocationContext): string {
		let targetFullName = context.__interaction__.omd.__className__ + '.' + context.__interaction__.omd.__operationName__;

		return targetFullName;
	}

	public init (context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + ' init');
		done();
	}

	public handleRequest(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + ' handleRequest: ' + this.getTargetFullName(context));
		done();	
	}

	public handleResponse(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + ' handleResponse: '+ this.getTargetFullName(context));
		done();	
	}

	public handleFault(context: InvocationContext, done: Function): void {
		console.log(this.LOG_PREFIX + ' handleFault: '+ this.getTargetFullName(context));
		done();	
	}

	public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
		callback(null, true);	
	}

	public getName(): string {
		return 'LoggingInterceptor';	
	}
}
		
class BaseStock {
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
		BaseStock.DEFAULT_UNIT = val;	
	}

	@QoS({
		interceptorType: LoggingInterceptor,
		initParams: null,
		singleton: null
	})
	static getVersion(): string {
		return 'v1.0.0';	
	}

	@InteractionStyle(InteractionStyleType.SYNC)
	@QoS({
		interceptorType: LoggingInterceptor,
		initParams: null,
		singleton: null
	})
	getPrice(name: string): number {
		console.log('[getPrice]', name);

		var reval = null;
		this.stocks.some(function(stock) {
			if (name === stock.name) {
				reval = stock;
				return true;
			}	
		});
		return reval.price;	
	}

	@QoS({
		interceptorType: LoggingInterceptor,
		initParams: null,
		singleton: null
	})
	setPrice(name: string, price: number): void {
		console.log('[setPrice]', name, price);
		this.stocks.push({
			name: name,
			price: price
		});	
	}

	@QoS({
		interceptorType: LoggingInterceptor,
		initParams: null,
		singleton: null
	})
	printPrice(name: string, @Completion cb: (error: any, result: number) => void): void {
		console.log('[printPrice]: ', name);
		var reval = null;
		this.stocks.some(function(stock) {
			if (name === stock.name) {
				reval = stock;
				return true;
			}	
		});

		cb(null, reval);
	}
}
	
@Component({
	"componentName": 'Stock',
})
class Stock extends BaseStock {
	constructor(name: string, price: number) {
		super(name, price); 
	}
}

class Printer {
	@Callback
	print(@Fault error: any, @Output result: number): void {
		if (error) {
			console.error('Error occurs in callback method, due to: ', error);
			return;
		}	
		console.log('[Printer]:', result);
	}	
}

//=====================
//    main
//====================

let stock: Stock = new Stock('IBM', 100);

console.log('===========================================');
stock.setPrice('Alibaba', 200);
console.log('===========================================');
console.log(stock.getPrice('IBM'));
console.log('===========================================');
console.log(stock.getPrice('Alibaba'));
console.log('===========================================');
console.log(Stock.getVersion());
console.log('===========================================');
let printer: Printer = new Printer(); 
stock.printPrice('IBM', printer.print);
