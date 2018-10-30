import * as Q from 'q';

export class Hello {

	private LOG_PREFIX: string = '[logger] ';

	constructor() {}

	greet(name: string): string {
		const self: Hello = this;
		console.log(self.LOG_PREFIX + '<request> ' + '; [input]: "' + name + '"; [timestamp]: ' + new Date().getTime());
		console.log('[Hello.greet]    ==> I am saying hello to', name);
		let reval: string  = 'Hello, ' + name;	
		console.log(self.LOG_PREFIX + '<response> ' + '; [output]: "' + reval + '"; [timestamp]: ' + new Date().getTime());
		return reval;
	}
	
	greetCallback(name: string, cb: (error: Error, message: string) => void): void{
		const self: Hello = this;
		console.log(self.LOG_PREFIX + '<request> ' + '; [input]: "' + name + '"; [timestamp]: ' + new Date().getTime());
		console.log('[Hello.greetCallback]    ==> I am saying hello to', name);
		let reval: string  = 'Hello, ' + name;	
		console.log(self.LOG_PREFIX + '<response> ' + '; [output]: "' + reval + '"; [timestamp]: ' + new Date().getTime());
		cb(null, reval);
	}

	greetAsyncPromise(name: string): Q.Promise<string> {
		const self: Hello = this;
		console.log(self.LOG_PREFIX + '<request> ' + '; [input]: "' + name + '"; [timestamp]: ' + new Date().getTime());
		console.log('[Hello.greetAsyncPromise]    ==> I am saying hello to', name);
		return Q().then(function() {
			let reval: string  = 'Hello, ' + name;	
			console.log(self.LOG_PREFIX + '<response> ' + '; [output]: "' + reval + '"; [timestamp]: ' + new Date().getTime());
			return reval;
		}).fail(function(err) {
			console.error('Error in greetAsyncPromise()', err);
			throw err;
		});
	}
	
	greetAsyncCallback(name: string, cb: (error: Error, message: string) => void): void {
		const self: Hello = this;
		console.log(self.LOG_PREFIX + '<request> ' + '; [input]: "' + name + '"; [timestamp]: ' + new Date().getTime());
		console.log('[Hello.greetAsyncCallback]    ==> I am saying hello to', name);
		Q().then(function() {
			let reval: string  = 'Hello, ' + name;	
			console.log(self.LOG_PREFIX + '<response> ' + '; [output]: "' + reval + '"; [timestamp]: ' + new Date().getTime());
			return reval;
		}).nodeify(cb);
	}
}
