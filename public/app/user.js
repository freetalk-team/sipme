
import { 
	DataSourceBackend
	, DataSourceFirebaseBackend
	, DataSourceDatabase
	, DataSourceDatabaseCache
	, DataSourceCache
	, DataSourceMulti
	, DataSourceFilter
	, DataSourceUpdate
	, DataSource } from './ds.js';


const kNotifyUser = 'Notify';

const kInternalRooms = { 
	support: { 
		topic: 'Support channel room'
	}
};

class Cache {

	async get(type, id) {
		let r = await app.db.getByIndex('cache', 'uid', [id, type]);
		if (r) 
			r.content = decodeContent(r.content);
		
		return r;
	}

	async load(type, id, expire=1*60*60) {

		const now = Date.seconds();

		let r = await this.get(type, id);
		if (r && r.expire > now) {
			return r.content;
		}

		let path;

		// todo: fix, remove that check
		switch (type) {
			case 'channel':
			path = `/channel/${id}`;
			break;

			default:
			path = `/api/content/${type}/${id}`;
			break;
		}

		// const content = await ajax.get(path);
		const data = await ajax.fetch(path, { 
			cache: 'reload', 
			// headers: {
			// 	'Accept-Encoding': 'deflate'
			// }
		});


		if (data) {

			const content = encodeContent(data);
			// console.debug('Loading content:', content);
			await app.db.put('cache', { id, type, content, expire: now + expire });
		}
		else {
			console.error('Failed to pull content:', type, id);
			// throw new Error('Failed to pull content:', type, id);
		}

		return data;
	}



	delete(type, id) {
		return app.db.rm('cache', id);
	}

	update(type, id, content) {

		if (typeof content == 'string')
			content = zip(content);

		return app.db.updateByIndex('cache', 'uid', [id, type], { content }, { id, type });
	}
}

