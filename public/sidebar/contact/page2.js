import { SidebarPage } from '../base.js';

class ContactPage extends SidebarPage {

	static id = 'contact';

	#users;
	#filter;

	get title() { return 'chat'; }

	get filter() { return this.#filter; }
	set filter(v) { this.#filter = v; }

	constructor(id='sidebar-contact') {
		super(ContactPage.id, id);

		// const toolbar = this.container.querySelector('div.toolbar');
		// const user = toolbar.querySelector('h4');

		// user.innerText = window.app.user.email;

		app.on('chatmsg', e => this.#onMessage(e.detail));
		app.on('contactadd', e => this.add('contact', e.detail));
		app.on('roomadd', e => this.add('room', e.detail));
		app.on('status', e => this.#updateStatus(e.detail));
		app.on('hangup', e => this.#onHangup(e.detail));
	}

	reload() {
		//console.log('CONTACTS: reloading');
		//this.list.update();
	}

	async load(settings) {

		//super.load(settings);

		//console.log('## LOADING CONTACTS');

		await this.loadContacts();
		await this.loadRooms();

		const opt = {
			name: 'user',
			title: 'Users',
			visible: 100,
			badge: true,
			hide: true,
			item: 'sidebar-user-item',
			cmd: 'open-user-contact',
			
		}; 

		const g = this.addGroup(opt);

		this.#users = g;
	}

	async loadContacts() {
		//console.log('SB: load contacts');

		const opt = {
			title: 'friends',
			name: 'contact',
			visible: 8,
			badge: true,
			draggable: true,
			item: 'sidebar-contact-item',
			cmd: 'open-contact-contact',
			actions: [ {
				name: 'add',
				icon: 'add',
				cmd: 'find-contact'
			}]
		}; 

		// const opt = {
		// 	add: true,
		// 	addTitle: 'Add contact',
		// 	draggable: true,
		// 	dataType: 'contact'
		// };

		const ds = app.ds('contact');

		const group = this.addGroup(opt);
		const all = await ds.ls();
		const contacts = all.filter(i => !i.remote);
		const recent = app.recent.chat;

		contacts.sort((a, b) => {
			const i = recent.findIndex(i => i.user == a.id);
			const j = recent.findIndex(i => i.user == b.id);

			if (i > -1) a.short = recent[i].short;
			if (j > -1) b.short = recent[j].short;

			return (i >>> 0) - (j >>> 0);
		});

		// console.log(contacts);

		for (const c of contacts) {

			if (app.isme(c.id)) continue;

			c.uri = c.uri || c.email;
			group.add(c);
		}

		this.contacts = group;

		// this.#addFakeContacts();
	}

	async loadRooms() {

		const opt = {
			name: 'room',
			visible: 8,
			badge: true,
			draggable: true,
			cmd: 'open-room-contact',
			item: 'sidebar-room-item',
			actions: [ {
				name: 'add',
				icon: 'add',
				cmd: 'add-new-room'
			}]
		}; 

		const group = this.addGroup(opt);
		const ds = app.ds('room');

		await group.load(ds, compareName);

		this.channels = group;
	}

	add(action, info) {

		console.log('Sidebar (contact): adding', action, info);

				
		switch (action) {

			case 'contact': {

				const id = info.id;
				const e = this.contacts.getElement(id);

				if (!e)
					this.contacts.add(info, true);

				this.#users.delete(id);
			}
			break;

			case 'room': {
				// const id = `${info.name}@${info.namespace}`.hashCode();
				const id = info.id;
				const uri = `chat-${id}@ftalk.net`;

				console.log('SIDEBAR: adding room:', info);

				const e = this.channels.getElement(id);
				if (!e)
				 	this.channels.add({ ...info, uri }, true);
			}
			break;
		}
	}

	onClick(id, e, group) {

		let c = e.querySelector('[data-count]');
		if (c) 
			c.dataset.count = 0;

		c = e.querySelector('[data-missed]');
		if (c) 
			c.dataset.missed = 0;
	}

	async #onMessage(data) {
		// console.log('Sidebar onMessage:', data);

		if (data._type == 'confirm') 
			return;

		

		const id = data.room ? data.room.id : data.user.id;
		const e = this.getElement(id);

		if (!e) {

			if (data.room) {
				data.id = data.room.id;
				data.display = data.room.name;

				this.channels.add(data, true);
			}
			else {

				this.#users.add(data);
				console.error('Sidebar contact. URI not found:', id);
			}

			return;
		}
		
		// const isChannel = data.channel ? true : false;
		const msg = data.shortHTML;

		let status = msg;

		if (data.room) {
			const photo = data.own ? app.avatar : (data.user.photo||app.defaultRoom);
			updatePhoto(e, photo);
		}

		updateStatus(e, status, data.own, data.ts);

		dom.moveTop(e);
		dom.highlightElement(e);
	}

	#updateStatus(info) {

		const container = this.contacts.getItem(info.id);

		if (container) {
			dom.updateValues(container, info);
			dom.highlightElement(container);
		}

	}

	#onHangup({ user, missed }) {

		if (!missed) return;

		const groups = [ this.contacts, this.#users ];
		let e;

		for (const g of groups) {
			e = g.getItem(user);

			if (e) {
				if (!e.hasAttribute('selected')) {
					const c = e.querySelector('[data-missed]');
					const n = parseInt(c.dataset.missed);
		
					c.dataset.missed = n + 1;
				}

				break;
			}
		}

	}

	static defaultSettings() {
		return { 
			contact: {
				visible: 10
				, order: []
			},
		};
	}	
}

function compareName(a, b) {
	var nameA = a.name; // ignore upper and lowercase
	var nameB = b.name; // ignore upper and lowercase

	if (nameA < nameB) return -1;
	if (nameA > nameB) return 1;

	// names must be equal
	return 0;
}

function compareUsername(a, b) {
	var nameA = a.username; // ignore upper and lowercase
	var nameB = b.username; // ignore upper and lowercase

	if (nameA < nameB) return -1;
	if (nameA > nameB) return 1;

	// names must be equal
	return 0;
}

function updateStatus(e, html, own, ts=Date.seconds()) {

	if (!own) {
		if (!e.hasAttribute('selected')) {
			const c = e.querySelector('[data-count]');
			const n = parseInt(c.dataset.count);

			c.dataset.count = n + 1;
		}
	}

	const tm = e.querySelector('time');
	tm.dataset.time = ts;
	tm.innerText = Date.secondsElapsed(ts);

	const status = e.querySelector('.msg');
	status.innerHTML = html;
}



function updatePhoto(container, url) {
	const img = container.querySelector('.avatar');
	img.src = url;
}


export default ContactPage;