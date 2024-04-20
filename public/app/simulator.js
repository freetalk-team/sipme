

const SimulatorMixin = {
	async getServiceConfig(id) {

		switch (id) {

			case 'tcapd': {

				if (this.tcapd.config) return this.tcapd.config;

				const r = await ajax.get('/api/tcapd/config');
				console.log('APP: TCAPD config =>', r);

				this.tcapd.config = r;
				return r;
			}
			break;

			
		}

		return {};

	}

	, async getServiceState(id) {

		switch (id) {


			case 'tcapd': 
			//return sendRequest('/api/tcapd/state');
			return { state: 'stopped' };

			case 'hlr':
			case 'air':
			return { state: 'stopped' };

			case 'menu':
			return { state: 'running' };
		}

		throw new Error('APP: Unable to get service state: ', id);
	}

	, async startService(id) {

		console.log('Starting service:', id);

		switch (id) {

			case 'tcapd': {

				const r = await ajax.post('/api/tcapd');

				console.log('APP: Start service =>', r);

				return r;
			}
			break;
		}
	}

	, async stopService(id) {
		console.log('Stopping service:', id);

		switch (id) {

			case 'tcapd': {

				await deleteRequest('/api/tcapd');
			}
			break;
		}
	}

	, sendUssdRequest(req) {
		//console.log('Sending USSD request:', req);
		return ajax.post('/api/ussd/request', req);
	}

	, async sendHuxRequest(req) {
		//console.log('Sending HuX request:', req);

		const [service,] = parseUssd(req.ussd);
		const id = this.routes.get(service);

		if (!id) {
			console.error('No routing found for:', service);
			return {
				last: true
				, output: `Service '${service}' not exists !`
			};
		}

		req.id = id;
		req.rev = 1; // todo: fix

		const res = await ajax.post(`/api/menu/exec/${id}/${req.rev}`, req);

		//console.log('HuX response', res);

		return {
			last: !res.respond
			, output: res.render
			, redirect: res.redirect
		};
	}

	, async addRoute(code, id) {
		this.routes.set(code, id);

		await ajax.post('/api/menu/route', {code, id });	

		console.log('APP: Route added:', code, '=>', id);

	}

	, async removeRoute(code) {
		this.routes.delete(code);

		console.log('Sending DELETE request:', code);
		await ajax.delete(`/api/menu/route/${code}`);
	}
}

export {
	SimulatorMixin
}