const UserMixin = {

	cache: new Cache,

	initUser() {

		const users = new DataSourceCache(new DataSourceDatabaseTimestamp('contact'), 'user');
		// const channels = new DataSourceCache('channel');
		const channels = new DataSource(new DataSourceDatabaseCache('channel'), new DataSourceFirebaseBackend('channel'));
		// const articles = new DataSourceBackend('news', 'article', '/scrap');
		const articles = new DataSourceBackend('news');
		const rooms = new DataSourceRoom;
		const posts = new DataSourcePost;
		const contacts = new DataSourceFilter(users, i => !this.isme(i.id));
		const channeladm = new DataSourceFilter(channels, i => this.sudo ? i.type == 'blog' : this.isme(i.user));

		this._.contacts = contacts;
		this._.channel = channels;
		this._.room = rooms;

		this.domains = new DataSourceCache('domain');
		this.scrapers = new DataSourceBackend('scraper');
		// this._.task = new DataSourceSearch('task');
		this._.task = new DataSourceUpdate('task');
		this._.post = posts;
		this._.article = articles;
		this._.latest = new CacheMap({ maxCacheSize: 500 });
		this._.recent = new DataSourceDatabase('recent');

		this._.share = new DataSourceMulti(contacts, rooms);
		this._.sharex = new DataSourceMulti(contacts, rooms, channeladm);
		this._.torrent = new DataSourceTorrent;

		this._.comment = new DataSourceComment;
		this._.pin = new DataSourceDatabase('pin');

		this._.channelnews = new DataSourceFilter(channels, i => i.type == 'news');
		this._.channeladm = channeladm;
		// this._.channels = new Map;


		this._.wiki = new DataSourceSearchBase('wiki');
		this._.radio = new DataSource('radio', new DataSourceFirebaseBackend('radio'));

		this.initUserGames();
		this.initUserPlayer();
	}

	, initUserGames() {
		this._.game = new DataSourceGame(this.cache);
		this._.games = createContactDataSource(DataSourceDatabase, 'games');

		// this.registerGameHandler();
	}

	, initUserPlayer() {
		this._.playlist = new DataSourceDatabase('playlist');
	}

	, addDS(ds, name) {
		this._[name || ds.name] = ds;
	}

	, ds(id, cache=false) {

		let ds;
		
		switch (id) {

			case 'scraper':
			ds = this.scrapers;
			break;

			case 'news':
			ds = this._.article;
			break;

			default:
			ds = this._[id];
			break;
		}

		return cache ? new DataSourceCacheMap(ds) : ds;
	}

	, dsFilter(id, cb) {
		const ds = typeof id == 'string' ? this.ds(id) : id;
		return new DataSourceFilter(ds, cb);
	} 

	, async updateProfileOld({ name, photo, status }) {

		let displayName = this.displayName;
		let photoURL = this.avatar;

		const email = this.email;

		try {

			if (name) {
				displayName = name;
			}
			else {
				name = displayName;
			}

			if (photo) {
				photoURL = await this.firebase.uploadPhoto(photo);
				photo = photoURL;
			}
			else {
				photo = photoURL;
			}

			const info = { name, photo, email, username: name.toLowerCase() };

			if (status)
				info.status = status;

			const path = `/user/${app.uid}`;
			await this.firebase.update(path, info);

			// update auth user
			await this.firebase.updateProfile({ displayName, photoURL });
			// console.log('User avatar update:', url);
			this.emit('profile', { photo, name });

		}
		catch (e) {
			console.error('Failed to update profile:', e);
			return false;
		}

		return true;
	}

	, getContacts() { return this._.contacts; }

	, async loadContact(id) {

		if (id == this.uid) 
			return {
				id,
				photo: this.avatar,
				name: this.displayName,
			};

		const ds = this.ds('contact');

		let info;

		if (typeof id == 'object') {

			info = await ds.get(id.user);

			Object.assign(id, { name: info.name, photo: info.photo || app.defaultAvatar, user: info });
		}
		else {
			info = await ds.get(id);
		}
		
		info.photo = info.photo || app.defaultAvatar;

		return info; 
		
	}

	, async loadContacts(contacts) {

		const r = {};

		for (const i of contacts) {
			if (typeof i == 'string') {
				const c = await this.loadContact(i);
				r[c.id] = c;
			}
			else {
				await this.loadContact(i);
			}
		}

		return r;
	}

	, async loadRoom(id) {


		// const contacts = this.ds('contact');

		// let room = await contacts.get(id);
		let room;

		if (!room) {

			const rooms = this.ds('room');

			room = await rooms.get(id);
			if (!room) {

				console.error('Ignorring message from unknown room', id);
				throw new Error('Message from unknown user!');
			}
			
			// this._.contacts.set(room);
		}

		return room;
	}

	, async loadChannel(channel) { 

		const ds = this.ds('channel');
		let info;

		if (typeof channel == 'object') {

			const id = channel.channel || channel.id;

			info = await ds.get(id);

			if (channel.channel)
				channel.channel = info;
			else
				Object.assign(channel, info);
		}
		else {
			info = await ds.get(channel);
		}

		return info;
	}
	

	, async loadChannels(channels) {
		const r = {};

		if (channels) {
			const r = {};

			for (const id of channels) {
				const info = await this.loadChannel(id);
				r[id] = info;
			}

			return r;
		}
		
		const ds = this.ds('channel');
		channels = await ds.ls();

		return Object.fromArray(channels);
	}


	, async createChannel(info) {

		let name, display = info.display || info.name;
		
		display = display
			.trim()
			.replace(/[ \t]+/, ' ')
			;

		// name = display
		// 	.toLowerCase()
		// 	.replaceAll(' ', '')
		// 	;

		info.owner = app.uid;
		// info.display = name;

		if (info.access == 'private') {
			delete info.name;
		}
		else {
			info.name = display;
			info.index = `${info.type}${info.region}`;
		}

		//info.category = info.category || 'blog';

		let id;

		if (/*this.sudo*/false) {
			id = await this.firebase.push('channel', info, true);
		}
		else {
			const r = await ajax.post('/api/channel', info);

			id = r.id;

			if (r.key) {
				// todo: do not store it !!!
				// this._.keys[id] = r.key

				info.key = r.key;
			}
		}

		info.admin = true;

		return id;
	}

	, async loadContent(link) {

		let data, type, id;
	
		if (link.startsWith('/')) {

			const [path, params ] = link.split('?');
			
			[ type, id ] = path.slice(1).split('/');

			data = await this.db.get(type, id);
			if (!data) {
				const ds = this.ds(type);
				if (!ds) {
					console.error('Unknown DataSource:', type);
					return;
				}
	
				data = await ds.get(id);
				if (!data) {
					console.error('Not found', type, id);
					return;
				}
			}

			if (params) {
				const p = new URLSearchParams(params);
				Object.assign(data, Object.fromEntries(p));
			}

			if (data.channel && typeof data.channel == 'string')
				data.channel = await this.loadChannel(data.channel);

			if (data.user && typeof data.user == 'string')
				data.user = await this.loadContact(data.user);
		}
	
		return [data, type ];
	}
	

	, userKey(uid, len=16) { 
		return Uint8Array.from(uid.toByteArray().slice(0, len)); 
	}

	, share(what, data, args) {

		const params = {

			title: 'Share',
			desc: 'Share files, contacts and torrents',
			// local: 'contact',
			// index: 'username',
			ds: 'share',
			results: { contact: 'find-contact-item', room: 'find-room-item' },
			mode: 'ls',
			type: 'select',
			force: true,

			//isselected: (info) => !!this.admins && this.admins[info.id],

			ondone: async (users) => {
				console.log('Sharing', what, 'with', users);

				const msg = { _type: what };

				if (typeof data == 'object') {

					if (args)
						Object.assign(data, args);
				}
				else {

					let ds;

					if (what == 'room') {
						ds = this.ds('room');
						data = await ds.get(data);
					}
					else {
						let url = `${what}://${data}`;
						if (args)
							url += '?' + new URLSearchParams(Object.entries(args)).toString();

						msg.url = url;
					}
				}

				switch (what) {

					case 'torrent':
					case 'playlist': 
					msg.info = await this.createTorrentFromPlaylist(data);
					// msg.ctype = 'torrent';
					break;

					default:
					if (!msg.url)
						Object.assign(msg, getInfo(data, what));
					break;
				}

				//msg.info.type = what;

				console.log('Sharing', what, 'with', users);

				for (const i of users) {
					const user = typeof i == 'string' ? i : i.id;

					switch (i.ds) {

						case 'room':
						await this.sendRoomMessage(user, msg);
						break;

						case 'channel':
						await createPost(user, msg.info, this._.latest);
						break;

						default:
						await this.sendMessage(user, msg);
						break;
					}

				}
			}
		};

		switch (what) {

			// case 'playlist':
			case 'article':
			case 'item':
			// case 'task':
			params.ds = 'sharex';
			params.results['channel'] = 'find-channel-item';
			break;

			// case 'channel': {
			// 	const id = typeof data == 'string' ? data : data.id;
			// 	const url = `${window.location.origin}/channel/${id}`;
			// 	document.execCommand('copy', false, url);
			// }
			// break;

		}

		this.openEditor('find', 'contact', params);

	}

	, find(type) {

		let params;

		switch (type) {

			case 'contact':
			params = {
				index: 'username'
				, local: true
				, onaction(action, info) {
					switch (action) {
						case 'add':
						app.add('contact', info);
						break;
					}
				}
			};
		
			break;

			case 'channel':
			params = {
				desc: 'Search, add or remove public channels'
				, add: true
				, onaction(action, info) {

					switch (action) {

						case 'add':
						app.add('channel', info, 'import');
						break;

					}
				}
			};
			break;

			case 'game':
			params = {
				desc: 'Search for games'
				, add: true
				, onaction(action, info) {

					switch (action) {

						case 'add':
						app.add('game', info, 'import');
						break;

					}
				}
			};
			break;

			case 'scraper':
			params = {
				index: 'name'
				, type: 'cmd'
				, onclick: (id, data) => app.executeCommand('edit', null, 'scraper', id)
			}
			break;

			case 'radio':
			params = { 
				desc: 'Listen online radio'
			}
			break;
		}

		params.mode = 'ls';

		if (!params.ds) params.ds = type;

		this.openEditor('find', type, params);	
	}, 

	async subscribe(channel) {
		try {
			await ajax.post(`/api/subscribe/${channel}`, {});
			await app.db.update('channel', channel, { follow: true });
		}
		catch (e) {
			console.error('Failed to subscribe for channel:', channel);
		}
	}

	, registerGameHandler(handler) {

		if (handler) {
			this.event.removeEventListener('gamemsg', storeGameInvites);
			this.event.addEventListener('gamemsg', handler);
		}
		else {
			this.event.addEventListener('gamemsg', storeGameInvites);
		}

	}

	, async importAudioFiles(files) {

		const imported = [];
	
		for (const file of files) {
	
			const id = file.name.hashCode();
			const i = await app.db.get('audio', id);
	
			if (i) {
				file.meta = i.meta;
				continue;
			}
	
			const meta = file.meta || await fileX.getMeta(file);
			const ext = fileX.getExtension(file.name);
			const type = fileX.isVideo(ext) ? 'video' : 'audio';
	
			const item = {
				id, type, file
			};
	
			console.log('# Importing file:', file.name);
	
			item.rating = 0;
			item.meta = meta;
			item.album = meta.album ? meta.album.toLowerCase().hashCode() : 0;
	
			await app.db.put('audio', item);
	
			imported.push(item);
		}
	
		app.emit('audioadd', imported);
	}
	
}

