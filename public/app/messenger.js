import { Messenger } from '../messenger2.js';

const kLeaveRoomTimeout = 10*60;
const kConfirmTimeout = 30;
const kUpdateTimestampTimeout = 2 * 60; // 2 min

const MessengerMixin = {

	recentUpdaters: new Map,

	startMessenger(unregister=true) {
		
		const messenger = new Messenger(!this.sudo && unregister);

		//this.messenger.connectFirebase();

		// const [user,] = this.user.email.split('@');
		// const id = `sip:${user}@ftalk.net`;
		// const name = this.user.displayName;

		//const id = `sip:"${name}"${user}@ftalk.net`;
		messenger.addAccount(this.sipUri, this.displayName);

		this.messenger = messenger;
		this._.pushed = [];
		this._confirm = new Map;
		this._caller;
		this._video;
		// this._.transactions = new LimitedCache({
		// 	//maxCacheSize: 100,

		// 	// !!! Must be at least equal to the value in Kamailio
		// 	maxCacheTime: 120000, 
		// });

		// Add event listeners for answer and reject buttons
		document.getElementById('answer-btn').addEventListener('click', function () {
			// Handle answer call
			hideNotification();
			app.answer();
		});
	
		document.getElementById('reject-btn').addEventListener('click', function () {
			// Handle reject call
			hideNotification();
			app.hangup();
		});
	}

	, inCall() { return !this.messenger.canCall; }

	, isInternalRoom(id) {
		return ['support'].includes(id);
	}

	, onStarted() {
		// if (app.memberOf('support'))
		// 	this.joinRoom('support');

		// if (this.sudo)
		// 	this.joinRoom('notify');

		this.publish();
	}

	, publish() {
		// todo: add user prefs
		if (Config.sip.publish) {

			const info = { 
				name: app.displayName,
				note: app.status || 'No status',
			};

			if (app.photo)
				info.photo = encodeURIComponent(app.photo);

			this.messenger.publish(info, 'presence');
		}
	}

	, async sendMessage(id, msg, save=false, push=true) {

		const task = this._confirm.get(id);
		if (task) {
			task.cancel();
			this._confirm.delete(id);
		}

		const data = buildMessage(msg);

		try {

			// if (/^chat-/.test(id) ) {
			// 	await this.sendRoomMessage(id, data, save);
			// 	return;
			// }

			await this.messenger.sendMessage(id, data, push);

			const ts = Date.seconds();

			const content = typeof msg == 'string' ? msg : { ...msg };
			const m = { ts, own: true, msg };

			m.user = await this.loadContact(id);

			switch (msg._type) {

				case 'seed':
				case 'push':
				case 'comment':
				return;

				case 'game':

				m.id = `${id}@${msg.id}`;
				m.type = msg.id;

				this.emit('gamemsg', m);

				return;

			}

			[ m.short, m.shortHTML ] = buildShort(msg, true);

			let updater = this.recentUpdaters.get(id); 
			if (!updater) 
				updater = new Updater(this.recentUpdaters, id, app.ds('contact'));
			
			updater.update(m.short, ts);

			this.emit('chatmsg', m);
			this.addRecent('chat', m);

			if (save) {

				// contact, rooms and others shares we don't want to put these
				if (!msg._type) {

					const data = {
						uid: id
						, own: true
						, ts
						, msg: content
						, recent: 1
					};

					this.db.addHistory(data);
				}
			}
		}
		catch (e) {
			console.error('APP: Failed to send message', e);
			throw e;
		}

	}

	, async sendRoomMessage(id, msg, save=false) {

		const data = buildMessage(msg);
		const ts = data.ts || Date.seconds();
		const ds = this.ds('room');

		// const payload = JSON.stringify({
		// 	name: this.displayName
		// 	, avatar: this.avatar
		// 	, ts
		// 	, msg: data 
		// });

		// adding extra `space` because `#` is a room command

		//console.log('Sending room message', payload);

		//await this.joinRoom(id, false);

		// const push = {
		// 	name: app.displayName
		// };

		await this.messenger.sendRoomMessage(id, data, true);

		const m = { user: this.user, own: true, room: id };

		m.room = await ds.get(id);

		if (typeof msg == 'object')
			Object.assign(m, msg);
		else
			m.msg = msg;

		switch (m.type) {
			case 'seed':
			return;
		}

		[ m.short, m.shortHTML ] = buildShort(msg, true);

		let updater = this.recentUpdaters.get(id); 
		if (!updater) 
			updater = new Updater(this.recentUpdaters, id, ds);
		
		updater.update(m.short, ts);

		this.emit('chatmsg', m);
		this.addRecent('chat', m);

		if (save) {
			const data = {
				uid: id
				, msg
				, own: true
				, ts
				, user: this.uid
				, recent: 1
			};

			this.db.addHistory(data);
		}
	}

	, async sendRoomInvite(room, users) {
		const uris = users.map(i => this.messenger.getURI(i));
		const ds = app.ds('room');

		const info = await ds.get(room);

		info._type = 'info';

		await this.messenger.sendRoomCommand(room, 'invite', ...uris);
		await this.messenger.sendRoomMessage(room, info, false);
	}

	, subscribeUserPresence(id) {
		if (Config.sip.publish)
			return this.messenger.subscribe(id, 'presence');
	}

	, sendConfirm(id) {

		this._confirm.delete(id);

		const data = {
			_type: 'confirm'
		};

		console.debug('APP: Sending confirm');

		return this.messenger.sendMessage(id, data, false);
	}

	, async joinRoom(id, send=true) { 

		if (this.isInternalRoom(id))
			return;

		const ds = this.ds('room');

		if (ds) {
			const room = await ds.get(id);

			if (!room) {
				console.log('Room not exists');
				await ds.put({ id, join: true });
			}
			else {
				if (!room.join)
					await ds.update(id, { join: true });
			}
		}

		if (send)
			this.messenger.room(id, 'join'); 
	}

	, async leaveRoom(id) {

		if (this.isInternalRoom(id))
			return;
		
		const ds = this.ds('room');
		const room = await ds.get(id);

		if (room) 
			await ds.update(id, { join: false });

		return this.messenger.room(id, 'leave');
		
		// let room = rooms.get(id);

		// if (room) {
		// 	room.cancel();
		// }

		// room = this.runner.setTimeout(kLeaveRoomTimeout, () => {
		// 	console.debug('MESSNGER: leaving room =>', id);
		// 	this.messenger.room(id, 'leave');
		// });

		// rooms.set(id, room);
	}

	, onUnregister() {
		this._.pushed = [];
	}

	, async onMessage(info, msg, ispush=false) {

		if (msg._type == 'confirm') {
			console.debug('CONFIRM received:', info);
			this.emit('confirm', { ...info, ...msg });
			return;
		}

		const ts = info.ts || Date.now();
		// const tid = info.user.hashCode() ^ ts;
		const tid = info.tid;

		console.debug('### TID', tid, info.user, ts);

		// if (ispush) {
		// 	this._.pushed.unshift(tid);
		// }
		// else {
		// 	const found = this._.pushed.indexOf(tid);
		// 	if (found > -1) {
		// 		console.debug('Message already received with PUSH', info.user, tid);
		// 		this._.pushed.splice(found, 1);
		// 		return;
		// 	}
			
		// }

		// if (info.tag && this._.transactions.has(info.tag)) {
		// 	console.log('Skipping incomming message. Already received', info.tag);
		// 	return;
		// }

		if (msg == '') {
			console.error('Ingoring empty message!');
			return;
		}

		if (info.domain == Config.sip.internal) {
			return this.handleInternalMessage(info, msg);
		}

		// console.log('CACHE size:', this._.transactions.getAll());

		// this._.transactions.set(info.tag, true);

		// console.log('APP new message received:', info);

		const isroom = !!info.room;
		const uid = info.user;

		if (isroom) {

			const ds = this.ds('room');

			if (msg._type == 'info') {

				try {
					delete msg._type;
					await ds.update(info.room, msg, msg);
				}
				catch (e) {
					console.error('Failed to update room info', info.room);
				}

				return;
			}

			info.room = await ds.get(info.room);

			if (typeof info.user == 'string')
				info.user = await this.loadContact(info.user);
		}
		else if (!(info.name && info.photo)) {

			let contact;

			try {
				// contact = info.user.startsWith('chat-') 
				// 	? await this.loadRoom(info.user.slice(5))
				// 	: await this.loadContact(info.user);

				contact = await this.loadContact(info.user);
			}
			catch (e) {
				console.error('Cannot load contact information', info);
				return;
			}

			info.user = Object.assign({ photo: app.defaultAvatar }, contact);
		}

		let addToHistory = true;
		let addToRecent = true;
		let confirm = !(ispush || isroom);
		

		// console.log('APP on message:', info, msg);

		let content = typeof msg == 'string' ? msg : { ...msg } ;
		let m = { ...info, own: false, ts: Date.toSeconds(ts) };

		if (typeof msg == 'string') {
			m.text = msg;
		}
		else {

			let link = msg.link || msg.url;

			if (link) {

				// delete msg.link;

				if (link.startsWith('/')) {
					// todo: internal link
				}
				else {
					const url = new URL(link);

					const type = url.protocol.slice(0, -1);
					let id = url.host || url.pathname.slice(2);

					if (!isNaN(id))
						id = parseInt(id);

					msg._type = type;
					msg.id = id;

					for (const [k,v] of url.searchParams)
						msg[k] = v;

					const ds = this.ds(type);

					if (ds) {

						const data = await ds.get(id);

						if (data) {
							Object.assign(msg, data);
						}
					}
				}

				content = link;
			}

			m.msg = msg;

			if (msg.channel && typeof msg.channel == 'string')
				msg.channel = await this.loadChannel(msg.channel);

			if (msg.user && typeof msg.user == 'string')
				msg.user = await this.loadContact(msg.user);

			switch (msg._type) {

				case 'game': 
				// todo: add to hitory
				// todo: add to recent
				// todo: play notification ?
				m.id = `${m.user.id}@${msg.id}`;
				m.type = msg.id;
				m.invite = !!msg.params;

				this.handleGameMessage(m);
				this.emit('gamemsg', m);

				return;

				case 'room':
				await app.ds('room').update(msg.id, {}, { 
					name: msg.name, 
					topic: msg.topic,
					domain: msg.domain || Config.sip.domain
				});

				case 'contact':
				content = `${msg._type}://${msg.id}`;
				break;

				case 'comment': 
				confirm = false;
				addToHistory = false;
				break;

				case 'task':
				case 'wiki':
				confirm = false;
				break;

				default:
				addToHistory = false;
				break;
			}

			if (!m.md)
				m.md = toMarkdown(msg, msg._type);
		}

		this.messenger.playNotification();

		if (confirm) {
			// start confirm timeout
			const id = info.user.id;
			let task = this._confirm.get(id);

			if (!task) {
				task = this.runner.setTimeout(kConfirmTimeout, () => this.sendConfirm(id));
				this._confirm.set(id, task);
			}
		}

		if (addToHistory) {

			const data = {
				uid,
				own: false,
				msg: content,
				ts: m.ts,
				recent: 1
			};

			if (m.room) {
				data.uid = m.room.id;
				data.user = m.user.id;
			}

			// if (data.type == 'share') {
			// 	data.type = data.ctype;
			// 	delete data.ctype;
			// }

			this.db.addHistory(data);
		}
		
		// const [,domain] = uri.split('@');

		// console.log('#### BUILT MSG:', event);

		[ m.short, m.shortHTML ] = buildShort(msg, false);

		// switch (info.domain) {

		// 	case 'ftalk.eu': {
		// 		this.emit('channelmsg', m);
		// 	}
		// 	break;

		// 	case 'ftalk.app':
		// 	// todo: handle sys messages
		// 	break;

		// 	default: {

				

		// 		if (m.type == 'comment') {
		// 			await this.comments.onComment(m);
		// 		}
		// 		else {
		// 			if (m.room) {

		// 				// todo: fix it
		// 				if (m.room.startsWith('radio')) {
		// 					this.emit('radiomsg', m);
		// 				}
		// 			}
		// 			else {
		// 				this.emit('chatmsg', m);
		// 			}

		// 		}

		// 		if (addToRecent)
		// 			await this.addRecent(m.type == 'comment' ? 'comment' : 'chat', m);
		// 	}
		// 	break;
		// }

		
		switch (msg._type) {

			case 'comment':
			await this.comments.onComment(m);
			break;

			default:
			this.emit('chatmsg', m);
			break;
		}
	}

	, handleInternalMessage(from, msg) {

		switch (msg.type) {

			case 'task':
			// this.emit('taskupdate', msg);
			this.task.update(msg);
			break;

		}

		// this.emit(`${msg.type}msg`, msg);
	}

	, async onNotify(from, info) {

		console.debug('App on notify', from, info);

		if (info.photo)
			info.photo = decodeURIComponent(info.photo);

		info.status = info.note;
		delete info.note;

		try {

			const ds = this.ds('contact');

			await ds.update(from, info);

			info.id = from;

			this.emit('status', info);

		}
		catch (e) {
			console.error('Failed to update user status', e);
		}
	}

	, call(id, opt={ audio: true, video: 'dummy' }) {
		// const contact = await this.db.get('contact', id);

		if (this.messenger.canCall) {
			this.emit('call', { id });

			console.log('Calling contact', id);
			this.messenger.call(id, opt);
			// this.messenger.callTest(id, opt);

			this.openEditor('video', 'call', id, opt);
		}
	}

	, onIncomingCall(from) {

		console.log('Icomming call:', from);

		this.emit('call', { id: from });
		//this.openEditor('video', 'incomingcall', from);

		const user = from.uri.user
		this._caller = user;

		handleIncomingCall(user);
	}

	, onHangup(user, missed) {
		// if ()

		console.log('APP: On hangup');

		if (this.editor.current == 'video') {
			this.editor.cancel();
		}

		hideNotification();

		this.emit('hangup', { user, missed });

	}

	, onAnswer() {
		hideNotification();

		this.emit('answer');
	}

	, answer() {
		this.messenger.answer();
		this.openEditor('video', 'incall', this._caller);
	}

	, hangup() {
		try {
			this.messenger.hangup();
		}
		catch (e) {
			this.emit('hangup');
		}
	}


	// , onPush(m) {
	// 	console.log('APP: Push received');
	// 	this.messenger.register();
	// }

	, toggleCamera() {
		
		if (this._video) {
			this.messenger.stopVideo();
		} else {
			this.messenger.startVideo();
		}

		this._video = !this._video;
	}
}

