
const AdminMixin = {
	async adminAdd(action, info) {

		console.log('ADMIN add:', action, info);

		switch (action) {

			case 'user': {

				// const id = info.email.hashCode();
				// const [name,ns] = info.email.split('@');

				// const req = {
				// 	//id
				// 	username: info.username
				// 	, name
				// 	, email: info.email
				// 	//, ns
				// 	, password: '123'
				// };

				// const res = await postRequest(`/www/user`, req);

				const res = await ajax.post(`/www/user`, info);

				console.log('APP: User added =>', info.email);
			}
			break;

			case 'channel': {

				//const id = `${info.name}@${info.namespace}`;

				console.log('APP: Channel adding =>', info);

				const res = await ajax.post(`/www/channel`, info);

				if (this.messenger.connected) {
					const name = info.name;

					await this.messenger.createChannel(name, info.access == 'private');

					// const r = await this.messenger.lsChannel(name);
					// console.log('####', r);
				}
				else {
					console.error('APP: SIP agent not connected', this.messenger.state);
				}

				console.log('APP: Channel added =>', info.name);
			}
			break;

			case 'scraper': {

				console.log('ADMIN adding scraper:', info);

				const res = await ajax.post(`/www/scraper`, info);

			}
			break;

		}
	}

	, async adminDelete(action, id) {

		console.log('APP: Admin delete,', action, id);

		switch (action) {
			case 'channel':
			await deleteRequest(`/www/channel/${id}`);
			break;
		}
	}

	, async adminService(service, action, id) {
		console.log('APP => Service:', service, action, id);

		switch (service) {
			case 'scraper':
			//await postRequest(`/scrap/ctl/${action}/${id}`);
			this.firebase.update('scraper', id, { state: action });
			break;
		
			default:
			console.error('APP admin: Unknown service =>', service);
			break;
		}
	}

	, async adminList(table, opt={}) {

		const params = Object.assign({ offset: 0, limit: 50 }, opt);

		let res;
		try {

			res = await ajax.post('/admin/ls/login', params);

		}
		catch (e) {
			console.log('Admin failed to get', table);
		}

		return res;
	}
}

export {
	AdminMixin
}