async function storeGameInvites(e) {

	return;

	const { user, msg, ts } = e.detail;
	const { id, last, invite } = msg;

	const uid = `${user}@${id}`;

	const def = { id: uid, user, type: id };
	const data = { last, ts, own: false };

	if (invite) {
		data.invite = true;
	}

	const ds = app.ds('games');

	return ds.update(uid, data, def);
}

async function createPost(channel, urlOrData, cache) {

	let data, link = urlOrData;
	if (typeof urlOrData == 'string') {

		const [path, params ] = urlOrData.split('?');
		const [, channel] = params.split('=');

		data = cache.get(urlOrData);
		if (!data) {
			console.error('Failed to create post', link);
			return;
		}
	}
	else {
		data = urlOrData;

		// const params = new URLSearchParams(Object.entries({
		// 	link: data.link 
		// }));
		
		// link = '/scrap/url?' + params.toString(); 

		link = data.link;
	}

	const content = await toMarkdown(data, 'article');
	const ts = Date.seconds();
	const user = app.uid;
	const likes = { l: 0, s: 0, o: 0, u: 0 };
	const replies = { count: 0 };

	const path = `data/channel/${channel}`;
	const info = { content, user, ts, likes, replies, link };
	// const path = 'data/channel2';
	// const info = { content, user, ts, likes, replies, link, channel };

	return app.firebase.push(path, info);

}

