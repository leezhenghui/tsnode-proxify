import {Request, Response, NextFunction} from "express";
import { QoSedHello } from '../services/helloQoSed';
import { Hello } from '../services/hello';

export class Routes { 

	private qosedhello: QoSedHello = new QoSedHello();

	private hello: Hello = new Hello();

	public routes(app): void {   
		const self: Routes = this;

		app.route('/').get((req: Request, res: Response) => {            
			res.status(200).send({
				message: 'Benchmark Test Server'
			});
		});

		app.route('/hello/:name').get((req: Request, res: Response) => {
			const name = req.params.name;

			if ('ibm' === name) {
				res.status(200).send({
					message: self.qosedhello.greet(name)
				});
			} else {
				res.status(200).send({
					message: self.hello.greet(name) 
				});
			}
		});
	}
}
