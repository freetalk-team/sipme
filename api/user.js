const express = require('express')
	, crypto = require('crypto')
	, { extension, join } = require('path')
	, fs = require('fs/promises')
	, pako = require('pako')
	, multer  = require('multer')
	, upload = multer({ dest: /*os.tmpdir() */ Config.uploads.photo })
	;

const { sessionChecker, sessionCheckerAdmin } = require('./common');

const router = express.Router();

const cache = new Map;

router.get('/search/:table', async (req, res) => {

	const db = app.db;
	
	const { table } = req.params;
	const { what, attr, limit, offset, ...where } = req.query;

	console.log('Search request:', table, what, attr);

	const fields = searchAttributes(db, table);
	const args = [attr ? attr.split(',') : fields];

	if (!Object.empty(where)) {
		args.push(where);
	}

	if (offset) {
		args.push(offset);

		if (limit) {
			args.push(limit);
		}
	}

	let r;

	try {

		r = await db.search(table, what, ...args);
		// console.log('Seach got result:', r);
		// const k = what.toLowerCase();
		// for (const i of r) {

		// 	const matches = i.search.split(' ').map(i => i.split(':')).map(([key, pos]) => [key.slice(1, -1), pos.split(',').map(i => Number(i))]);

		// 	const m = new Map(matches);
		// 	console.log('# MATCH', m.get(k));
		// }

		console.log('Got results:', r);

		for (const i of r) {
			delete i.search;
			// delete i.content;

			if (i.info) {
				const info = i.info;
				delete i.info;

				Object.assign(i, info);
			}

			if (i.description) {
				i.desc = i.description;
				delete i.description;
			}
		}

		res.json(r);
	}
	catch (e) {
		console.error('Failed to serch db:', e);
		res.status(404).end('Invalid table: ' + table);
	}

});

router.get('/:table', async (req, res) => {

	const db = app.db;

	const { table } = req.params;
	const { attr, limit, offset, order, by, ts, ...where } = req.query;

	console.log('List request:', table, attr, limit, offset, where);

	let r;

	// const args = [attr ? attr.split(',') : null];
	const args = {};

	try {

		if (attr) {
			args.attributes = attr.split(',');
		}

		if (!Object.empty(where)) {
			// args.push(where);
			args.where = where;
		}

		if (offset) {
			// args.push(offset);
			args.offset = parseInt(offset);
		}

		if (limit) {
			//args.push(limit);
			args.limit = parseInt(limit);
		}

		const t = tableName(table, true);
		const createdAt = db.createdAt(t);

		if (order) {
			args.order = [ [by == 'ts' ? createdAt : by, order] ];
		}

		if (ts) {

			// // const time = dateWithoutTimezone(new Date(parseInt(ts)));
			// const time = new Date(parseInt(ts));

			// const cond = {};
			// // cond[createdAt] = db.gt(parseInt(ts));
			// cond[createdAt] = db.gt(time);

			if (!args.where) args.where = {};
			if (!args.order) args.order = [];

			// const time = typeof ts == 'string' ? new Date(ts) : ts;
			const time = ts;

			console.debug('TIMESTAMP', time);

			args.where[createdAt] = db.lt(time);
			args.order.push([createdAt, 'DESC']);
		}


		console.debug('ARGS', args);
		r = await app.db.ls(t, args);
		console.debug('Got results:', r);

		for (const i of r) {
			// delete i.content;

			if (i.info) {
				const info = i.info;
				delete i.info;

				Object.assign(i, info);
			}
		}

		// hack
		if (table == 'room') {
			for (const i of r) {
				if (i.members && typeof i.members == 'string')
					i.members = JSON.parse(i.members);
			}
		}
	}
	catch (e) {
		console.error('Failed to serch db:', e);
		res.statusCode = 404;
		return res.end('Invalid table: ' + table);
	}

	res.json(r);
});

router.get('/:table/:id', async (req, res) => {
	const db = app.db;

	const { table, id } = req.params;
	//const { attr } = req.query;
	// const replace = { 'description': 'desc' };
	// const filter = new Set(['content']);

	const name = tableName(table, true); 

	console.debug('Executing default GET routing', table, id);

	try {

		const attr = attributes(db, name, 'content');
		const data = await get(db, name, id, attr);

		// for (const i of Object.keys(replace)) {
		// 	if (i in data) {
		// 		data[replace[i]] = data[i];
		// 		delete data[i];
		// 	}
		// }
		
		
		res.json(data);
	}
	catch (e) {
		console.error('Not found', table, id, e);

		res.statusCode = 404;
		res.end();
	}
});

