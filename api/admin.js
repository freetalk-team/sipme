const express = require('express')
	, crypto = require('crypto')
	, pako = require('pako')
	;

const { sessionChecker, sessionCheckerAdmin } = require('./common');

const router = express.Router();

// UPDATE
router.post('/user', sessionCheckerAdmin, async (req, res) => {

	console.debug('User create request', req.body);

	const db = app.db;
	const { firstname, lastname, name, email } = req.body;

	// invite user

	// const name = firstname + ' ' + lastname;
	const id = email.hashHex();
	const password = (email.split('@')[0] + '123').md5();

	try {

		await db.create('login', { id, name, email, password });

		res.json({ id });

		// todo: send email
	}
	catch (e) {
		console.error('Failed to create user', e);

		res.status(500).end();
	}
});

router.post('/room', sessionCheckerAdmin, async (req, res) => {

	console.debug('Room create request', req.body);

	const db = app.db;
	const { name, ns, topic } = req.body;

	let info;

	try {

		const display = name;

		info = { display, topic };

		const Sip = Config.ui.sip;

		const domain = ns || Sip.domain;
		const roomname = Sip.room + name.trim().replace(/\s+/g, '-').toLowerCase();

		const r = await db.create('room', { name: roomname, domain, flag: 0, info });
		info = r.dataValues;

		// const uri = 'sip:' + roomname + '@' + domain;

		res.json({ id: info.id, name: roomname, display });

		// todo: send email
	}
	catch (e) {
		console.error('Failed to create user', e);

		res.status(500).end();
	}
});

router.post('/member/:roomid', sessionCheckerAdmin, async (req, res) => {
	const db = app.db;
	const { roomid } = req.params;
	const members = req.body;

	try {

		const where = db.and({ name: roomid }, { domain: Config.ui.sip.domain });
		// const info = await db.find('room', parseInt(roomid));
		const info = await db.find('room', { where });

		if (info) {

			const domain = info.domain;
			const room = `sip:${info.name}@${domain}`;
			const users = [];

			for (const i of members)
				users.push({ username: i, domain, room, flag: 0 });

			await db.createOrUpdate('member', users);

		}
		else {
			req.statusCode = 404;
		}

	}
	catch (e) {
		console.error('Failed to update room members', e);
		req.statusCode = 500;
	}

	res.end();
});

// DELETE
router.delete('/member/:room/:username', sessionCheckerAdmin, async (req, res) => {
	const db = app.db;
	const { room, username } = req.params;

	try {

		const q = `delete from member where id=(select id from member_room where rid=${room}) and username='${username}'`

		await db.query(q);

	}
	catch (e) {
		console.error('Failed to delete member', e);
	}
});

router.delete('/room/:roomid', sessionCheckerAdmin, async (req, res) => {

	const db = app.db;
	const { roomid } = req.params;

	try {

		// todo: use delete with returning ???
		// const where = db.and({ name: roomid }, { domain: Config.ui.sip.domain });
		const id = parseInt(roomid);
		const info = await db.find('room', id);

		const room = `sip:${info.name}@${info.domain}`;

		await db.rm('member', { room });
		await db.rm('room', id);

	}
	catch (e) {
		console.error('Failed to delete room:', roomid);
	}
});

module.exports = router;
