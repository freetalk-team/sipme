
import { AppBase } from './base.js';
import kData from '../test/firebase/chat.json' assert {type: 'json'};

import { UserMixin } from './user.js';

class Firebase {

	#data = kData;

	async load() {

		//this.#data = await import('../test/firebase/chat.json', assert {type: 'json'});
	}

	ls(path) {
		const [,, channel, post] = path.slice(1).split('/');

		const data = this.#data[channel];
		if (data) 
			return data[post];
	}

	lseq(path, child, value) {

		console.log('FAKE FIREBASE:', path, child, value);

		const [,, channel, post] = path.slice(1).split('/');

		console.log('CHANNEL', channel, post);

		let data = this.#data[channel];
		if (!data) {
			console.error('Channel not found', channel);
			return null;
		}

		data = data[post];
		if (!data) {
			console.error('Post not found:', channel, '=>', post);
			return null;
		}

		const r = [];
		for (const [k, v] of Object.entries(data)) {

			if (v[child] != value)	
				delete data[k];
		}

		return data;
	}

	push(path, data) {

	}
}

const kAlice = {
	user: 'HBe5aAHRbxsISan0axoII5nxqkdP',
	photo: 'http://127.0.0.1:9076/v0/b/emma-messenger.appspot.com/o/photo%2FHBe5aAHRbxsISan0axoII5nxqkdP.png?alt=media&token=9cc7df24-8262-4a3f-ac1e-71cdbb617772',
	email: 'alice@gmail.com'
};

export class TestApp extends AppBase { 

	#counter = 0;
	#onevent = {};

	#peers = new Map;
	#lastmsg;

	get displayName() { return 'Alice Freeman'; }
	get uid() { return 'wuZEDLTE1ChC4Y0ESQiQjl9K2lwx'; }
	get avatar() { return `${location.origin}:9076/v0/b/emma-messenger.appspot.com/o/photo%2F${this.uid}?alt=media&token=815dcbce-fe32-4a76-aef2-9aac1cb29367`; }
	get email() { return 'pavelp.work@gmail.com'; }
	get sudo() { return true; }

	isme(user) { return user == this.uid; }

	memberOf() { return true; }

	async load() {

		console.log('LOCATION', location);

		await super.load();

		//await this.sidebar.open('channel');
		//await this.editor.open('contact', 'contact', Alice.user);
		// await this.editor.open('add', 'new', 'user', AddParams);

		// await this.sidebar.open('player');
		// await this.editor.open('contact', 'contact', Alice.user);

		// await this.sidebar.open('channel');
		// await this.editor.open('channel', 'open', '2464123941'); // todo: check why is a string

		this.switchTo('app');

		this.firebase = new Firebase;
		await this.firebase.load();

		//this.#startSending();
		const recent = await this.loadRecent();

		await app.loadContacts(recent.chat);
		await app.loadContacts(recent.game);

		//this.openEditor('player', 'files');
		// app.openEditor('game', 'new', 'backgammon', {});
		app.openEditor('home');
		// app.openEditor('profile');
		
		// for testing PUSH notifications
		this.startPushClient();
	}

	sendMessage(user, msg) {
		console.log('MOCK APP: sending message', user, msg);

		if (msg.type == 'game') {

			const m = [ 
				{
					roll: [6, 6],
					move: ['p13/p7', 'p13/p7', 'p13/p7', 'p13/p7'],
					type: 'backgammon',
				}, 
				{
					roll: [1, 2],
					move: ['p24/p23', 'p24/p22'],
					type: 'backgammon',
				},
				{
					roll: [1, 2],
					move: ['p23/p21', 'p22/p21'],
					type: 'backgammon',
				}
			];

			Object.assign(msg, {
				name: this.displayName,
				photo: this.avatar,
				own: true,
			});

			this.emit('gamemsg', msg);

			setTimeout(() => {

				console.log('Sending fake backgammon move');

				const data = this.#buildGameMessage(m[this.#counter++], kAlice);
				this.emit('gamemsg', data);

			}, 3000);

			return;
		}

		const m = typeof msg == 'string' ? { msg } : { ...msg };
		this.emit('chatmsg', { user, own: true, ...m });

		if (typeof msg != 'string') return;

		this.#lastmsg = msg;

		let peer = this.#peers.get(user);
		if (!peer) {

			return;
			console.log('MOCK APP: start echoing');

			peer = setInterval(() => {

				const msg = `**echo:** ${this.#lastmsg}`;
				const res = { user, msg, own: false, name: 'Alice Freeman' };

				this.emit('chatmsg', res);

			}, 20000 + Math.floor(Math.random() * 40000));

			this.#peers.set(user, peer);
		}

		// this.#addToHistory(to, text, true);
	}

	sendFile(to, msg) {
		this.#addToHistory(to, msg, true);
	}

	addContact(contact) {
		console.log('Adding new contact', contact);
	}

	joinRoom(id) {
		console.log('Joining to room', id);
	}

	leaveRoom() {}

	async onIncomingCall(from) {

		console.log('Icomming call:', from);

		const contact = await this.loadContact(from);
		this.openEditor('video', 'incomingcall', contact);

		this.emit('call', contact);
	}

	answer() {}
	hangup() {
		if (this.editor.current == 'video')
			this.editor.back();

		this.emit('callend');
	}

	#addToHistory(id, text, own) {
		const data = {
			uid: id
			, msg: text
			, own
			, ts: Date.now()
		};

		this.contacts.addHistory(data);
	}

	#buildGameMessage(msg, user) {

		const m = { type: 'game', msg, own: false };

		if (!user)
			user = {
				user: this.uid,
				name: this.displayName,
				photo: this.avatar,
				own: true,
			};


		return Object.assign(m, user);
	}

	#startSending() {
		setInterval(() => {
			const cbs = this.#onevent['chatmsg'];
			if (!cbs) return;
		
			const m = { ...Alice, own: false, ...messages[this.#counter++ % messages.length] };
			const e = { detail: m }

			for (const i of cbs)
				i(e);
		}, 20000);
	}
}

Object.assign(TestApp.prototype, UserMixin);