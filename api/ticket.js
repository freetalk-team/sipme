const express = require('express')
	, crypto = require('crypto')
	, pako = require('pako')
	;

const { sessionChecker, sessionCheckerAdmin } = require('./common');


const users = new Map;
const router = express.Router();

router.get('/', async (req, res) => {
	const db = app.db;
	// const { table } = req.params;
	const { limit, offset, time, ts, user, ...where } = req.query;
	const email = req.user.email;

	let r, order = 'desc';

	console.log('Ticket List request:', limit, offset, where);

	try {

		// const args = [attr ? attr.split(',') : null];
		const args = { where };

		if (offset) {
			// args.push(offset);
			args.offset = parseInt(offset);

			
		}

		args.limit = limit ? parseInt(limit) : 20;

		if (time) {
			where.time = db.lt(time);
		}


		if (ts) {
			where.time = db.gt(ts);
			order = 'asc';
		}

		args.order = [ ['time', order ] ];

		let table = 'ticketinfo';

		if (user) {
			where[user] = email;
		}
		else {
			table = 'ticket';

			where.owner = db.or(db.eq(null), db.ne(email));
			where.reporter = db.or(db.eq(null), db.ne(email));
			where.status = 'new';
		}

		console.debug('ARGS', args);

		r = await db.ls(table, args);

		console.log('Got results:', r);
	}
	catch (e) {
		console.error('Failed to serch db:', e);
		res.statusCode = 404;
		return res.end('Invalid table: ' + table);
	}

	res.json(r);
});

router.get('/updates', async (req, res) => {

	const db = app.db;

	let { time } = req.query;
	const user = req.user.email;

	let data;

	try {

		const where = db.and(
			db.or({ owner: user}, { reporter: user }), 
			{ time: db.gt(time) }
			);

		const order = [ ['time' ] ];
		const attributes = ['ticket', 'author', 'field', 'time', 'newvalue', 'oldvalue'];

		data = await db.ls('ticketupdate', { where, order, attributes });

	}
	catch (e) {
		console.error('Not found', e);

		return res.status(404).end();
	}

	res.json(data);
});

router.get('/:id', async (req, res) => {

	const db = app.db;

	let { id } = req.params;
	let { time } = req.query;
	// const replace = { 'description': 'desc' };
	// const filter = new Set(['content']);

	let data;


	try {

		id = parseInt(id);

		if (time) {
			// time = parseInt(time);
			// time = dateWithoutTimezone(new Date(parseInt(time)));
			time = new Date(parseInt(time));

			console.debug('TICKET UPDATE', time);

			const where = db.and({ ticket: id }, { time: db.gt(time) });
			const order = [ ['time', 'DESC'] ];

			data = await db.ls('ticketchange', { where, /*order*/ });
			
		}
		else {
			data = await db.get('ticket', id);
		}

		console.debug(data);
		
		res.json(data);
	}
	catch (e) {
		console.error('Not found', id, e);

		res.statusCode = 404;
		res.end();
	}
});



router.delete('/:id', sessionCheckerAdmin, async (req, res) => {


	res.end();
});

// POST

router.post('/update/:id', sessionChecker, async (req, res) => {

	const db = app.db;

	let { id } = req.params;
	const data = req.body;
	const user = req.user.email;

	console.debug('Updating ticket', id, 'by', user, data);

	let oldvalue = '';

	try {

		id = parseInt(id);

		data.author = user;
		data.newvalue = data.value;

		const model = db.model('ticket');
		const ticket = await model.findOne({ where: { id } });
		// const ticket = await db.get('ticket', id);
		// const update = {};

		// console.debug(ticket);

		if (data.field != 'comment') {

			data.oldvalue = ticket[data.field];

			ticket[data.field] = data.value;
			// update[data.field] = data.value;

			// info = await app.db.get('ticket', id, [data.field]);

			// data.oldvalue = [data.field];
			// info[data.field] = data.value;

			if (data.oldvalue == data.newvalue) 
				return res.status(304).end('Same values');

		}

		


		//info.changetime = data.time;
		// await db.update('ticket', id, info);
		// ticket.set('changetime', data.time);
		// ticket.changetime = new Date(data.time);

		// await ticket.update({ changetime: data.time })
		await ticket.save();
		// await db.update('ticket', id, update);

		data.ticket = id;

		console.debug('##', data);

		const r = await db.create('ticketchange', data);
		const time = r.time;

		for (const i of [ticket.owner, ticket.reporter]) {

			if (i && i != user) {

				let id = users.get(i);
	
				if (!id) {
	
					id = await getUserId(db, i);
					users.set(i, id);
				}
	
				console.debug('Sending notification on ticket update', user, i, id);
	
				await app.bot.sendMessage(id, {
					type: 'task',
					id: ticket.id,
					data,
					time
				});
			}
		}

		res.json({ time });

	}
	catch (e) {
		console.error('Failed to update ticket:', e);

		res.status(500).end();
	}

})

router.post('/', sessionChecker, async (req, res) => {
	const db = app.db;

	const data = req.body;
	const reporter = req.user.email;

	let time;

	try {

		let notify = false;


		let { summary, component, milestone, severity, priority, description, type, ...info } = data;

		severity = severity || 'medium';
		priority = priority || 'minor';
		type = type || 'issue';


		// status = status 

		// todo: set state
		// todo: limit only su
		const r = await db.create('ticket', { type, summary, component, milestone, severity, priority, status: 'new', description, reporter });
		// console.debug('New ticket created', r);

		data.id = r.id;

		time = r.time;

		if (notify) {
			app.bot.sendRoomMessage('notify', { type: 'share', ctype: 'task', info: data });
		}
	}
	catch (e) {
		console.error('Failed to update task:', e);
		res.statusCode = 500;
		res.end();
	}

	console.debug('Ticket created:', data.id, time);

	return res.json({ id: data.id, reporter, time, changetime: time });
});

async function getUserId(db, email) {

	console.debug('Get user id:', email);

	const user = await db.find('login', { where: { email } }, ['id']);
	return user.id;
}

module.exports = router;


function dateWithoutTimezone(date) {
	const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
	const withoutTimezone = new Date(date.valueOf() - tzoffset)
	  .toISOString()
	  .slice(0, -1);
	return withoutTimezone;
}
