import { Sidebar as SidebarBase } from '../sidebar.js';

export class Sidebar extends SidebarBase {

	static getTabs() {
		return [
			{ name: 'active', icon: 'fa-user-friends watermark-6' },
			{ name: 'recent', icon: 'fa-list alt watermark-6' }
		];
	}

	get tabs() {
		return Sidebar.getTabs().map(i => i.name.toLowerCase());
	}

	#active;
	#invites;
	#recent;
	#loaded = false;

	constructor(container) {
		super(container, 'sidebar-game' );
	}

	toggle() {

		const show = super.toggle();

		if (show && !this.#loaded) 
			return this.#load();
	}

	onClick(id, e, target) {

		if (target.tagName == 'BUTTON') {

			switch (target.name) {
				
			}

		}

	}

	update(move) {

		console.debug('Game siebar update', move);

	}

	onMove(msg, current, info) {

		if (!this.#loaded)
			return;

		let e;

		const id = `${msg.id}@${msg.user}`;

		if (msg.isover) {
			this.#active.delete(id);

			e = this.#addRecent(msg, true);
		}
		else {

			if (msg.invite) {

				if (!msg.own && id != current) {
					e = this.#invites.getElement(id);
					if (!e)
						e = this.#invites.add(msg, true);
				}
			}
			else {
				this.#invites.delete(id);

				let isnew = true;

				e = this.#active.getElement(id);
				if (e) {
					dom.moveTop(e);

					if (id == current) {
						e.removeAttribute('new');
						isnew = false;
					}
				}
				else {
					e = this.#active.add(msg, true);
				}

				if (!msg.own && isnew)
					e.setAttribute('new', '');
			}
		}

		dom.highlightElement(e);
	}

	onOver(msg) {
		if (!this.#loaded)
			return;

		this.#active.delete(msg.id);
		this.#addRecent(msg, true);
	}

	async #load() {

		this.#loaded = true;
		this.loadTabs();

		const opt = {
			badge: true,
			content: 'w3-padding-tiny'
		};

		let p = this.getPage('recent');
		this.#recent = p.addGroup({ item: 'sidebar-game-recent-item', template: null });

		p = this.getPage('active');

		this.#active = p.addGroup({...opt,
			name: 'active',
			icon: 'fac-play-recent',
			empty: true,
			item: 'sidebar-game-active',
			cmd: 'game-open-user'
		});

		this.#invites = p.addGroup({...opt,
			name: 'invites',
			icon: 'fa-clock w3-color-green',
			hide: true,
			item: 'sidebar-game-invite',
			cmd: 'game-open-user'
		});


		const games = await app.db.ls('games');

		await app.loadContacts(games);


		const recent = [];

		for (const i of games) {
			if (i.invite) {
				this.#invites.add(i);
			}
			else if (i.state) {
				this.#active.add(i);
			}
			else {
				recent.push(i);
			}
		}

		recent.sort((a,b) => b.ts - a.ts);

		for (const i of recent)
			this.#addRecent(i);

	}

	#addRecent(msg, top=false) {

		let e = this.#recent.getElement(msg.id);

		if (e) {
			if (top) dom.moveTop(e);
		}
		else {
			e = this.#recent.add(msg, top);
		}

		return e;
	}

} 
