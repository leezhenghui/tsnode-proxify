export class Hello {

	private LOG_PREFIX: string = '[logger] ';

	constructor() {}

	greet(name: string): string {
		console.log(this.LOG_PREFIX + '<request> ' + '; [input]: "' + name + '"; [timestamp]: ' + new Date().getTime());
		console.log('[Hello.greet]    ==> I am saying hello to', name);
		let reval: string  = 'Hello, ' + name;	
		console.log(this.LOG_PREFIX + '<response> ' + '; [output]: "' + reval + '"; [timestamp]: ' + new Date().getTime());
		return reval;
	}
}
