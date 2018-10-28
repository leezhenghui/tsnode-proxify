## Introduction

[`tsnode-proxify`](https://github.com/leezhenghui/tsnode-proxify.git) is a proxy-based function hooks and AOP library for node.js. It allows you to extend/provide customized QoS handler and apply these QoS features via typescript decorators(metadata-programming-like syntax) without invasiveness to existing code logic, which increase modularity for your application.

> 
> tsnode-proxify depends on typescript decorator feature which marked as **experimental** feature in typescript. In the meanwhile, tsnode-proxify itself is a **WIP** project, not ready to be used in production environment.

## Proxy pattern 

The `proxy` is a well-used design pattern. We can see it in either high level software architecture design, e.g: api-gateway and service mesh in microservices, or a narrow-down specific programming module. Generally speaking, the proxy pattern provides the capablity to implement a contract interface, but adds special functionality behind the sense. 

## AOP

[`Aspect Oriented Programming`](https://en.wikipedia.org/wiki/Aspect-oriented_programming)(AOP) addresses the problem of cross-cutting concerns. It is a complement to Object-Oriented-Programming(OOP). Not like OOP, which provide class as an key unit of modularity, AOP focus on `aspect` as it's unit of modularity, the `aspect` extract and modularization the code which cut across multiple classes/components for the same concern solution in a system. Such concerns are often termed cross-cutting concerns in AOP literature. In a real-life system, the typical cross-cutting concerns includes logging, security, transaction management, caching, validation, etc. Providing AOP capability is important to increase modularity, and normally be a fundamental feature in a middleware platform.  

### AOP in Java 

AOP is used widely in java world. In a JEE runtime, the transaction, security are noramlly provided as AOP aspects interanlly. In SOA, the SCA runtime also heavily depends on the AOP to provide QoS, IT-Specific features around the business logic. In Spring, the AOP is actually delivered as a base component in fundamental layer. Indeed, according to my experiences on JEE server development, AOP provides an excellent solution for the problems in enterprise application, especially in the middleware layer development.

Implementing an AOP framework to advise method execution, the proxy pattern is perfect fit here. The aspect module code can be abstracted, prepared and  **injected** `before` and `after` the method and be able to recieve the execution context, arguments and output(or fault) to the target operation like it was there.  That is reason we usually see the proxy pattern in an AOP framework.  In a pure java world, some typical approaches to achieve this:

- Weave(static-way)
  - Compile-time weaving(using AspectJ compiler, for example, fully AOP implementation)
  - Load-time weaving(e.g: AspectJ LTW, which depends on the JVM option -javaagent, fully AOP implementation)
- JDK Proxy(dynamical-way, for java interface and method execution join point only)
- CGlib Proxy(dynamical-way, can proxy to class, method execution join point only, but need the proxied method to be public)

> 
> In a pure java world, using dynamical proxy way for AOP implementation, it usually be used in conjunction with a IoC container, which can take over the responsibility of proxy instance construction and injection. 

## Movtivation

As mentioned above, the AOP framework can bring us so many benefits to improve the software modularity. Inspired by JEE experiences, I believe it would be helpful if we have similar framework in node.js. That is reason I come across to tsnode-proxify project. The goal of tsnode-proxify is NOT to provide a complete AOP implementation, it primarily focus on method execution join point for the moment, will add some IoC features to enable the injection of proxified object in future releases. 

## Concepts

Before we dig into the tsnode-proxify, we need to clarify some concepts. 

- Interaction style for a method in node.js 
  - Sync 

      The method completion occurs in the same tick of method invocation requested. 

			e.g: 
			   greet(name: string): string {
					 return 'Hello, ' + name;
				}
		

  - Async

      The method completion happen in a certain tick after method invocation requested. 

			e.g: 
			   greet(name: string, cb: Function): void{
					 setTimeout(function() {
					   let reval = 'Hello, ' + name;
						 cb(null, reval);
					 }, 10); 
				}

- Invocation completion hints(supported so far). This concept is relevant to how we understand `after` of an execution join point
  - method returned (for sync sytle method only)
  - callback method get called (for both sync and async style method)
  - promise get resolved or rejected (for async method with promise as return value) 

Totally, we can provide `before` and `after` advise points for below invocatoin style and completion hint combinations:
  - sync-return
  - sync-callback
  - async-callback
  - async-promise

tsnode-proxify enable the aspect modularity to be implemented as an `Interceptor` class(declared by @Interceptor decorator) for a specific QoS intention, which can be dynamically injected into the join-point if a desired @QoS declaration being claimed on the target method. 

```typescript

@Interceptor({
		"interactionStyle": InteractionStyleType.SYNC
})
class Logger extends interceptor.Interceptor{
	constructor(config: any) {
		super(config);	
	}
 
  // called before get into before and after advise
	public canProcess(context: InvocationContext, callback: (error: any, canProcess: boolean) => void): void {
		callback(null, true);	
	}

  // being called at before advise
	public handleRequest(context: InvocationContext, done: Function): void {
		done();	
	}

  // being called at after advise with output
	public handleResponse(context: InvocationContext, done: Function): void {
		done();	
	}

  // being called at after advise with fault 
	public handleFault(context: InvocationContext, done: Function): void {
		done();	
	}

	public getName(): string {
		return 'InterceptorName';	
	}
}

```

> 
> Notable, If the target method is **sync** interaction style, all of interceptors applied to that method should also be **sync** interaction style. 

### Quick Start

- Prerequsites 
  - node.js 
  - typescript 
- git clone 

  git clone https://github.com/leezhenghui/tsnode-proxify.git

- Run the helloworld sample 

```
npm install

npm run demo:helloworld


> ts-node ./src/demo/helloworld.ts

[logger] <request> Hello.greet; [input]: "World"; [timestamp]: 1540720637480
[greet]    ==> I am saying hello to World
[logger] <response> Hello.greet; [output]: "Hello, World"; [timestamp]: 1540720637481
[result]: "Hello, World"
  
```

[HelloWord sample](https://github.com/leezhenghui/tsnode-proxify/tree/master/src/demo/helloworld.ts) just contains a simple typescript source file, which includes an simple interceptor as well as a sample class. Briefly the sample looks like below:

```typescript

@Component()
class Hello {

	constructor() {}

	@InteractionStyle(InteractionStyleType.SYNC)
	@QoS({interceptorType: Logger})
	greet(name: string): string {
		console.log('[greet]    ==> I am saying hello to', name);
		// console.log('[greet]    callstack:', new Error());
		return 'Hello, ' + name;	
	}
}

```


```typescript
//=====================
//    main
//====================

let hello: Hello = new Hello();
console.log('[result]: "' + hello.greet('World') + '"');

```

- @Component decorator: declare a class to be managed as a component in tsnode-proxify  
- @QoS decorator: declare a method to be proxify and provide `before` and `after` advises  

> 
> Notable, to keep the helloword sample as simple as possible, I don't introduce some other decorators in that sample. If you want to try @Completion and callback invocation, you can refer to [stock](https://github.com/leezhenghui/tsnode-proxify/tree/master/src/demo/stock.ts) sample. For more advanced usages, please refer to integration unit test cases.

### Run Unit Tests

You can run the unit tests to get a full picture of what tsnode-proxify support so far.

```shell
npm run test

> mocha --compilers ts:ts-node/register,tsx:ts-node/register ./src/test/**/*test.ts

    ...

Integration Tests
     ✓ @QoS on static sync non-callback-style method with sync ineraction style interceptor
     ✓ @QoS on sync-return-value-directly method with sync ineraction style interceptor
     ✓ @QoS on sync callback-style method with sync ineraction style interceptor
     ✓ @QoS on async promise-style method with sync ineraction style interceptor (102ms)
     ✓ @QoS on async promise-style method with async ineraction style interceptor (101ms)
     ✓ @QoS on async callback-style method with sync ineraction style interceptor (101ms)
     ✓ @QoS on async callback-style method with async ineraction style interceptor (251ms)
     ✓ Proxified method should be equals for <obj>.<fn> and this.<fn>
     ✓ @QoS on a method with nested invocations(sync callback-style combin sync-style interceptor) (753ms)
     ✓ @QoS on a method with nested invocations, QoSed method is called by "this" reference (730ms)
     ✓ @QoS on sync-return-value-directly bind()ed method
```

## Join us

If you are interested in this project, please feel free to let me know,  any bug-report/comments/suggestions/contribution on this project is appreciated. :-)
