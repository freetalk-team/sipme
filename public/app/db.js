import { IndexDB, addTable, addIndex, deleteIndex } from '../db.js';

const kDay = 24 * 60 * 60;

const kContact = 'contact'
	, kChannel = 'channel'
	, kHistory = 'history'
	, kComponent = 'component'
	, kFeed = 'feed'
	, kRoom = 'room'
	, kRecent = 'recent'
	, kPost = 'post'
	, kNews = 'news'
	, kComment = 'comment'
	, kGame = 'game'
	, kGames = 'games2'
	, kDomain = 'domain'
	, kAudio = 'audio'
	, kPlaylist = 'playlist'
	, kTorrent = 'torrent'
	, kSettings = 'settings'
	, kOffline = 'offline'
	, kFile = 'file'
	, kScraper = 'scraper'
	, kTask = 'task'
	, kChat = 'chat'
	, kCache = 'cache'
	, kPin = 'pin'
	, kRadio = 'radio'
	;

const decoder = new TextDecoder('utf-8');
const kPullCount = 10;

export class Database extends IndexDB {

	get version() { return 6; }
	// get name() { return 'app'; }

	async init() {

		await super.init();
		await this.updateHistory();
	}

	setup() {
		return app.setupDatabase(this);
	}

	onUpgrade(db, txn, ver) {
		switch (ver) {

			case 0:
			Database.addTable(db, kSettings);
			
			Database.addTable(db, kAudio);
			Database.addTable(db, kRadio);
			Database.addTable(db, kPlaylist);

			Database.addIndex(kAudio, 'rating', txn);
			Database.addIndex(kAudio, 'type', txn);

			Database.addIndex(kPlaylist, 'type', txn);
		
			case 1:
			addTable(db, kSettings);
			addTable(db, kContact);
			addTable(db, kChannel);
			addTable(db, kPost);
			addTable(db, kComment);
			addTable(db, kHistory, true);
			addTable(db, kRoom);
			addTable(db, kAudio);
			addTable(db, kPlaylist);
			addTable(db, kTorrent);
			addTable(db, kRecent, false, '_id');
			addTable(db, kGame);
			addTable(db, kOffline, true);
			addTable(db, kFile);
			addTable(db, kScraper);
			addTable(db, kDomain);
			addTable(db, kNews);
			addTable(db, kTask);
			addTable(db, kChat, true);
			addTable(db, 'games');
			addTable(db, kCache);
			addTable(db, kPin);
			addTable(db, kRadio);

			addIndex(kContact, 'email', txn, true);

			addIndex(kChannel, 'ts', txn);
			addIndex(kChannel, 'remote', txn);

			addIndex(kPost, 'ts', txn);
			addIndex(kPost, 'channel', txn);

			addIndex(kComment, ['channel', 'gid'], txn, false, 'topic');
			addIndex(kComment, ['user', 'ts'], txn, false, 'latest');

			addIndex(kHistory, 'uid', txn);
			
			addIndex(kAudio, 'rating', txn);
			addIndex(kAudio, 'type', txn);


			addIndex(kFile, 'type', txn);

			addIndex(kChat, 'uid', txn);
			addIndex(kChat, 'ts', txn);

			addIndex('games', 'user', txn);
			addIndex('games', ['id', 'user'], txn, true, 'gid');

			addIndex(kCache, ['id', 'type'], txn, true, 'uid');

			//addIndex(kRecent, 'uid', txn);
			// addIndex(kRecent, 'ts', txn);
			addIndex(kRecent, ['_type', 'ts'], txn, false, 'latest');
			// addIndex(kRecent, ['_type', 'user', 'ts'], txn, false, 'latest');

			addIndex(kPin, 'type', txn);

			case 1:
			addIndex(kContact, 'ts', txn);

			case 2:
			addTable(db, 'update');

			case 3:
			addTable(db, kGames);
			addIndex(kGames, 'type', txn);
			addIndex(kGames, 'user', txn);

			case 4:
			addIndex(kGames, ['type', 'ts'], txn, false, 'recent');

			case 5:
			addIndex(kRoom, 'uid', txn);

			default:
			break;
		}

		
	}

	addHistory(data) { 
		// hack for testing
		// data.ts -= 5*24*60*60;
		return this.addOne(kChat, data); 
	}

	async getHistory(id, offset=Date.seconds()) {

		// const start = [id, offset - 48 * ];
		const start = [id, 0];
		const end = [id, offset];

		let data = await this.lsByRange(kChat, 'user', start, end, true, kPullCount);
		let index = data.length;

		const more = data.length == kPullCount;
		const msgs = [];

		// data.sort((b,a) => a.ts - b.ts);

		for (const i of data.slice().reverse()) {


			// no more compressed messages
			if (!i.data) break;

			--index;

			msgs.push(...decodeMessages(i));
		}

		msgs.reverse();

		data.splice(index, data.length - index, ...msgs);

		return [data, more];
	}

