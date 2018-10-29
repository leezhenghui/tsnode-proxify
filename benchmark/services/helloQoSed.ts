import { 
	Component, 
	QoS,
	InteractionStyle,
	Completion, 
	Callback,
	Fault,
	Output,
	InteractionStyleType,
}                      from '../../dist/index'; 

import { Logger } from './qos/logger';


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
