
const kHeader = 'editor-welcome-header'
	, kEditor = ['editor-scrollable', 'editor-welcome-content']
	;

export class WelcomePage extends UX.ListPage {

	static id = 'welcome';

	#updater;
	#lastUpdateTime;
	#loaded = false;
	#tasks;
	#chat;
	#room;
	#comments;
	#game;
	#track;
	#news = {};
	#messages = [];

	constructor () {

		const container = dom.renderTemplate('editor-base', {}, 'div', kHeader, kEditor);
		super(container);

		let e, template;

		this.#tasks = this.wrapGroup('task');

		this.#chat = this.wrapGroup('chat');
		this.#room = this.wrapGroup('chat', 'editor-room-item');

		e = this.querySelector('[role="game"]');
		this.#game = this.wrapGroup(e);

		e = this.querySelector('[role="track"]');
		this.#track = this.wrapGroup(e);


		app.on('chatmsg', e => {

			const start = !this.#messages.length;

			this.#messages.push(e.detail);

			if (start)
				this.#onMessage(e.detail);
		});

		app.on('trackchange', e => this.#onTrackChange(e.detail));
		app.on('trackstop', e => this.#onTrackStop(e.detail));

		app.on('taskadd', e => this.#onTaskAdd(e.detail));
		// app.on('taskupdate', e => this.#onTaskUpdate(e.detail));
		
		app.on('gamemove', e => this.#onGameMove(e.detail));
		app.on('gameover', e => this.#onGameOver(e.detail));
	}

	async load() {
		console.debug('Welcome editor on load');

		let data;

		// app.task.load(this.#tasks);

		try {

			this.loadGroups();

			data = await app.game.load();

			for (const i of data) 
				this.#game.add(i);

		}
		catch (e) {
			console.error('Failed to load Welcome page', e);
		}
	
	}

	async open() {
		if (!this.#loaded) {
			this.#loaded = true;
			await this.load();
		}

	}

	async onClick(id, e, selected, group) {
		console.debug('Welcome page on click', id, group);

		switch (group) {
			case 'task':
			if (selected) {
				// Task.open(e);
			}
			break;
		}
	}


	#sendMessage(user, text, room=false) {
		console.log('WELCOME: sending message', text);

		if (typeof room == 'string')
			room = room == 'true';

		room ? app.sendRoomMessage(user, text) : app.sendMessage(user, text);
	}

	#onMessage() {

		let msg;

		while (msg = this.#messages.shift()) {

			console.log('Welcome mesage received', msg);

			const id = msg.room ? msg.room.id : msg.user.id;

			let e;

			e = this.#chat.getItem(id);
			if (e) {
				const m = e.querySelector('.msg');
				m.innerHTML = msg.shortHTML;

				const tm = e.querySelector('time');
				tm.dataset.time = Date.seconds();
				tm.innerText = 'now';
			}
			else {

				const g = msg.room ? this.#room : this.#chat;

				e = g.add(msg);
				e.classList.add('new');
			}

			this.#chat.moveTop(e, true);

			dom.highlightElement(e);

		}
	}

	#onGameMove(move) {

		const { id, own } = move;
		
		//const id = `${user}@${type}`;
		const e = this.#game.getItem(id);

		if (e) {
			if (own)
				dom.removeElement(e);
		}
		else if (!own) {
			this.#game.add(move);
		}

		
	}

	#onGameOver({ id }) {
		
		const e = this.#game.getItem(id);
		dom.removeElement(e);
	}


	// PLAYER stuff
	#onTrackChange(info) {

		console.debug('Welcome on track change', info.id);

		const g = this.#track;

		const current = g.getElementByClass('playing');
		if (current){
			if (current.dataset.id == info.id)
				return;

			current.classList.remove('playing');
		}

		let e = g.getElement(info.id);
		if (e) {
			// console.debug('# FOUND', e);
			g.moveTop(e);
		}
		else {
			// console.debug('# Adding new');
			e = g.add(info, true);
		}

		e.classList.add('playing');
	}

	#onTrackStop() {
		const g = this.#track;

		const current = g.getElementByClass('playing');
		if (current) {
			current.classList.remove('playing');
		}
	}

	#onTaskAdd(data) {
		this.#tasks.add(data, true, 'new');
	}


}

