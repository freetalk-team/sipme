
import { AppBase } from './app/base.js';

import { UserMixin } from './app/user.js';
import { RecentMixin } from './app/recent.js';
import { CommandMixin } from './app/command.js';
import { MessengerMixin } from './app/messenger.js';
import { GameMixin } from './app/game.js';
import { GoogleApiMixin  } from './app/gapi.js';
import { FirebaseMixin  } from './app/firebase.js';

import { Database } from './database.js';

import { Task } from './editor/common/task2.js';
import { TaskPage as TaskEditor } from './editor/task/page.js';

import './editor/welcome/index.js';
import './editor/admin/index.js';
import './editor/contact/index.js';
import './editor/account/index.js';
import './editor/game/index.js';
import './editor/video/index.js';
import './editor/wiki/index.js';
import './editor/player/index.js';

import ContactPage  from './sidebar/contact/page2.js';
import GamePage from './sidebar/game/page2.js';
import AccountPage from './sidebar/account/page2.js';
import PlayerPage from './sidebar/player/page.js';
import WikiPage from './sidebar/wiki/page.js'
import AdminPage from './sidebar/admin/page.js';

import { 
	DataSourceBackend
	, DataSourceRest
	, DataSourceRestAdmin
	, DataSourceDatabase
	, DataSourceDatabaseCache
	, DataSourceDatabaseIndex
	, DataSourceCache
	, DataSourceMulti
	, DataSourceFilter
	, DataSource } from './app/ds.js';

const kRoomPrefix = Config.sip.room;

export class App extends AppBase {

	#user;

