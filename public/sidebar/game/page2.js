import { SidebarPage } from '../base.js';

export default class GamePage extends SidebarPage {

	static id = 'game';

	#own;
	#invite;
	#active;

	get showAdd() { return true; }
	get showSearch() { return true; }

	constructor(id='sidebar-game') {
		super(GamePage.id, id);

		app.on('gameadd', e => this.#own.add(e.detail, true));
		app.on('gamemsg', e => this.#onMessage(e.detail))
		app.on('gameover', e => this.#onOver(e.detail))
	}

	async load(settings) {

		const opt = {
			name: 'invites',
			visible: 100,
			badge: true,
			item: 'sidebar-game-invite-item',
			hide: true,
			cmd: 'game-open-user'
		};

		const invite = this.addGroup(opt);

		opt.name = 'active';

		const active = this.addGroup(opt);
		const ds = app.ds('games');

		const games = await ds.ls();
		games.sortTimestamp();

		// const invites = games.filter(i => i.invite);

		for (const i of games) {

			if (i.invite)
				invite.add(i);
			else if (i.state && !i.own)
				active.add(i);
		}

		this.#invite = invite;
		this.#active = active;

		//console.log('## LOADING CONTACTS');

		return this.#load();
	}

	async #load() {
		console.log('SB: load games');

		//await this.#loadGames();

		const opt = {
			visible: 100,
			badge: true,
			item: 'sidebar-base-item',
			cmd: 'open-home-game'
		}; 

		const common = {
			add: 'game-invite-user'
		};

		const all = { board: [
			{ id: 'backgammon'} 
		]};

		// for (const i of Object.values(GameService.games)) {
		// 	all[i.type].push(i);
		// }

		for (const [type, games] of Object.entries(all)) {

			opt.name = type;

			const g = this.addGroup(opt);

			for (let { id, icon } of games) {
				if (!icon)
					icon = id;

				g.add({ id, icon, ...common });
			} 
		}


	}

	async #loadGames(user=app.uid) {
		const opt = {
			name: 'own',
			badge: true,
			hide: true,
			item: 'sidebar-base-item',
			cmd: 'edit-own-game'
		};

		const g = this.addGroup(opt);
		const ds = app.ds('game');

		// todo: use user as index
		const games = await ds.ls();
		for (const i of games) {
			if (app.sudo || user == i.user)
				g.add(i);
		}

		this.#own = g;
	}
	
	#onMessage(m) {

		const id = m.id;

		let e = this.#invite.getItem(id);

		if (m.own) {
			
			dom.removeElement(e);

			e = this.#active.getItem(id);
			if (e) {
				//dom.moveTop(e);
				dom.removeElement(e);
			}

		}
		else if (m.invite) {

			if (!e)
				this.#invite.add(m, true);

		}
		else {

			e = this.#active.add(m, true);
			dom.highlightElement(e);
		}

	}

	#onOver({ id }) {
		const e = this.#active.getItem(id);
		dom.removeElement(e);
	}
}