function getInfo(data, type) {

	switch (type) {

		case 'post':
		return {
			id: data.id,
			channel: data.channel,
		};

	}
	
	return data;
}

export {
	UserMixin
}

class DataSourceCacheMap {

	#ds;
	#cache = new Map;

	constructor (ds) {
		this.#ds = ds;
	}

	async get(id) {
		let data = this.#cache.get(id);
		
		if (!data) {
			data = await this.#ds.get(id);
			this.#cache.set(id, data);
		}

		return data;
	}

	async ls() {
		const data = await this.#ds.ls();
		this.#cache = new Map(data.map(i => [i.id, i]))
		return data;
	}
}

class DataSourceRoom extends DataSourceDatabaseCache {

	constructor () {
		super ('room');
	}

	get(id) {

		let room = kInternalRooms[id];
		if (room) {
			return Object.assign({
				id,
				name: id.capitalizeFirstLetter()
			}, room);
		}

		return super.get(id);
	}

	async ls() {
		const data = await super.ls();
		return data.filter(i => !['notify'].includes(i.id));
	}
}

class DataSourcePost extends DataSourceDatabase {

	constructor() {
		super('post');
	}

	async get(id, channel) {

		let data = await super.get(id);
		if (!data) {
			data = await app.firebase.value('data', 'channel', channel, id);

			if (data) {
				data.id = id;
				await super.put(data);
			}
		}

		if (!data.md)
			data.md = data.content;

		if (!data.title) {
			const info = fromMarkdown(data, 'post');
			Object.assign(data, info);
		}

		await app.loadChannel(data); 

		return data;
	}
	
}

