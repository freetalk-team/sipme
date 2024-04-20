
import { EditorBase } from './base.js';

export class RadioPage extends EditorBase {

	static id = 'radio';

	pages = new Map;

	#ws;

	#tracks;
	#recent;
	#queue;
	
	#chat;
	#id;

	constructor(container) {

		super(container, RadioPage.id); 

		const e = dom.renderTemplate('editor-player-radio', { 
			name: 'Nula'
			, desc: 'Classic jazz, soul'
			, code: 777
		});

		this.#chat = UX.List.createMixin(e.querySelector('[role="chat"]'));

		this.container.appendChild(e);

		this.addPage('main', new UX.Page(e));
		this.switchTo('main');

		app.on('radiomsg', e => this.#onMessage(e.detail));
	}

	async open(id) {

		if (this.#id == id) return;

		this.#id = id;
		this.toggleLoading();

		console.debug('Open radio:', id);

		const p = this.switchTo('main');

		p.removeChilds();

		const ds = app.ds('radio');
		const info = await delayResolve(ds.get(id), 1200);

		this.toggleLoading();
		
		p.addTemplate('editor-player-radio', info);

		// todo: load playlist
	}

	load() {
	}

	onTabChange(tab, old) {

		let p = this.switchTo(tab);
		if (!p) {

			switch (tab) {

				case 'player':
				p = this.#createPlayerPage();
				break;

			}

			this.addPage(tab, p);
			this.switchTo(tab);
		}

	}

	onAction(...args) {
		this.onEditorAction(...args);
	}

	onEditorAction(action, item, target) {
		switch (action) {
			
			case 'send': 
			this.#handleSend(target);
			break;
		}
	}

	onKeyPress(target, key) {
		if (key == 'Enter') {
			this.#handleSend(target);
		}

	}

	#handleSend(e) {
		const text = e.inputValue;
		this.#send(text);

		// e.disabled = true;
		// setTimeout(() => e.disabled = false, 100 * 1000);
	}

	#send(text) {
		console.debug('Radio editor chat:', text);

		const data = {
			name: 'Alice Freeman',
			own: true,
			msg: text
		}

		this.#chat.addItemTemplate('editor-contact-chat-message', data, true);

		app.sendRoomMessage('radio', text, false);
	}

	#createPlayerPage() {
		const e = dom.renderTemplate('editor-player-remote');
		this.container.appendChild(e);

		const tracks = e.querySelector('[role="tracks"]');
		const recent = e.querySelector('[role="playlist"]');

		this.#tracks = UX.List.createMixin(tracks);

		const list  = UX.List.createMixin(recent);

		this.#queue = list.addGroup({ name: 'next', badge: 'true', hidable: true, count: true });
		// this.#recent = list.addGroup({ name: 'Recent', badge: 'true', hidable: true });

		this.#loadAdmin();

		return new UX.Page(e);
	}

	#onMessage(m) {
		//console.debug('Radio page message received');

		m.avatar = m.avatar || m.photo || '/ui/svg/contact.svg';

		this.#chat.addItemTemplate('editor-contact-chat-message', m, true);
	}

	async #loadAdmin() {

		if (this.#ws) return;

		const kServer = `ws://${location.host}:9084`;

		console.log('HOST:', kServer);
		const connection = new WebSocket(kServer);

		connection.onopen = (e) => {
			console.debug('WS RADIO CONNECTION: connected');

			connection.send(JSON.stringify({ method: 'ls' }));
			connection.send(JSON.stringify({ method: 'bind' }));
		}

		connection.onmessage = (e) => {
			const message = e.data;
			const msg = message;

			const m = JSON.parse(msg);
			console.debug('MSG received:', m);

			const { method, ...data } = m;

			if (method == 'ls') {

				for (const i of data.tracks) {

					console.debug('TRACK:', i);

					this.#tracks.addItemTemplate('edior-player-track-item-file', i);
				}
			}
			else {

				switch (method) { 
					case 'queue': {
						const e = this.#queue.addTemplate('editor-player-sidebar-queue-item', data);
						e.dataset.id = data.id;
					}
					break;

					case 'onchange': {
						const id = data.id;
						const e = this.#queue.getElement(id);

						if (e) {
							dom.removeElement(e);
						}

					}
					break;
				}

			}
		}

		connection.onclose = () => {
			console.log('RADIO socket remote close');
			//setTimeout(() => this.startPushClient(), 5000);

			this.#ws = null;
		}

		connection.onerror = (e) => {
			console.error('PUSH socket error', e);

			this.#ws = null;
		}

		this.#ws = connection;

		
	}

	

	

}

Object.assign(RadioPage.prototype, UX.PageControllerMixin);

