
import { AdminPage } from "./page.js";

App.Editor.register(AdminPage);

App.Commands.register('invite-new-user', () => {
	app.openEditor('add', 'new', 'user', {
		async onAdd(data) {
			console.debug('On new user', data);

			data.name = data.firstname + ' ' + data.lastname;
			data.id = data.id || data.email.hashHex();

			delete data.firstname;
			delete data.lastname;

			const ds = app.ds('user');

			try {
				await ds.put(data);

				app.emit('useradd', data);
			}
			catch (e) {
				console.error('Failed to add user', e);
			}

			app.executeCommand('open-user-admin');
		}
	});
});

App.Commands.register('create-new-room', () => {
	app.openEditor('add', 'new', 'room', {
		async onAdd(data) {
			console.debug('On new room', data);

			data.members = [];

			const ds = app.ds('room');

			try {
				await ds.put(data);

				app.emit('roomadd', data);
			}
			catch (e) {
				console.error('Failed to add room', e);
			}

			app.editor.cancel();
		}
	});
});

App.Commands.register('room-rm-user', async (room, id) => {

	console.debug('CMD: room rm user', id, room);

	try {

		await app.db.deleteValueByIndex('room', 'uid', parseInt(room), 'members', id);
		await ajax.delete(`/api/member/${room}/${id}`);

		// app.db.update('room', );

		// await ds.rm();
	}
	catch (e) {
		console.error('Failed to add user', e);
	}

});

App.Commands.register('room-add-user', async (room) => {

	room = parseInt(room);

	const { members } = await app.ds('room').local.getByIndex('uid', room);
	const ds = app.ds('user');

	const users = new Set(members);

	const params = {

		title: 'Users',
		desc: 'Invite users',
		// ds: 'user',
		ds: new DataSourceFilter(ds, (i) => !users.has(i.id)),
		result: 'find-contact-item',
		mode: 'ls',
		type: 'select',
		force: true

		, ondone: async (users) => {

			console.debug('Adding new users', room, users);

			try {

				const ids = users.map(i => i.id);

				await ajax.post(`/api/member/${room}`, ids);

				//const info = await 

				await app.db.pushValueByIndex('room', 'uid', room, 'members', ids);

				app.emit('memberadd', { room, users });
			}
			catch (e) {
				console.error('Failed to update room members', e);
			}

		}
	};

	app.openEditor('find', 'contact', params);
});

