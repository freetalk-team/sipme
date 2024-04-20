
import { Header } from '../common.js';
import { Fields } from '../settings/fields.js';

const kHeader = ['editor-header-grid', 'editor-admin-actions']
	, kEditor = ['editor-scrollable', 'editor-admin-content']
	, kUser = 'editor-admin-user-item'
	, kRoom = 'editor-admin-room-item'
	;

const kModes = {

	user: {
		title: 'Users',
		desc: 'Invite, remove users and update permissions',
		icon: 'fa-user'
	},

	room: {
		title: 'Rooms',
		desc: 'Create, remove rooms',
		icon: 'fa-user-friends'
	}
}

export class AdminPage extends UX.ListPage {

	static id = 'admin';

	#updater;
	#lastUpdateTime;
	#loaded = false;
	#mode;
	#users;
	#rooms;

	get mode() { return this.container.getAttribute('mode'); }
	set mode(m) { this.container.setAttribute('mode', m); }

	constructor () {

		const container = dom.renderTemplate('editor-base', {}, 'div', kHeader, kEditor);
		super(container);

		let e;

		e = this.querySelector('[role="main"]');

		this.#users = this.wrapGroup(e, kUser);
		this.#rooms = this.wrapGroup(e, kRoom);
		
		app.on('memberadd', e => this.#addMembers(e.detail));
		app.on('useradd', e => this.#addUser(e.detail));
		app.on('roomadd', e => this.#addRoom(e.detail));
	}


	async open(mode) {

		console.debug('Admin editor open:', mode);

		const current = this.mode;
		if (current == mode) 
			return;

		this.mode = mode;

		const isRoom = mode == 'room';
		const g = isRoom ? this.#rooms : this.#users;

		g.clear();

		const info = kModes[mode];
		const header = new Header(this.headerElement);

		header.title = info.title;
		header.desc = info.desc;
		header.icon = info.icon;


		let ds, data, contacts;

		try {

			ds = app.ds(isRoom ? 'room' : 'contact');

			data = await ds.ls();

			if (isRoom) {

				for (const i of data) {

					if (i.members) {
						contacts = await app.loadContacts(i.members);
						i.members = Object.toArray(contacts);
					}
					else {
						i.members = [];
					}
				}
			}

			for (const i of data) 
				g.add(i);
		}
		catch (e) {
			console.error('Failed to load Admin page', e);
		}
	}

	onAction(action) {

		switch (action) {

			case 'add': 
			this.#onAdd();
			break;
		}

	}

	async onClick(id, e, selected, group) {
		console.debug('Admin page on click', id, group);

		switch (group) {


			
		}
	}

	async onElementClick(e) {
		console.debug('Admin page on click element');
	}

	async onEditorAction(action, e, target) {

		console.debug('Admin on action:', action);

		switch (action) {
			
		}
	}

	// onKeyPress(e, key) {
	// 	if (key == 'Enter') {

			
	// 	}
	// }


	#onAdd() {
		const mode = this.container.getAttribute('mode');


		switch (mode) {

			case 'user':
			app.executeCommand('invite-new-user');
			break;

			case 'room':
			app.executeCommand('create-new-room');
			break;

		}
	

	}

	#addMembers({ room, users }) {

		let e = this.#rooms.getItem(room);
		if (e) {
			
			const group =  e.querySelector('[role="members"]');
			const g = this.wrapGroup(group, 'editor-admin-room-member');

			for (const i of users) {

				e = g.getItem(i.id);
				if (e) continue;

				g.add(i, true, [room]);
			}
		}
	}

	#addUser(info) {
		this.#users.add(info, true);
	}

	#addRoom(info) {
		this.#rooms.add(info, true);
	}
}

AddEditor.register('user', {
	title: 'New user'
	, desc: 'Invite user to join'
	, icon: 'fa-user'
	, items: [ Fields.firstname, Fields.lastname, Fields.email ]
});