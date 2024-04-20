
const kStat = { 
	win: 0, loss: 0, 
	score: { win: 0, loss: 0 }, 
	total: { win: 0, loss: 0 } 
};

const kGameStateDS = 'games';

export const GameMixin = {

	initGame() {

		this.game = {

			states: new Map,
			games: new Map, // game implementations

			async params(type) {
				let game = this.games.get(type);
		
				if (!game) {

					game = await Game.load(type);

					this.games.set(type, game);
				}

				return game.params;
				
			},

			async load(user, type, params) {

				if (!user) {
					const ds = app.dsFilter(kGameStateDS, i => !!i.state && !i.own);
					const data = await ds.ls();

					return data;
				}

				const uid = typeof user == 'string' ? user : user.id;

				this.current = await this.loadState(uid, type, params);

				return this.current;
			}

			, async loadState(user, type, params) {

				let id, uid = user;

				if (type) {
					id = `${user}@${type}`;
				} else {
					id = user;
					[ uid, type ] = user.split('@');
				}

				let game, state, stat, desc, invite = false, s = this.states.get(id);
		
				if (s) {
					if (params) {
						s.state = s.game.init(params);
						invite = params;
					}
				}
				
				else {
		
					game = this.games.get(type);
		
					if (!game) {

						game = await Game.load(type);

						this.games.set(type, game);
					}
		
					[ state, stat, invite ] = await loadGameState(id, game, params);

					s = { game, state, stat };
					
					this.states.set(id, s);
				} 

				if (!s.state) {

					if (!params) {
						console.error('GAME failed to execute move');
						throw new Error("GAME non-existing state without 'params'");
					}

					s.state = {};
				}
				
				game = s.game;
				state = s.state;
				stat = s.stat;

				// if (params) {
				// 	Object.assign(state,  game.init(params));
				// 	//state = game.init(params);
				// }

				return {
					uid,
					state,
					id,
					type,
					stat,
					game,
					invite
				};
			}

			, async reload(id) {

				const s = this.states.get(id);
				if (s) {
					s.game.reset(s.state, true);
				}

				// this.states.delete();


				// const ds = app.ds('games');
				// await ds.update(id, data);
			},

			async onmove(user, move) {

				const type = move.id;
				const { params } = move;

				console.debug('ON MOVE prams:', params);

				const uid = typeof user == 'string' ? user : user.id;
		
				let { id, game, state, stat } = await this.loadState(uid, type, params);

				if (!move.last) {
					// confirm message

				}
		
				const [isover, score ] = game.onmove(state, move.last);
				if (!move.last) {
					// confirm message
					return;
				}


				const own = false;
		
				const d = { own, params, stat: kStat, user: uid, type };
				const data = { own, state };
				// const desc = `${type},  `
		
				if (updateStat(stat, isover, score)) {

					data.stat = stat;
					data.own = false;

					if (isover) {
						data.state = undefined;
						data.last = undefined;

						data.ts = Date.seconds();
					}

					else {

						// confirm message
						// const m = {
						// 	_type: 'game',
						// 	id: type,
						// };

						// await app.sendMessage(uid, m);
					}
				}
		
				const ds = app.ds('games');
		
				await ds.update(id, data, d);

				return [{ id, user, type, own, stat, state, game }, isover];
		
			},

			async send(move, isover, score) {

				// if (!move) {
				// 	move = user;
				// 	user = this.user;
				// }

				const { id, state, uid, type, stat, game, invite } = this.current;

				const def = { id, stat: kStat, user: uid, type };
				const data = { last: move, state, own: true };

				if (updateStat(stat, isover, score)) {
					data.stat = stat;

					if (isover) {
						data.state = undefined;
						data.own = undefined;
						data.last = undefined;
						data.ts = Date.seconds();
					}
				}

				const ds = app.ds(kGameStateDS);

				await ds.update(id, data, def);

				const m = {
					_type: 'game',
					id: type,
					last: move
				};

				if (invite) {
					delete this.current.invite;

					m.params = invite;
				}

				await app.sendMessage(uid, m);

				const user = await app.loadContact(uid);
				const msg = { id, user, type, score, stat, own: true, ts: Date.seconds() };

				///app.openEditor('game', 'home', type); // ???
				app.emit(isover ? 'gameover' : 'gamemove', msg);

			}

			, async resign(user, gametype) {
				let { id, uid, type, stat } = await this.loadState(user, gametype);

				this.states.delete(id);

				stat.loss++;

				const ds = app.ds(kGameStateDS);

				await ds.update(id, { state: null, stat }, { user: uid, type });

				app.emit('gameover', { id, user: uid, type, stat });
			}
		}
	},

	async handleGameMessage(m) {

		try {

			const msg = m.msg;
			console.debug('GAME onmove:', msg);

			const [move, isover, score ] = await this.game.onmove(m.user, msg);

			if (isover) {

				this.emit('gameover', move);

				// this.openEditor('game', 'home', msg.id);

			}
			else {
				this.emit('gamemove', move);
			}

		}
		catch (e) {
			console.error('Failed to handle game move', e);
		}

	}
}

function updateStat(stat, isover, score) {

	if (!score) return false;

	let tag;

	if (score < 0) {
		stat.score.loss -= score;
		stat.total.loss -= score;
		tag = 'loss';
	}
	else {
		stat.score.win += score;
		stat.total.win += score;
		tag = 'win';
	}

	if (isover) {
		stat.last = { ...stat.score };
		stat.score.win = 0;
		stat.score.loss = 0;

		stat[tag]++;
	}

	return true;
} 

async function loadGameState(id, game, params) {
	const ds = app.ds(kGameStateDS);

	if (params)
		return [ game.init(params), kStat, params ];

	const s = await ds.get(id);
	if (!s)
		return [ game.init(params), kStat, params ];

	return [ s.state, s.stat ];
}

class Game {

	#params = { };
	#ratio = 1;

	#init = () => ({});
	#render = () => {}
	#onclick = () => {}
	#onmove = () => {}
	#description = () => '';

	get ratio() { return this.#ratio; }
	get params() { return this.#params; }

	constructor(code) {

		const ratio = (val) => typeof val == 'number' ? this.#ratio = val : (isNaN(val) ? 1 : parseFloat(val));
		const option = (name, val) => this.#params[name] = val;
		const init = cb => this.#init = cb;
		const render = cb => this.#render = cb;
		const onclick = cb => this.#onclick = cb;
		const onmove = cb => this.#onmove = cb;
		const param = () => {};
		const short = cb => this.#description = cb;

		eval(code);
	}

	init(params) {
		return this.#init(params);
	}

	render(state, ctx) {
		this.#render.bind(state)(ctx);
	}

	onclick(state, pos, ctx) {

		pos.width = ctx.canvas.width;
		pos.height = ctx.canvas.height;

		const r = this.#onclick.bind(state)(pos);

		if (r) {
			this.render(state, ctx);

			if (Array.isArray(r)) {
				app.game.send(...r);
			}

			return r.isover;
		}

		return false;
	}

	onmove(state, move) {
		return this.#onmove.bind(state)(move);
	}

	static async load(id) {
		const content = await app.cache.load('game', id);
		const g = new Game(content);

		return g;
	}
}