	async getHistoryOld(id, offset=-1) {

		if (offset == -1) {

			// note: user records for one day couldn't be so much :o 
			const data = await this.lsByIndex(kChat, 'uid', id, false, 10000);

			if (data.length > 0)
				// return [Date.today(), data, true];
				return [data, true];

			offset = 0;
		}


		const [ item ] = await this.lsByIndex(kHistory, 'uid', id, true, 1, offset);
		if (!item) 
			return null; // no more history

		const data = [];
		const decoder = new TextDecoder('utf-8');

		let buf = unzip(item.data, null);
		
		while (buf.length > 0) {

			const view = new DataView(buf.buffer);

			const ts = (view.getUint16(0) + item.ts);
			const own = !!view.getUint8(2);

			buf = buf.slice(3);

			let i = 0;
			for (; i < buf.length && buf[i] != 0; ++i);

			const s = buf.slice(0, i );
			const m = { ts, own };

			const msg = decoder.decode(s)
				.replace(/^\[\[([A-z0-9]+)\]\] /, (_, user) => { m.user = user; return ''; })
				;

			m.msg = msg;

			data.push(m);

			buf = buf.slice(i + 1);
		}

		// return [new Date(item.ts * 1000), data];
		return [data, false];
	}

	async updateHistory() {

		const end = [Date.seconds(kDay), 1];
		// const end = [Date.seconds(), 1]; // for test

		const data = await this.lsByRange(kChat, 'latest', [0, 1], end, false, 10000);

		if (data.length == 0) // nothing to merge
			return;

		const start = data[0].ts; 
		const m = new Map;

		let ts = 0; // align to day boundary
		let next = 0;
		let day;

		for (const i of data) {

			if (i.ts >= next) {

				ts = getDay(data[0].ts);
				next = ts + kDay;
				
				day = [];

				m.set(ts, day);
			}

			day.push(i);
		}

		// spliting by users
		for (const [day, history] of m.entries()) {

			const users = new Map;

			for (const i of history) {

				const user = i.uid;

				delete i.uid;
				i.ts -= day;

				let data = users.get(user);

				if (!data) {
					data = [];
					users.set(user, data);
				}

				const msg = encodeMessage(i);
				data.push(msg);
			}

			for (const [uid, data] of users.entries()) {
				const buf = concatBuffers(data);
				const encoded = zip(buf);

				// users.set(user, encoded);
				await this.put(kChat, {
					uid, ts: day, data: encoded
				});
			}

			// console.log('MSG encoded:', msg.byteLength);

			// m.set(day, users);
		}

		console.log('History recent entries', m); 

		return this.delete(kChat, 'ts', start, end);
	}

	clearHistory(id) {
		return this.delete(kHistory, 'uid', id, id);
	}
}

function encodeMessage({ msg, info, type, ts, own, user}) {

	if (type) {
		msg = own 
			? `**Share ${type}:** ${info.name}`
			: `${type}://${info.id}`;
	}

	if (user) {
		msg = `[[${user}]] ` + msg;
	}

	const s = new TextEncoder('utf-8').encode(msg);
	const len = 3 + s.length + 1;

	console.log('Encoding message:', msg, s.length);

	const array = new ArrayBuffer(len); // null-terminated
	const view = new DataView(array);

	view.setUint16(0, ts);
	view.setUint8(2, own);

	const buf = new Uint8Array(array); 
	buf.set(s, 3);
	buf.set(0, len - 1);

	return array;
}

function concatBuffers(buffers) {
	const total = buffers.reduce((len,i) => len + i.byteLength, 0);

	const buf = new Uint8Array(total);
	buffers.reduce((offset, i) => {
		buf.set(new Uint8Array(i), offset);
		return offset + i.byteLength;
	}, 0);

	return buf.buffer;
};

function getDay(ts) { return Math.floor(ts / kDay) * kDay; }

function buildHistory(history) {

	if (history.length == 0) return [];

	let ts = getDay(history[0].ts) + kDay;
	let b;
	const blocks = [];

	for (const i of history) {
		if (i.ts < ts - kDay) {
			b = [];
			blocks.push(b);

			ts = getDay(i.ts);
		}

		b.push(i);
	}

	// return blocks;
	return blocks.map(i => i.reverse());
}

function decodeMessages(msg) {
	let buf = unzip(msg.data, null);

	const msgs = [];
		
	while (buf.length > 0) {

		const view = new DataView(buf.buffer);

		const ts = (view.getUint16(0) + msg.ts);
		const own = !!view.getUint8(2);

		buf = buf.slice(3);

		let i = 0;
		for (; i < buf.length && buf[i] != 0; ++i);

		const s = buf.slice(0, i );
		const m = { ts, own, uid: msg.uid,
			text: decoder.decode(s)
				.replace(/^\[\[([A-z0-9]+)\]\] /, (_, user) => { m.user = user; return ''; })
		};

		msgs.push(m);

		buf = buf.slice(i + 1);
	}

	//msgs.reverse();

	return msgs;
}