router.get('/content/:type/:id', async (req, res) => {
	const { type, id } = req.params;
	const params = req.query;

	try {

		console.debug('CONTENT request:', type, req.headers);

		const r = await app.db.get(type, id, ['content']);

		// console.debug('GOT result', r);

		let content;

		if (r.content) {

			res.setHeader('content-encoding', 'deflate');
			content = r.content;
		}
		else
		{

			switch (type) {

				case 'game':
				content = await loadGame(id);
				break;
				

				default:
				res.status(400).end();
				return;
			}

		}

		res.setHeader('content-type', 'text/plain');
		res.end(content);
	}
	catch (e) {
		console.error('Failed to get content:', e);
		res.statusCode = 400;
		res.end();
	}
});

// DELETE
router.delete('/:table/:id', sessionCheckerAdmin, async (req, res) => {

	const { table, id } = req.params;

	try {

		await app.db.rm(table, id);
		await app.firebase.rm(table, id);
	}
	catch (e) {
		console.error('Failed to delete from:', table);
	}

	res.end();
});

// POST
router.post('/torrent', sessionChecker, async (req, res) => {
	const data = req.body;
	const user = req.session.user.uid;
	
	data.user = user;

	const id = data.hash;
	const uri = data.uri;

	if (!(id && uri)) {
		console.error('Invalid torrent data');
		res.statusCode = 400;
		return res.end();
	}

	try {
		const r = await app.firebase.set('torrent', data.hash, data);
		// const id = r.key;

		const info = {
			uri, user,
			files: data.files,
			size: data.files.reduce((a, b) => a + b.size, 0)
		};

		let index = data.desc || '';

		if (data.genre)
			index += ' ' + data.genre;

		index = index.trim();

		console.debug('Torrent info', info);

		await app.db.createOrUpdate('torrent', { id, title: data.title, index, info });

		res.json({ id });
	}
	catch (e) {
		console.error('Failed to create torrent in Firebase:', e);
		res.statusCode = 500;
		return res.end();
	}

});

router.post('/game', sessionChecker, async (req, res) => {

	const data = req.body;

	// if (data.desc) {
	// 	data.description = data.desc;
	// 	delete data.desc;
	// }
	
	data.user = req.session.user.uid;

	if (!data.id) {
		console.error('Failed to create game:', e);
		res.statusCode = 500;
		res.end();
		return;
	}

	try {

		let notify = false;

		const content = zip(data.content);
		const id = data.id;

		data.name = id;

		delete data.content;
		delete data.id;

		await app.firebase.set('game', id, data);

		const { desc, user, ...info } = data;

		// `user` seem to be reserved word in PG
		info.user = user;

		// todo: limit only su
		await app.db.createOrUpdate('game', { id, user, content, description: desc, info });

		if (notify) {
			//app.bot.sendRoomMessage('notify', { type: 'share', ctype: 'game', info: data });
		}
	}
	catch (e) {
		console.error('Failed to update task:', e);
		return res.status(500).end();
	}

	return res.json({ id: data.id });
});

router.post('/wiki', sessionChecker, async (req, res) => {

	const db = app.db;
	const data = req.body;

	console.debug('WIKI update', data);

	let { id, tags, content, full, title, ...rest } = data;

	// s.split(/#+\s+/)[1].trim().split('\n').filter(i => !!i)

	if (!title) {

		let m, thumb;

		const blocks = content
			.replaceAll(/(\$fa-[a-z0-9-]+)(;[a-z]+)?/g, '')
			.split(/#{1,6}\s+/)
			.filter(i => !!i)
			.map(i => i.trim());

		while (blocks.length > 0) {

			// head image
			if (blocks[0].match(/^!\[[^\]]+\]\((.*)\)$/)) {
				thumb = blocks.shift();
				continue;
			}

			[ data.title, data.short ] = blocks[0].split('\n').filter(i => !!i);

			console.debug('Indexed:', data.title, '\n', data.short);

			break;

		}
	
	}

	try {

		data.content = zip(data.content);
		
		// todo: find short

		await db.createOrUpdate('wiki', data);
	}
	catch (e) {
		console.error('Failed to update wiki:', e);
		return res.status(500).end();
	}

	res.end();
});