class DataSourceComment extends DataSourceDatabase {
	constructor() {
		super('comment');
	}

	async ls() {
		const data = await super.ls();
		return this.#loadData(data);
	}

	async lsByIndex(...args) {
		const data = await super.lsByIndex(...args);
		return this.#loadData(data);
	}

	async getByIndex(...args) {
		const data = await super.getByIndex(...args);
		if (data) return this.#loadData(data);
		return data;
	} 

	async get(id) {
		const data = await super.get(id);
		if (data) return this.#loadData(data);
		return data;
	} 

	async put(msg, add=false) {
		const own = app.isme(msg.user);
		if (own && msg.channel != msg.parent) {
			const u = { reply: msg.id };
			await super.update(msg.gid, u);
		}

		return super.put(msg);
	}

	async #loadData(data) {

		const load = async function(data) {
			await app.loadContact(data); 
			await app.loadChannel(data);

			data.own = app.isme(data.user);

			const replies = data.replies;
			if (replies && replies.count > 0) {

				const recent = [];
				let info;

				for (const i of replies.recent) {
					info = await app.loadContact(i);
					recent.push(info);
				}

				replies.recent = recent;
			}
			else if (data.reply) {
				data.replies = {
					count: 1,
					recent: [app.userinfo]
				};
			}

			data.canreply = function() { return this.level < 2; }

			return data;
		}

		if (!Array.isArray(data))
			return load(data);

		const comments = new Map(data.map(i => [i.id, i]));
		const ds = app.ds('post', true);

		for (const i of data) {

			const id = i.gid;

			if (i.parent == i.channel) {
				const post = await ds.get(id); 
				i.post = post;
			}
			else {
				const parent = i.gid;
				i.comment = comments.get(parent);
			}

			await load(i);
		}

		return data;
	}

}

class DataSourceGame extends DataSourceBackend {

	#cache;

	constructor(cache) {
		super('game');

		this.#cache = cache;
	}

	async search(...args) {

		const locals = await this.local.ls();
		const games = new Set(locals.map(i => i.id));

		const r = await super.search(...args);
		const data = [];

		for (const i of r) {
			if (!games.has(i.id)) {
				i.remote = true;
				data.push(i);
			}
		}

		if (data.length > 0)
			this.local.put(data);

		return r;
	}

	async put(data) {
		await super.put(data);
		return this.#cache.update('game', data.id, data.content);
	}

	async get(id) {

		let info;

		// tempoary
		switch (id) {

			// case 'backgammon':
			// info = { 
			// 	id: 'backgammon',
			// 	type: 'board',
			// 	name: 'backgammon',
			// 	description: 'Classic Backgammon game',
			// 	icon: "f522",
			// 	iconcolor: '#006994',
			// 	user: 'su',
			// 	options: ['opponent', { name: 'type', type: 'radio', options:['1', '3', '5', '7'] }]
			// };
			// break;

			default:
			info = await super.get(id);
			break;

		}

		info.user = await app.loadContact(info.user);

		return info;
	}
}

class DataSourceSearchBase extends DataSource {
	constructor(name) {
		super(name, new DataSourceFirebaseBackend(name));
	}

