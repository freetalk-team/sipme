
import { List } from '../../common/list2.js';
import { Header } from '../common.js';
import { Sidebar } from './sidebar.js';

import { GameView } from './view.js';

const kHeader = ['editor-header-avatar-grid', 'game-editor-toolbar', null, /*'game-editor-stat'*/];
//const kEditor = 'game-editor-backgammon';
const kEditor = 'editor-scrollable';


export class GameEditor extends UX.ListPageController {

	static id = 'game';

	#history;
	#sidebar;
	#game;
	#home;
	#user;
	#id;

	get sidebar() { return this.#sidebar; }

	set id(id) {
		this.#id = id;

		if (id)
			this.container.dataset.id = id;
		else
			delete this.container.dataset.id;
	}

	constructor(container) {
		if (!container) {
			container = dom.renderTemplate('editor-base-sidebar', {}, 'div', kHeader, kEditor, Sidebar.getTabs());

			container.id = 'game-editor';
		}

		super(container);

		const editor = this.editorElement;
		const history = List.createMixin(editor.querySelector('.history'), 'li');

		const sidebar = new Sidebar(this.sidebarElement);
		sidebar.toggle();

		this.#sidebar = sidebar;

		this.#home = new HomePage(this.area);
		this.#game = new GamePage(this.area, sidebar);
		//const o = new ResizeObserver(e => this.#handleResize(e[0].contentRect));
		//o.observe(editor);

		this.addPage('home', this.#home);
		this.addPage('game', this.#game);

		// app.registerGameHandler(e => this.#game.onMove(e.detail));
		//app.on('gamemsg', e => this.#handleMessage(e.detail));

		app.on('gamemove', e => this.#handleMove(e.detail));
		app.on('gameover', e => this.#handleGameOver(e.detail));
	}
	
	async open(action, type, user, params) {

		const header = new Header(this.headerElement);

		if (action == 'over') {

			const user = params;

			this.#sidebar.onOver(type, user);

			action = 'home';
		}


		if (action == 'home') {
			//header.avatar = user.photo;
			

			const info = await app.ds('game').get(type);

			header.title = 'Game';
			header.desc = 'Home page';
			header.mode = 'new';

			const icon = header.icon;
			icon.id = info.icon;
			icon.color = info.iconcolor;

			this.id = null;

			this.switchTo('home');

			return this.#home.open(info);
		}

		if (typeof user == 'string')
			user = await app.loadContact(user);

		const id = `${user.id}@${type}`;

		if (this.current == 'game' && id == this.#id) {

			// reseting current game
			if (params) {
				this.#game.open(type, user.id, params);
			}

			return;
		}

		this.switchTo('game');

		//let user;

		// if (typeof params == 'string') {
		// 	user = params;
		// 	params = null;
		// }
		// else {
		// 	user = params.opponent || params.user;
		// }

		
		header.avatar = user.photo || app.defaultAvatar;
		header.title = user.name;
		header.desc = type;
		header.mode = 'game';

		this.#user = user;
		this.id = id;

		return this.#game.open(type, user.id, params);
	}

	switchTo(id) {
		if (id == 'game') {
			this.area.classList.add('max-height');
		}
		else {
			this.area.classList.remove('max-height');
		}

		super.switchTo(id);
	}

	onAction(name) {

		//const p = this.getCurrentPage();
		//if (!p) return;

		switch (name) {
			

			case 'chat':
			app.openEditor('contact', 'chat', this.#user.id);
			break;

			case 'call':
			app.openEditor('video', 'call', this.#user.id, { audio: true, video: false });
			break;

			case 'reload':
			this.#game.reload();
			break;

			default:
			this.currentPage.onAction(name, this.#user);
			break;
		}

		

	}

	#handleMove(move) {

		if (move.id != this.#id) {
			// not current
			return;
		}

		this.#game.onMove(move);



	}

	#handleGameOver(msg) {

		const { id, type } = msg;
		
		this.#sidebar.onOver(msg);

		if (id == this.#id) {
			this.open('home', type);
		}

	}

	// onEditorAction(...args) {
	// 	const p = this.getCurrentPage();
	// 	p.onAction(...args);
	// }

	
}

class HomePage extends UX.Page {

	constructor (container) {
		const e = dom.createElement('div', 'w3-container', 'hidden');
		super(e);

		container.appendChild(e);
	}

	async open(info) {

		let e;

		this.removeChilds();

		const md = toMarkdown(info);
		info.md = md;

		e = dom.renderTemplate('editor-game-info', info);
		this.appendChild(e);

		const ds = app.ds('games');
		const val = [info.id, Number.MAX_SAFE_INTEGER];

		// const recent = await ds.lsByIndex('recent', val, true);
		const recent = await ds.lsByRange('recent', null, val, true);

		// note: Potential problem with FB ids because of '-'
		e = dom.renderTemplate('editor-game-recent', recent, 'div', [info.id]);
		this.appendChild(e);
	}
}

class GamePage extends UX.Page {

	#view;
	#sidebar;
	#stat;

	get uri() { return this.#view.uri; }
	get info() { return this.#view.info; }

	constructor(container, sidebar) {
		const e = dom.renderTemplate('editor-game-base');
		super(e);

		container.appendChild(e);

		const s = e.querySelector('[role="stat"]');
		if (s) this.#stat = new Stat(s);

		this.#view = new GameView(e);
		this.#sidebar = sidebar;
	}

	async open(...args) {
		try {
			await this.#view.load(...args);
		}
		catch (e) {
			app.openEditor('game', 'home', ...args);
		}
	}

	reload() {
		this.#view.reload();

	}

	async onMove(msg) {

		if (!msg.own)
			await this.#view.handleMove(msg);

		if (this.#stat) {

			const { stat } = msg;

			this.#stat.stat = { 
				score: [ stat.score.win, stat.score.loss ], 
				total: [ stat.total.win, stat.total.loss ], 
				game: [ stat.win, stat.loss ] 
			};
		}
	}
}

class Stat {

	#container;

	constructor(container) {
		this.#container = container;
	}

	set score(s) {
		this.#score('score', s);
	}

	set stat(stat) {
		for (const [label, s] of Object.entries(stat)) {
			this.#score(label, s);
		}
	}

	#score(label, s) {
		const e = this.#container.querySelector(`[role="${label}"]`);
		const c = e.querySelectorAll('[data-count]');

		c[0].dataset.count = s[0];
		c[1].dataset.count = s[1];
	}
}

function toMarkdown(info) {

	const name = info.name || info.id;

	return `
# ${name.capitalizeFirstLetter()}

|  |  |
|--|--|
|**Author**|*${info.user.name}*|
|**Type**|*${info.type}*|

${info.desc||info.description}
`;
}

/*

<span class="fa-stack">
   <i class="fa fa-square-o" style="position:absolute;left:0;bottom:-12%;font-size:1.7em"></i>
   <i class="fa fa-square fa-inverse" style="position:absolute;right:0;top:-6%;font-size:1.7em"></i>
   <i class="fa fa-external-link-square" style="position:absolute;right:0;top:-6%;font-size:1.7em"></i>
</span>

*/