router.post('/radio', /*sessionChecker,*/ async (req, res) => {

	const data = req.body;
	
	//data.user = req.session.user.uid;
	// todo: check su


	try {

		let notify = false;

		if (data.id) {
			await app.firebase.set('radio', data);
		}
		else {
			const r = await app.firebase.push('radio', data);
			data.id = r.key;

			notify = true;
		}

		const { id, name, tag, ...info } = data;

		// todo: set state
		// todo: limit only su
		await app.db.createOrUpdate('radio', { id, name, tag, info });

		if (notify) {
			app.bot.sendRoomMessage('notify', { type: 'share', ctype: 'radio', info: data });
		}
	}
	catch (e) {
		console.error('Failed to update radio:', e);
		res.statusCode = 500;
		res.end();
	}

	return res.json({ id: data.id });
});

router.post('/profile', sessionChecker, upload.single('file'), async (req, res) => {

	const db = app.db;

	const data = req.body;
	const file = req.file;
	const id = req.user.id;

	console.debug('PROFILE UPDATE:', data);

	if (file) {
		//buf = await fs.readFile(files.photo.path);

		//const ext = extension(file);
		//const path = join(Config.uploads.photo, id.toString() + ext);
		
		//await fs.copyFile(files.photo.path, path);

		data.photo = file.path.startsWith('public') 
			? file.path.slice(7)
			: file.path
			;
	}

	const { name, ...info } = data;
	const update = { data: info };

	if (name)
		update.name;

	try {

		await db.update('login', id, update);

		console.debug('Profile updated:', data);

		res.json(data);

	}
	catch (e) {
		console.error('Failed to update profile', e);
		req.status(500).end();
	}
});

router.post('/login', sessionChecker, async (req, res) => {
	// todo: check su
	const db = app.db;

	// console.debug(req.body);
	const { name, email } = req.body;

	const id = email.hashHex();
	const password = (email.split('@')[0] + '123').md5()

	const data = { id, name, email, password, state: 'initial', login: 0 };

	try {

		await db.createOrUpdate('login', data, 'state', 'login');

	}
	catch (e) {
		console.error('Failed to create user', e);
		return res.status(400).end();
	}

});

router.post('/register', sessionChecker, async (req, res) => {

	const { token } = req.body;
	const uid = req.user.id;

	try {

		const r = await app.firebase.subscribeTopic(uid, token);

		console.log('FCM device subscribed:', uid, r);

		res.end();
	}
	catch (e) {

		console.error('FCM failed to register user token', e);
		res.statusCode = 500;

	}

	res.end();
}); 

module.exports = router;

function attributes(db, table, ...ignore) {
	const filter = new Set(ignore);

	let all;

	switch (table) {

		case 'user':
		all = ['id', 'name', 'email', 'data'];
		break;

		default:
		all = db.attributes(table);
		break;
	}

	return all.filter(i => !filter.has(i));
}

function searchAttributes(db, table) {

	const common = ['created', 'updated']

	// switch (table) {

	// 	case 'user':
	// 	return attributes(table, 'login', 'password', 'state', ...common);

	// }

	return attributes(db, table, 'content', ...common);
}

function tableName(table, read) {

	// todo: improve, 'room' with 'room_view'
	switch (table) {
		case 'room':
		if (read) table = 'roommembers'
		break;
	}

	return table;
}

async function get(db, table, ...args) {

	const r = await db.get(table, ...args);

	if (r.data) {
		Object.assign(r, r.data);
		delete r.data;
	}

	if (r.info) {
		Object.assign(r, r.info);
		delete r.info;
	}
	

	return r;
}

async function loadGame(id) {

	const root =  join(__dirname, '../../..', 'games', id)
	const path = join(root, 'index.js');
	//const path = join(__dirname, '../../..', 'games', id, 'bundle.js');
	return fs.readFile(path, 'utf8');
}

function zip(content) {
	return Buffer.from(pako.deflate(content));
}

function dateWithoutTimezone(date) {
	const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
	const withoutTimezone = new Date(date.valueOf() - tzoffset)
	  .toISOString()
	  .slice(0, -1);
	return withoutTimezone;
}

/*

update track set rating = rating + 10 where id = 144152763;

*/

/*

app.get('/describe', function(req, res) {
  var form = new FormData();
  form.append('part1', 'part 1 data');
  form.append('part2', 'part 2 data');
  res.setHeader('x-Content-Type', 'multipart/form-data; boundary='+form._boundary);
  res.setHeader('Content-Type', 'text/plain');
  form.pipe(res);
});

*/

/*

Wikipedia 

https://en.wikipedia.org/wiki/Main_Page

search
https://en.wikipedia.org/w/index.php?search=curl+program&ns0=1

*/

