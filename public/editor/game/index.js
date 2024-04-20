
import { GameEditor } from './page.js';

App.Editor.register(GameEditor);

App.Commands.register('game-open-user', async (id) => {
	const [user, type] = id.split('@');
	
	app.openEditor('game', 'open', type, user);
});

App.Commands.register('game-invite-user', async (id) => {

	console.debug('New game:', id);

	const ds = app.ds('game');
	const items = ['opponent'];

	const info = await ds.get(id);
	let params = await app.game.params(id);

	let item;

	for (const [name, type] of Object.entries(params)) {

		item = { name };

		if (Array.isArray(type)) {
			item.type = type.length < 5 ? 'radio' : 'option';
			item.options = type.map(i => i.toString());
		}
		else if (type) item.type = type;
		else item = name;

		items.push(item);
	}

	params = {
		desc: 'Create new game',
		items,
		icon: info.icon,
		reload: true,
		onAdd({ opponent, ...options}) {
			console.log('Creating new game:', options);
			app.openEditor('game', 'open', id, opponent, options);
		}
	}

	return app.openEditor('add', 'new', 'game', params);
});

App.Commands.register('game-resign-user', async id => {
	console.debug('CMD game resign:', id);

	app.game.resign(id);
});

// AddEditor.register('game', [

// 	{
// 		name: 'id',
// 		title: 'Name',
// 		type: 'string',
// 		placeholder: 'game name',
// 		check: v => /[a-z][a-z0-9]{4,20}/.test(v),
// 		required: true,
// 		noedit: true,
// 	},

// 	{
// 		name: 'type',
// 		type: 'option',
// 		options: ['board'],
// 		noedit: true,
// 	},

// 	{
// 		type: 'text',
// 		name: 'desc',
// 		title: 'Description',
// 		placeholder: 'description',
// 		desc: 'Markdown description of the game',
// 	},

// 	{
// 		name: 'render',
// 		type: 'option',
// 		options: ['canvas'],
// 		noedit: true,
// 	},

// 	{
// 		type: 'icon',
// 		name: 'icon',
// 		options: Object.values([
// 			'f522', //dice
// 			'f11b', //gamepad
// 			// 'f867', // game-board
// 			// 'f2f4', // spade
// 			'f12e', // puzzle
// 		])
// 	},

// 	{
// 		type: 'json',
// 		name: 'options',
// 		title: 'Options',
// 		desc: 'JSON array of available game options',
// 	},

// 	{
// 		title: 'code',
// 		name: 'content',
// 		type: 'edit',
// 	},

// 	{
// 		title: 'preview',
// 		name: 'preview',
// 		type: 'preview'
// 	}
// ]);

FindEditor.register('game', ['id', 'description', 'user', 'info']);


export { GameEditor }
