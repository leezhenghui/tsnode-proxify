import { Request, Response, NextFunction } from "express";
import { QoSedHello } from '../services/helloQoSed';
import { Hello } from '../services/hello';
import * as Q from 'q';

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

		//===========================================================
		//              Non-proxify endpoint
		//===========================================================
		app.route('/sync/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			res.status(200).send({
				message: self.hello.greet(name) 
			});
		});
		
		app.route('/sync-callback/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			self.hello.greetCallback(name, function(error: Error, message: string) {
				res.status(200).send({
					message: message 
				});
			});
		});
		
		app.route('/async-callback/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			self.hello.greetAsyncCallback(name, function(error: Error, message: string) {
				res.status(200).send({
					message: message 
				});
			});
		});
		
		app.route('/async-promise/:name').get((req: Request, res: Response) => {
			const name = req.params.name;

			self.hello.greetAsyncPromise(name).then(function(message: string) {
				res.status(200).send({
					message: message 
				});
			});
		});
		
		//===========================================================
		//              Proxify endpoint
		//===========================================================
		app.route('/qos/sync/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			res.status(200).send({
				message: self.qosedhello.greet(name)
			});
		});
		
		app.route('/qos/sync-callback/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			self.qosedhello.greetCallback(name, function(error: Error, message: string) {
				res.status(200).send({
					message: message 
				});
			}.bind(self));
		});

		app.route('/qos/async-callback/:name').get((req: Request, res: Response) => {
			const name = req.params.name;
			self.qosedhello.greetAsyncCallback(name, function(error: Error, message: string) {
				res.status(200).send({
					message: message 
				});
			});
		});
		
		app.route('/qos/async-promise/:name').get((req: Request, res: Response) => {
			const name = req.params.name;

			self.qosedhello.greetAsyncPromise(name).then(function(message: string) {
				res.status(200).send({
					message: message 
				});
			});
		});

	}
}