	async get(...args) {
		const data = await super.get(...args);
		if (data)
			await this.#loadData(data);

		return data;
	}

	async ls(...args) {
		const data = await super.ls(...args);

		for (const i of data) 
			await this.#loadData(i);

		return data;
	} 

	async search(...args) {
		const data = await super.search(...args);

		for (const i of data)
			await this.#loadData(i);

		return data;
	}

	async #loadData(info) {
		if (info.user)
			info.user = await app.loadContact(info.user);
	}
}

class DataSourceSearch extends DataSourceSearchBase {

	#locals = new Map;
	#index;

	constructor(name, index = i => i.name || i.title) {
		super(name);

		this.#index = index;
	}

	async ls(...args) {
		const data = await super.ls(...args);

		for (const i of data) 
			this.#locals.set(i.id, this.#index(i));

		return data;
	} 

	async search(...args) {
		const data = await super.search(...args);

		if (data.length > 0) {

			await this.addRemotes(data);

			for (const i of data) {
				if (this.#locals.has(i.id))
					i.local = !i.remote;
			}
		}
		return data;
	}

	addRemotes(data) {
		const remotes = data.filter(i => !this.#locals.has(i.id))
		remotes.map(i => i.remote = true);

		return this.local.put(remotes);
	}

}

class DataSourceTorrent extends DataSourceSearch {

	constructor() {
		super('torrent');
	}

	async ls(...args) {
		const data = await super.ls(...args);
		return data.filter(i => i.local);
	}

	async update(id, data) {

		await super.update(id, data);

		if (data.state == 'done') {
			const fb = this.remote.fb;
			const path = `data/${this.name}/${id}/${app.uid}`;

			await fb.set(path, Date.seconds());
		}
	}
}



// function onGamePreview(code, type='game') {

// 	console.debug('On game preview');

// 	const Base = getInstance(type);

// 	function create(script) {
// 		// return function() { return eval(script); }.call(ctx);
// 		return function() { return eval(script); }.call();
// 	}

// 	const script = `
// class {{this.name}} extends Base { {{this.code}} }
// new {{this.name}}
// `;

// 	const s = script.replacex({ name: 'Preview', code });
// 	const g = create(s);

// 	g.init();

// 	// g.render(editor);

// 	return g;
// }

// function getInstance(type) {

// 	const kBase = {
// 		game: class GameBase { 
// 			init() {}
// 			render(editor) {
// 				console.log('Base::foo');
// 			}

// 			ontest() { 
// 				this.state = this.test();
// 			}
	
// 			test() { return {} }
// 			move() {}
// 			gameover() {}

// 			onclick(p) { console.log('Fooo onclick pos:', p); }
// 			onmousemove() {}
// 		}
// 	}

// 	return kBase[type];
// }

function decodeContent(content) {
	const text = unzip(content);
	return /^[{\[](.*)[}\]]$/.test(text)
		? JSON.parse(text)
		: text;
}

function encodeContent(data) {
	const text = typeof data == 'string' ? data : JSON.stringify(data);
	return zip(text);
}

class DataSourceDatabaseTimestamp extends DataSourceDatabase {

	ls(offset=0, limit=50) {
		return super.lsByIndex('ts', null, offset, limit, true);
	}

}

function createContactDataSource(Base, ...args) {

	class DataSource extends Base {


		async ls(...params) {

			const data = await super.ls(...params);

			await app.loadContacts(data);

			return data;
		}

		async lsByIndex(...params) {

			const data = await super.lsByIndex(...params);

			await app.loadContacts(data);

			return data;
		}

		async lsByRange(...params) {

			const data = await super.lsByRange(...params);

			await app.loadContacts(data);

			return data;
		}

		async get(id) {
			const data = await super.get(id);

			if (data)
				await app.loadContact(data);

			return data;
		}

		async getByIndex(...params) {
			const data = await super.getByIndex(...params);

			if (data)
				await app.loadContact(data);

			return data;
		}


	}

	return new DataSource(...args);

}