App.Commands.register('send-chat-message', (msg, user, data) => {
	console.debug('Send user message ', user, msg);

	if (data && data.room)
		app.sendRoomMessage(user, msg, true);
	else
		app.sendMessage(user, msg, true);


});

function buildMessage(msg) {
	let data = msg;

	if (typeof msg == 'object') {

		switch (msg.type) {

			// just send the magnet link
			case 'torrent': {
				const message = { ...msg };
				const info = { ...msg.info };

				info.files = msg.info.files.map(i => Object({ name: i.name, type: i.type, size: i.size}));
				message.info = info;

				return message;

			}
			break;

			case 'comment': {
				// in case it wents as a PUSH add name & photo ?
				const { channel, id, gid, msg, ts, user, name, photo } = data;
				data = { channel, id, gid, msg, ts, user, name, photo };
			}
			break;
		}

		// if (!msg.ts)
		// 	msg.ts = Date.seconds();
	}

	return data;
}

function buildShort(msg, own) {

	let md;

	if (typeof msg == 'string') {
		md = msg.split('\n')
			.slice(0, 1)
			.map(i => i
				.replace(/^#{1,6}[ \t]+/, '')
				.replace(/```(.+?)```/sg, '***code***')
			)
			.join('\n')
			;
	}
	else {
		md = `**Share a ${msg._type}**`;
	}

	if (own)
		md = '*you:* ' + md;

	const html = dom.escapeTags(md)
		.replace(/\*\*(.+?)\*\*/g, (m, t) => `<b>${t}</b>`)
		.replace(/\*(.+?)\*/g, (m, t) => `<i>${t}</i>`)
		.replaceAll('\n', '<br>')
		;

	return [ md, dom.renderEmojis(html) ];
}

function disableCallButtons(disable=true) {

	const buttons = document.querySelectorAll('button[name="call"]');
	for (const i of buttons)
		i.disabled = disable;

}

class Updater {

	#ts;
	#msg;

	constructor(updaters, id, ds) {

		updaters.set(id, this);

		app.runner.setTimeout(kUpdateTimestampTimeout, () => {

			updaters.delete(id);

			if (this.#msg)
				ds.update(id, { msg: this.#msg, ts: this.#ts });
		});

	}

	update(msg, ts=Date.seconds()) {
		this.#msg = msg;
		this.#ts = ts;
	}
}

export {
	MessengerMixin
}

function showNotification() {
    if (Notification.permission === 'granted') {
        var notification = new Notification('Incoming Call', {
            body: 'You have an incoming call...',
        });
        notification.onclick = function () {
            // Handle notification click event
            // For example, redirect to call screen or display the call UI
            // window.location.href = 'call.html';

			this.close();

			window.parent.focus();

			// const url = 'http://127.0.0.1:3000';

			// var existingTab = window.open(url);
            // if (existingTab) {
            //     existingTab.focus();
            // } else {
            //     // If the tab wasn't opened due to pop-up blocker or other reasons, open a new one
            //     window.open(url, '_blank');
            // }
        };
    }
}

// Example function to handle incoming call event
async function handleIncomingCall(from) {
    // Show notification when there's an incoming call
    showNotification();

	const user = await app.loadContact(from);

	const popup = document.getElementById('notification-popup');

	const name = popup.querySelector('.name');
	const avatar = popup.querySelector('.avatar');

	name.innerText = user.name;
	avatar.src = user.photo || app.defaultAvatar;

    // Show the notification popup
    dom.showElement(popup);

    
}

function hideNotification() {
	const popup = document.getElementById('notification-popup');

	dom.hideElement(popup);
}