	get sipUri() { return `${this.#user.id}@${Config.sip.domain}`; }
	get email() { return this.#user.email; }
	get displayName() { return this.#user.name; }
	get avatar() { return this.#user.photo || app.defaultAvatar; }
	get photo() { return this.#user.photo; }
	get status() { return this.#user.status || 'No status'; }
	get uid() { return this.#user.id; }
	get sudo() { return this.#user.su; }
	get user() { return this.#user; }


	constructor(config) {
		const container = document.getElementById('app-page');

		super(container);

		if (config)
			window.Config = config;

		this.task = new Task;

	}

	createDatabase() {
		return new Database;
	}

	async setupDatabase(db) {

		try {

			const data = await ajax.get('/api/ticketenum');
			console.debug('TICKET enums', data);

			for (const i of data) {
				if (typeof i.value == 'string')
					i.value = JSON.parse(i.value);
			}

			await db.put('enum', data);
		}

		catch (e) {
			console.error('Failed to setup databse', e);
		}

	}

	async load(user) {
		console.log('APP: on load');

		const secure = location.protocol.startsWith('https');
		const firebase = !!Config.firebase && secure; // Emulator ?

		this.#user = user;

		this.initDataSource();

		await super.load();
		await this.loadRecent();

		await this.task.init();

		this.startLifecycle();
		this.startMessenger(firebase);
		this.initGame();

		await this.startGoogleAPI();

		if (firebase) {
			await this.startFirebase();
			await startServiceWorker(this.firebase);
		}

		if (this.sudo) {
			document.body.setAttribute('su', '');
		}

		this.openEditor('home');
	}

	initDataSource() {

		const user = new DataSourceUser('contact');
		const users = new DataSourceCache(user, new DataSourceRest('users'));
		const contacts = new DataSourceFilter(users, i => !this.isme(i.id));
		const rooms = new DataSourceDatabaseCache('room');

		this.addDS(contacts);
		this.addDS(new DataSourceUserEmail, 'email');
		this.addDS(rooms);
		this.addDS(new DataSourceMulti(contacts, rooms), 'share');

		// this._.task = new DataSourceUpdate('task');
		// this._.task = new DataSourceCreate('task', 'ticket');

		// todo: check permissions
		// this.addDS(new DataSourceBackend('task', new DataSourceTicket));
		this.addDS(new DataSource('radio', new DataSourceRest('radio')));

		if (this.sudo) {
			this.addDS(new DataSourceBackend(user, new DataSourceRestAdmin('login')), 'user');
			// this._.rooms = new DataSourceBackend(new DataSourceDatabase('room'), new DataSourceRestAdmin('room'));
			this._.room = new DataSourceBackend(new DataSourceDatabase('room'), new DataSourceRoom);
			
		}

		this.addDS(new DataSourceBackend(new DataSourceContent('wiki'), new DataSourceRestAdmin('wiki')));

		this.initUserGames();
		this.initUserPlayer();

	}

	async signOut() {

		console.debug('Signing out ...');

		// try {
		// 	await this.messenger.unregister();
		// 	await this.messenger.offline();
		// }
		// catch (e) {
		// }

		console.debug('Redirecting');

		window.location.href = '/logout';
	}

	async updateProfile(data) {

		try {

			const ds = this.ds('contact');

			await ds.update(this.uid, data, this.#user);

			Object.assign(this.#user, data);

			app.publish();
		}
		catch (e) {

		}
	}

	async add(type, info, action='import') {

		const ds = app.ds(type);

		let id, add = false;

		if (typeof info == 'string') {
			id = info;
			info = await ds.get(id);

			if (!info) {
				console.error('Failed to', action, type, id);
				return;
			}
		}
		else {
			id = info.id;
		}


		try {
			// info.id = info.id || info.email.hashCode();


			switch (action) {

				case 'import': {

					

					let update = true;

					// switch (type) {
					// }

					if (update) {

						info.remote = undefined;
						ds.update(info);
					}
				}
				break;

				default:
				add = true;
				break;

			}

			let update = ['update', 'edit'].includes(action);

			if (add) {
				// await this.firebase.set('user', this.uid, 'private', type, id, false);
				if (ds) {
					// update = false;
					await ds.put(info, update);
				}
			}

			console.log('APP: add', type, info);

			super.add(type, info, update);

		} catch(e) {
			console.error('APP: failed to add =>', type, e);
		}

		return info.id;
	}
}

Object.assign(App.prototype
	, MessengerMixin
	, UserMixin
	, RecentMixin
	, CommandMixin
	, GameMixin
	, GoogleApiMixin
	, FirebaseMixin
);

App.Editor.register(TaskEditor);

App.Sidebar.register(ContactPage);
App.Sidebar.register(GamePage);
App.Sidebar.register(PlayerPage);
App.Sidebar.register(AccountPage);
App.Sidebar.register(WikiPage);
App.Sidebar.register(AdminPage);



class DataSourceUser extends DataSourceDatabase {

	put(data) {

		data = Array.isArray(data) ? data : [ data ];

		for (const i of data)
			// todo: improve
			i.username = i.email.split('@')[0];

		return super.put(data);
	}
}

class DataSourceUsers extends DataSourceRest {
	constructor() {
		super('users');
	}

	get(id) {
		const args = id.isEmail() ? { email: id } : id;
		return super.get(args);
	}
}

class DataSourceUserEmail extends DataSourceCache {

	constructor() {

		super (new DataSourceDatabaseIndex('contact', 'email'), new DataSourceUsers);

	}

	get(id) {
		return id == app.email ? app.user : super.get(id);
	}
}

class DataSourceRoom extends DataSourceRestAdmin {
	constructor () {
		super('room');
	}

	async ls(...args) {
		let data = await super.ls(...args);
		return this.#convert(data);
	}

	async put(data) {

		const r = await super.put(data);

		return { 
			id: normalizeName(r.name), 
			uid: r.id, 
			name: r.display || buildName(r.name) 
		}
	}
	
	async search(...args) {
		let data = await super.search(...args);
		return this.#convert(data);
	}


	#convert(data) {

		return data.map(i => ({
			uid: i.id,
			id: typeof i.id == 'number' ? normalizeName(i.name) : i.id,
			name: i.display || buildName(i.name),
			topic: i.topic || 'No topic',
			domain: i.domain || Config.sip.domain,
			members: i.members || []
		}));
	}
}



class DataSourceContent extends DataSourceDatabase {


	async put(data) {

		const text = data.content;
		delete data.content;

		await super.put(data);
		await app.cache.update(this.name, data.id, text);

	}

	async get(id) {

		const data = await super.get(id);

		if (data && !data.content) {
			data.content = await app.cache.load(this.name, id);
		}

		return data;
	}

}


function normalizeName(name) {
	return name.startsWith(kRoomPrefix) ? name.slice(kRoomPrefix.length) : name;
}

function buildName(name) {
	name = normalizeName(name);
	return name.replaceAll('-', ' ').capitalizeFirstLetter();
}




	

async function startServiceWorker(firebase) {
	if ('serviceWorker' in navigator) {

		const id = `did-${app.uid}`;

		let sw;
		let token = localStorage.getItem(id);

		const opt = {
			scope: '/',
			//type: 'module'
		};

		const params = new URLSearchParams(Object.entries(Config.firebase));
		const path = 'sw.js?' + params.toString();

		const registration = await navigator.serviceWorker.register(path, opt);
		
		if (!token) {

			token = await firebase.getRegistrationToken(registration);

			console.log('Registration token:\n', token);

			try {

				// const { key } = await ajax.post('/app/register', { token });
				// this.deviceId = key;

				// if (Config.internalPush)

				// Should assign device ID with 'user' topic
				await ajax.post('/api/register', { token });

				localStorage.setItem(id, token);

			}
			catch (e) {
				console.error('Failed to register device token');
			}
			
		}

		if (registration.active) {
			sw = registration.active;
			
		}

		navigator.serviceWorker.addEventListener('message', function (event) {
			// console.log('SwerviceWorker message:', event.data);

			app.onPushMessage(event.data);
		});
	}
}

	// async updateToken() {
	// 	const token = await this.#fb.getRegistrationToken(this.#registration);
	// 	this.sender = token;

	// 	console.log('Registration token:\n', token);

	// 	try {

	// 		// const { key } = await ajax.post('/app/register', { token });
	// 		// this.deviceId = key;

	// 		// if (Config.internalPush)

	// 		// Should assign device ID with 'user' topic
	// 		await ajax.post('/app/register', { token });

	// 		this.deviceId = token;
	// 	}
	// 	catch (e) {
	// 		console.error('Failed to register device token');
	// 	}
	// }