
export const CommandMixin = {

	async executeCommand(cmd, action, type, ...args) {

		const p = cmd.split('-');
		if (p.length > 1) {
			cmd = p.shift();

			const a = [];

			if (action) {
				// a.push(action);

				if (type) 
					// a.push(type);
					args.unshift(type);

				type = action;
			}

			action = p.shift();

			if (p.length > 0) {
				if (type)
					args.unshift(type);

				type = p.shift();
			}

			args.unshift(...p);
		}

		const c = [cmd, action, type].filter(i => !!i).join('-');

		if (this.handleCommand(c, ...args))
			return;

		if (cmd == 'edit' || (cmd == 'add' && action == 'new')) {

			let id, edit = false;

			// kind of hack
			if (cmd == 'edit') {
				id = type;
				type = action;
				action = 'update';
				edit = true;
			}

			const params = {};
			let data;

			if (type == 'profile') {
				params.info = {
					name: app.displayName,
					status: app.status,
					photo: app.avatar
				}
			}
			else if (args.length > 0) {
				data = args[0];
				if (typeof data == 'string')
					id = data;
			}

			if (id) {
				let ds = app.ds(type);
				if (ds) {
					data = await ds.get(id);

					if (edit) {
						switch (type) {

							case 'scraper':
							if (!data.code) {
								
								ds = app.ds('code');
								if (ds) {
									console.debug('Pulling code from database');

									try {

										const info = await ds.get(id);
										const content = info.content;

										data.code = typeof content == 'string' ? content : unzip(content);
									} catch (e) {
										console.error('Scraper code not exists:', id);
									}
								}
							}
							break;
						}
					}
				}
			}

			if (data)
				params.info = data;

			Object.assign(params, {
				async onAdd(data) { 

					if (id) 
						data.id = id;

					if (cmd == 'add') {

						switch (type) {

							case 'task':
							data.ts = Date.seconds();
						}
					}
					
					data.user = app.uid || 'admin';

					await app.add(type, data, action); 
					
					if (data.id) {

						switch (type) {

							// case 'scraper':
							// app.executeCommand('find', 'edit', 'scraper');
							// break;

							case 'task':
							return app.openEditor('support', 'task', data.id, true);

							default:
							// app.openEditor(type, data.id);
							app.cancelEditor();
							break;
						}
					}
				}

				// , onPreview(editor, code) {

				// 	switch (type) {
				// 		case 'game': 
				// 		return onGamePreview(editor, code);
				// 	}

				// }
			});

			if (edit) {
				params.reload = true;
				return this.openEditor('add', 'edit', type, params);
			}

			return this.openEditor(cmd, action, type, params);
		}

		let id = args.pop();

		switch (cmd) {


			case 'share':
			return this.share(type, id, ...args);

			case 'find': 
			return this.find(type);

			case 'add': 
			return this.add(type, id);

			case 'join':
			id = type;
			type = action;
			console.debug('Joining', type, '=>', id);
			return this.add(type, id, 'import');

			case 'help': {
				console.log('Openning help editor');

				switch (type) {

					case 'editor': {
						const e = this.editor.currentEditor;
						if (e) {
							const type = e.type;
							return this.openEditor('wiki', 'wiki', type);
						}
					}
					break;
				}
			}
			return;

			case 'task':
			return this.openEditor('support', 'task', type);

			case 'player':

			switch (action) {
				case 'file':
				return this.player.playFile(type);

				case 'radio':
				return this.player.playRadio(id, type);
			}

			case 'import': {

				const from = this.ds(action);
				const to = this.ds(type);

				if (action == 'torrent' && id.startsWith('magnet:')) {
					const { hash } = parseMagnetURI(id);

					id = hash;
				}

				const convert = dataConverter(action, type);

				let data = await from.get(id);
				data = convert(data);

				await to.put(data);

				app.emit(`${type}add`, data);
			}
			return;

			// case 'comment':
			// break;

			case 'rm': {
				id = id || type;
				type = action;

				const ds = this.ds(type);
				await ds.rm(id);

				app.emit(`${type}rm`, id);
			}
			return;


			case 'purge': {

				id = type;
				type = action;

				const ds = this.ds(type);
				await ds.purge(id);

				app.emit(`${type}rm`, id);
			}
			return;

			case 'pin': {
				const data = await app.ds(type).get(id);
				if (data) {
					const { id, channel, content, ts, user } = data;
					this.add('pin', { id, channel, content, ts, user, type });
				}
			}
			return; 



			case 'select': 

			switch (action) {
				case 'channel': 

				switch (type) {

					case 'scraper': {

						const path = `data/scraper/${id}/scrapers`;
						const scrapers = await app.firebase.ls(path) || {};

						console.debug('Scrapers for channel', id, scrapers);
						
						const params = {
							icon: 'fa-scissors',
							title: 'Edit scrapers',
							desc: 'Add or remove channel scrapers',
							ds : 'scraper',
							type: 'select',
							force: true,

							isselected: (info) => !!scrapers[info.id],

							ondone: async (scrapers) => {
								
								console.log('Channel scrapers:', scrapers);

								// const data = {};
								// for (const i of scrapers) {
								// 	data[i.id] = { domain: i.domain.hashCode(), type: i.type, region: i.region }
								// }

								// await app.firebase.set(path, data);

								const req = { channel: id, scrapers: scrapers.map(i => i.id) };

								try {

									await ajax.post('/channel/scrapers', req);

									console.debug('Scrapers updated successfully');
									// todo: show notification
								}
								catch (e) {
									console.error('Failed to update scrapers');
								}
							}
						};

						app.openEditor('find', 'scraper', params);
					}
					break;

					case 'admin': {

						const params = {

							title: this.name,
							desc: 'Add or remove channel admin users',
							ds: 'contact',
							type: 'select',
							force: true,
							isselected: (info) => !!this.admins && this.admins[info.id],
		
							ondone: async (users) => {
								console.log('Channel permision change', users);
		
								if (this.admins) {
		
									// const current = Object.keys(this.admins);
									// const r = diffArrays(this.current, users);
									// console.log('DIFF results', r);
								}
		
								try {
									
									const admins = {};
									for (const i of users) admins[i] = true;
		
									await app.db.update('channel', this.channel, { admins });
									await app.firebase.update(this.adminPath, admins);
		
									this.admins = admins;
								}
								catch (e) {
									console.error('Failed to updates channel admins', e);
								}
							}
						};
		
						app.openEditor('find', 'channel-admin', params);
					}
					break;

					default:
					console.error('CMD: Invalid select channel:', type);
					break;;
				}
				break;

				default:
				console.error('CMD: Invalid select:', action);
				break;
			}
			return;

			case 'follow': 
			
			switch (action) {

				case 'channel':
				console.log('CMD: Subcribing for channel:', id);
				app.subscribe(id);
				break;

			}
			break;

			case 'open': 
			return this.openEditor(type, action, ...args, id);
				
		}
	}

}

function dataConverter(from, to) {

	const noconvert = (data) => data; 

	switch (from) {

		case 'torrent': {

			switch (to) {

				case 'playlist':
				return (data) => Object({
					id: data.id,
					genre: data.genre || 'pop',
					display: data.title,
					name: data.title.toLowerCase(),
					tracks: data.files,
					torrent: data.uri,
				});
			}

		}
		break;
	}

	return noconvert;
}