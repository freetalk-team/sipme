
import { Fields as CommonFields } from '../settings/fields.js';
import { ContactPage } from "./page2.js";
import { DataSourceFilter } from "../../app/ds.js";

App.Editor.register(ContactPage);

App.Commands.register('chat-clear-history', async (id, data) => {

	console.debug('Deleting chat history:', id);

	try {

		await app.db.rmByIndex('chat', 'uid', id);
		await app.db.rmByIndex('history', 'uid', id);
	}
	catch (e) {
		console.error('Failed to delete history');
	}

});

App.Commands.register('chat-add-contact', async (id) => {
	app.add('contact', id);
});

App.Commands.register('chat-invite-users', async (room) => {

	let members = [];

	const data = await app.ds('room').local.get(room);
	if (data && data.members)
		members = data.members;

	members.push(app.uid);

	const users = new Set(members);
	const ds = app.ds('contact');

	const params = {

		title: 'Users',
		desc: 'Invite users',
		// ds: 'user',
		ds: new DataSourceFilter(ds, (i) => !users.has(i.id)),
		result: 'find-contact-item',
		mode: 'ls',
		type: 'select',
		force: true

		, ondone: async (added) => {

			console.debug('Adding new users', room, added);
			const users = added.map(i => i.id);

			if (users.length == 0) return;

			try {


				await app.db.pushValue('room', room, 'members', users);
				await app.sendRoomInvite(room, users);

				app.emit('memberadd', { room, users });
			}
			catch (e) {
				console.error('Failed to update room members', e);
			}

		}
	};

	app.openEditor('find', 'contact', params);

});

App.Commands.register('add-new-room', () => {

	const params = {
		icon: 'fa-user-friends',
		desc: 'Create new room and invite users',

		async onAdd(data) {

			// const ds = app.ds('room');

			const uid = app.uid;

			data.id = generatePushID(data.name);
			data.ts = Date.seconds();
			data.user = uid;
			data.members = [uid];

			try {

				await app.add('room', data, 'new'); 

				app.openEditor('contact', 'room', data);
			}
			catch (e) {
				console.error('Failed to create room');
			}

		}
	};

	app.openEditor('add', 'new', 'room', params);
});

App.Commands.register('import-gmail-contacts', async () => {

	try {

		const contacts = await app.google.contacts();
		const users = [];

		if (contacts.length > 0) {

			const ts = Date.seconds();
			const ds = app.ds('email');

			let user;

			for (const i of contacts) {

				user = await ds.get(i.email);
				if (user) {

					if (user.type == 'contact') 
						continue;

					i.ts = ts;
					i.status = user.status;
					i.user = user;

					
				}
				else {

					i.id = i.email.hashHex();

					user = { ...i };

					i.ts = ts;
					i.type = 'gmail';
					i.remote = true;

					await ds.put(i);

					Object.assign(i, { user, status: 'not invited' });

				}

				users.push(i);
			}

			if (users.length > 0)
				app.emit('useradd', users);

		}
	}
	catch (e) {
		console.error('Failed to import Gmail contact:', e);
	}

});

const kRoomFields = [
	{ ...CommonFields.name, placeholder: 'room name' }
	// , CommonFields.ns
	// , CommonFields.radio({
	// 	name: 'access'
	// 	, title: 'Access'
	// 	, options: ['Public', 'Private']
	// })
	, CommonFields.string({
		name: 'topic'
		, title: 'Topic'
	})
];

AddEditor.register('room', kRoomFields);

export { ContactPage }
