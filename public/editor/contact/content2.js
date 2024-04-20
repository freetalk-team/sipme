

import { getDate, getTime, uploadLocalFiles, kImage } from './common.js';
import { renderLinks } from '../common.js';

const kDestroyTimeout = 5 * 60; // 10 min
const kSendTimeout = 3000; // ms



class ContentPage extends UX.Page {

	#info;
	#y = 1;
	// #offset = -1;
	#offset = Date.seconds();
	#top;
	#current;
	#today;
	#last;
	#more = true;
	#loading = false;
	#tomorrow = Date.tomorrowSeconds();
	#sender = new Sender;
	#destroy;
	#uploads = new Map;

	get groupTemplate() { return 'editor-contact-chat-message'; }

	constructor (info, parent) {
		const container = dom.createElement('div', 'show-empty', 'fit', 'container-col', 'reverse');
		container.dataset.type = info.id;

		parent.append(container);

		super(container);

		this.#info = info;
	}

	get id() { return this.#info.id; }
	get uri() { return this.id; }
	get username() { return this.#info.username; }
	get name() { return this.#info.display || this.#info.name; }
	get email() { return this.#info.email; }
	get photo() { return this.#info.photo || app.defaultAvatar; }
	get info() { return this.#info; }
	get status() { return this.#info.desc || this.#info.email; }

	get offset() { return this.#offset; }
	get more() { return this.#more; }
	get isChannel() { return false; }
	// get timeout() { return this.#timeout; }

	set y(v) { this.#y = v; }
	get y() { return this.#y; }

	// needed for ListMixin
	get area() { return this.container; }

	get loading() { return this.#loading; }
	set loading(b) {
		this.toggleLoading();
		this.#loading = b;
	}

	load() { 
		return this.loadHistory(); 
	}

	show() {
		if (this.#destroy) {
			this.#destroy.cancel();
			this.#destroy = null;
		}

		super.show();
	}

	hide(editor) {
		this.#destroy = app.runner.setTimeout(kDestroyTimeout, () => editor.destroyContent(this));
		super.hide();
	}

	clearChat() {
		this.clearContent();
	}

	onDestroy() {
		console.debug('Chat content: on destroy:', this.id);

		this.removeSelf();
	}

	async loadHistory() {
		if (!this.#more || this.loading) return;
		
		console.log('### Loading history:', this.#offset);

		this.loading = true;

		const [data, more] = await delayResolve(app.db.getHistory(this.id, this.#offset), 1200);

		this.#more = more;

		if (data.length > 0) {

			const latest = data[0].ts;
			const last = data[data.length - 1].ts;

			this.#offset = last;

			if (!this.#top || !this.#top.matchTimestapm(last))
				this.#top = this.#addGroup(last);

			// todo: local timestamp
			if (!this.#today && Date.today() < latest) 
				this.#today = this.#top;

			for (const i of data) {

				i.user = await app.loadContact(this.isChannel ? i.user : i.uid);

				if (typeof i.msg == 'string')
					i.text = i.msg;

				if (!this.#top.matchTimestapm(i.ts))
					this.#top = this.#addGroup(i.ts);

				this.#top.add(i);
			}

		}

		this.loading = false;
	}

	async loadHistoryOld() {

		if (!this.#more || this.loading) return;

		console.log('### Loading history:', this.#offset);

		this.loading = true;

		const r = await delayResolve(app.db.getHistory(this.id, this.#offset), 1200);

		if (!r) {
			this.#more = false;
		}
		else {

			this.#offset++;

			const [data, recent] = r;
			
			if (this.#offset == 0 && !recent)
				this.#offset++;

			let g, tommorow = 0;
			
			for (const i of data) {

				if (!g || i.ts >= tommorow) {
					g = this.#addGroup(i.ts, recent);
					tommorow = Date.dayStartSeconds(i.ts, 1);
				}

				i.time = getTime(i.ts);

				if (i.own) {
					i.name = 'you';
					// i.avatar = app.avatar;
				}
				else {

					if (!i.name && i.user) {
						await app.loadContact(i);
					}

					i.name = i.name || this.name;

					if (this.isChannel) {
						i.avatar = i.photo || app.defaultAvatar;
						i.user = { name: i.name, photo: i.avatar };
					}
				}

				if (typeof i.msg == 'string') {

					const shares = [];

					i.msg = i.msg.replace(/(contact|channel|room|article|news|task):\/\/(.*)/, (m, type, id) => {

						if (!isNaN(id))	
							id = parseInt(id);

						shares.push([type, id]);
						return `**${type.capitalizeFirstLetter()} share**`;
					});

					i.text = i.msg;
					delete i.id;

					const m = g.add(i);

					for (const [type, id] of shares) {
						const ds = app.ds(type);
						const info = await ds.get(id);

						if (info) {
							const template = `${type}-share`;
							const e = dom.renderTemplate(template, info);

							m.appendChild(e);
						}
					}

					continue;
				}

				if (i._type)
					await this.#addMessage(i, g);
			}

			if (recent) {

				const last = data[data.length - 1];
				const ts = Date.dayStartSeconds();

				if (last.ts > ts)
					this.#today = g;
			}
		}

		this.loading = false;
		

		// // console.log('##', typeof this.id);
		// const [data, more] = await app.db.getHistory(this.id, this.offset);

		// const b = new Block(this, this.name);

		// await b.load(data);

		// this.#current = b;
	}

	onMessage(msg) {

	}

	onDateChange() {
		this.#today = null;
	}

	addMessage(msg) {
		//msg.ts = Date.now();
		//this.#current.addMessage(msg);

		

		// todo: handle array of messages

		msg.ts = msg.ts || Date.seconds();
		msg.time = getTime(msg.ts);

		if (!msg.name)
			msg.name = msg.own ? 'you' : this.name;

		if (!this.#today)
			this.#today = this.#addGroup();
		else if (msg.ts > this.#tomorrow) {
			this.#today = this.#addGroup();
			this.#tomorrow = Date.tomorrowSeconds();
		}

		let append = false;

		if (this.#last) {

			const last = this.#last.msg;

			if (msg.own == last.own && (msg.own || last.user.id == msg.user.id ) && msg.ts - last.ts < 90) 
				append = true;
		}

		let data = msg.text || msg.msg;

		if (data._type) {

			if (msg.own)
				msg.text = `**Share ${data._type}:** *${data.name}*`;
		}

		let container;

		if (append) {
			const e = dom.renderTemplate('editor-contact-chat-message-item', msg);

			container = this.#last.container;
			container.appendChild(e);
		}
		else {
			container = this.#today.add(msg, true, null, 'fade');

			this.onRenderMessage(msg, container);

			this.#last = { msg, container };
		}

		if (!msg.own && msg.text)
			renderLinks(container, msg.text);
	}

	// use to add 'seen' indicator
	onRenderMessage() {}

	async uploadFiles(files) {
		try {
			const e = await uploadLocalFiles(files);
			const name = files[0].name;

			const id = generatePushID(name);
			e.dataset.id = id;

			this.#uploads.set(id, files);

			this.appendChild(e, true);
		}
		catch (e) {
			console.error('Failed to upload files:', e);
		}
	}


	async sendFile(file) {
		const text = await fileX.readFile(file);
		// let msg = `##### ${file.name} - ${fileX.formatSize(file.size)}\n`;
		let msg = `##### ${file.name}\n`;

		// todo: use marked-highlight
		// msg += '```json\n' + text + '\n```';
		msg += '```\n' + text + '\n```';

		this.handleSendMessage(msg);
	}

	addImageFromFile(file) {
		this.#current.addImageFromFile(file);		
	}

	addAudioFromFile(file, meta) {
		console.log(meta);
	}

	addContact(info) {
		this.#current.addContact(info);
	}

	destroy() {
		dom.removeElement(this.container);
	}

	async sendImage(type, ids) {

		let data;

		if (type == 'torrent') {

			const files = [];
			for (const id of ids) {

				const item = await app.db.get('file', id);

				files.push(item.file);
			}


			const torrent = await app.seed(files);
			const magnet = torrent.magnetURI;

			data = {
				type: 'torrent',
				info: {
					link: magnet
					, files
				}
			};

			console.log('Uploading torrent', torrent);
		}

		try {

			await this.sendMessage(data);

		}
		catch (e) {
			console.error('Failed to send torrent link', e);
		}

	}

	handleSendMessage(msg) {

		const m = typeof msg == 'string' 
			? { text: dom.escapeTags(msg) }
			: { msg }
			;

		m.own = true;

		this.#sender.send(msg, this);

		this.addMessage(m);
	} 

	onAction(name, e) {

		const id = e.dataset.id;

		switch (name) {

			case 'cancel': {

				console.debug('Cancel upload:', id);

				dom.removeElement(e);

				this.#uploads.delete(id);
			}
			
			break;

			case 'submit':
			this.#onUpload(id, e);
			break;
		}
	}

	sendMessage(msg) {

		// saving only plain messages ?
		let save = false;

		if (typeof msg == 'string') {
			msg = msg.trim();
			save = true;
		}

		// const to = this.username || this.id;
		const to = this.id;

		return app.sendMessage(to, msg, true);
	}

	#addGroup(date, top=false) {

		if (!date) {
			date = new Date;
			top = true;
		}
		else if (typeof date == 'number') {
			date = Date.fromSeconds(date);
		}

		const opt = {
			id: date.getTime(),
			item: this.groupTemplate,
			title: getDate(date),
			titlestyles: 'bold text-center',
			header: 'small watermark-8 w3-padding-small',
			content: 'cc reverse m5 w3-container',
			hide: true,
			actions: [ { name: 'remove', cmd: 'chat-remove-history' } ]
		};

		const g = this.addGroup(opt, top);
		const ts = Date.today(date);
		
		g.area.dataset.id = ts;
		g.startTimestamp = ts;

		// console.debug('Chat group start time:', ts, new Date(ts*1000));

		g.matchTimestapm = function(ts) {
			// console.debug('Chat group:', ts);
			return ts >= this.startTimestamp;
		}

		return g;
	}

	async #addMessage(msg, group=this.#today) {

		msg.time = getTime(msg.ts);

		let container;

		if (msg.own) {

			msg.msg = `<span><b>Share ${msg._type}:</b>' <i>${msg.info.name}</i></span>`;
			container = group.add(msg, false);
		}
		else {
			let info = msg.info;

			const templates = [];
			if (msg.type)
				templates.push(`${msg.type}-share`);

			switch (msg.type) {

				case 'article': {

					if (typeof info == 'string' && info.startsWith('/')) {
						info = await app.loadContent(info);
					}

					//template = 'channel-feed';
					info.time = new Date(info.ts*1000);

					if (!info.logo) {
						const url = new URL(info.link);
						info.logo = url.origin + '/favicon.ico';
					}

					if (!info.short) {
						info.short = info.title;
					}
				}
				break;

				case 'task':
				if (msg.md)
					info.md = msg.md;
				break;
				
			}

			container = group.add(msg, false, templates);
		}

		this.#last = { msg, container };
	}

	async #onUpload(id, e) {

		const files = this.#uploads.get(id);
		this.#uploads.delete(id);

		const actions = e.querySelector('[actions]');
		dom.removeElement(actions);

		const options = e.querySelector('[options]');
		dom.removeElement(options);

		const selected = options.querySelector('input[name="type"]:checked');
		const type = selected.value;
		// todo: Check type & Google Drive

		const items = e.querySelector('[files]');
		const checks = e.querySelectorAll('input[type="checkbox"]');
		for (const i of checks)
			i.disabled = true;

		const uploaded = [];

		// start monitor progress
		for (const i of files) {
			const id = i.name.hashCode();
			const ext = fileX.getExtension(i.name);

			const e = items.querySelector(`[data-id="${id}"]`);

			const check = e.querySelector('input[type="checkbox"]');
			// dom.removeElement(check);
			if (!check.checked)
				continue; 

			const progress = e.querySelector('progress');
			dom.showElement(progress);

			let promise;

			switch (type) {

				case 'drive:':
				promise = app.google.upload(i);
				break;

				case 'google':
				promise = app.google.uploadPhoto(i);
				break;

				case 'firebase':
				promise = app.firebase.uploadFile('uploads', i, ext);
				break;
			}


			const url = await delayResolve(promise, 1200);
			console.debug('Uploaded URL:', url);

			i.link = url;

			dom.removeElement(progress);
			//const img = await app.firebase.uploadImage();
			//app.firebase

			uploaded.push(i);
		}

		dom.removeElement(e);

		if (uploaded.length > 0) {
			let md = toMarkdown(uploaded, 'files');
			this.handleSendMessage(md);
		}
	}

}

Object.assign(ContentPage.prototype, UX.ListMixin);

export class ContactContent extends ContentPage {

	#key;

	get key() { return this.#key; }
	get status() { 
		const info = this.info;
		return info.status || info.email; 
	}

	get type() { return 'contact'; }

	addMessage(msg) {
	
		if (!msg.own) {
			const seen = this.container.querySelectorAll('[state="new"]');
			for (const i of seen)
				i.setAttribute('state', 'sent');

			if (msg._type == 'confirm')
				return;
		}

		super.addMessage(msg);
	}

	onRenderMessage(msg, container) {
		if (msg.own)
			container.setAttribute('state', 'new');
	}

	// load(editor) {

	// 	const { title, ns, avatar, call } = editor.head;

	// 	title.innerText = this.name;
	// 	ns.innerText = this.status;
	// 	avatar.src = this.photo;
	// 	call.disabled = this.isChannel;

	// 	return super.load();
	// } 

	async loadKey() {
		if (this.key) return this.#key;

		this.#key = await app.loadUserKey(this.id);

		return this.#key;
	}
}

export class ChannelContent extends ContactContent {

	//get id() { return String(this.info.id); }
	get topic() { return this.info.topic; }
	get status() { return this.topic; }
	get isChannel() { return true; }
	get type() { return 'room'; }

	get groupTemplate() { return 'editor-contact-room-message'; }

	// get uri() { return this.info.name; }

	addMessage(msg) {
		if (!msg.own) 
			msg.avatar = msg.photo || app.avatar;

		super.addMessage(msg);
	}

	destroy() {
		super.destroy();
		app.leaveRoom(this.id).then(() => {}, error => {});
	}

	sendMessage(msg) { 

		if (typeof msg == 'string') {
			msg = msg.trim();
		}



		return app.sendRoomMessage(this.uri, msg, true);
	} 
}

class Sender {
	#timeout;
	#text = '';

	send(msg, content) {

		if (typeof msg != 'string') {
			content.sendMessage(msg);
			return;
		}

		if (!this.#timeout) {

			this.#timeout = setTimeout(() => {

				const m = this.#text;

				this.#text = '';
				this.#timeout = null;

				content.sendMessage(m);

			}, kSendTimeout);

		}

		this.#text += msg + '\n';
	}
}

async function loadLocalImages(files) {

	if ( !(Array.isArray(files) || files instanceof NodeList) )
		files = [ files ];

	// console.log('Loading local files:', files.length);

	for (const i of files) {

		const id = Number(i.dataset.file);

		const item = await app.db.get('file', id);
		const img = await loadImage(item.file, kImage.maxWidth);

		i.classList.remove('loading');
		i.classList.add('image');

		i.src = img.src;
		i.width = img.width;
		i.height = img.height;
	}
}

