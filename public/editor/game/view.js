
import { EditorBase as CanvasPage } from './canvas.js';

const kGameStat = {
	total: [0, 0],
	game: [0, 0]
};

export class GameView extends CanvasPage {

	#games = new Map;
	#current;
	#user;
	#id;

	get gid() { return `${this.#id}-${this.#user}`; }
	get uri() { return `${this.#id}@${this.#user}`; }
	get info() { return this.#current ? {
			score: this.#current.current,
			stat: this.#current.stat,
			//status:this.#current
		} : null;
	}

	get id() { return this.#current.id; }

	constructor (container) {

		const e = dom.createElement('div', 'preview', 'fade', 'fit', 'noverflow', 'max-height');
		super (e);

		container.appendChild(e);

		this.registerHandlers();
	}

	async load(id, user, params) {

		this.#current = await app.game.load(user, id, params);
		this.handleResize(this.viewport);
	}

	#render() {

		const { game, state } = this.#current;

		game.render(state, this.ctx);
	}
	
	async reload() {

		await app.game.reload(this.id);
		
		this.#render();
	}
	
	
	async handleMove() {
		this.#render();
	}


	async resign(user) {

		const game = this.#current;

		await app.db.update('games', this.uri, { last :undefined, state: undefined });

		game.reset();
		game.render(this);
	}

	updateSize(height) {
		this.container.style.height = `${height - 10}px`;
	}

	handleClick(pos) {

		if (this.#current) {
			const isover = this.#current.game.onclick(this.#current.state, pos, this.ctx);

			if (isover)
				this.#handleOver();	
		}
	}

	handleResize(vport) {
		console.debug('Preview on viewport change', vport);

		if (this.#current) {

			const r = this.#current.game.ratio;

			let w = vport.width;
			let h = Math.floor(w * r);
			
			if (h > vport.height) {
				h = vport.height;
				w = Math.floor(h * (1/r));
			}

			this.width = w;
			this.height = h;
			
			this.#render();
		}
	}

	async update(game) {

		
	}

	#handleOver() {
		const user = this.#user;
		this.#user = null;

		app.openEditor('game', 'over', this.#id, user);
	}

	
}

AddEditor.preview('game', GameView);

