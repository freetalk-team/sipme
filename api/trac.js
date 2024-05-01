const express = require('express')
	, etag = require('etag')
	;

const marked = require('@common/marked');

const router = express.Router();

router.get('/', async (req, res) => {

	const isMobile = req.useragent.isMobile;
	const { o } = req.query;

	const params = { offset: 0, limit: 10 };

	if (!isNaN(o))
		params.offset = parseInt(o);

	try {


		const data = await app.db.ls('ticket', params);
		
		if (data) {

			data.sort((a, b) => b.time - a.time);

			const less = params.offset >= params.limit ? params.offset - params.limit + 1 : false;
			const more = data.length == params.limit ? params.offset + params.limit + 1 : false;

			// console.debug('TICKET:', data);
			// console.debug('###', typeof data.time, data.time instanceof Date);

			return res.render('trac/index', { data, isMobile, more, less });
		}

	}
	catch (e) {
		return res.status(500).end();
	}

	res.status(404).end();
});
	
router.get('/:id', async (req, res) => {

	const isMobile = req.useragent.isMobile;

	let { id } = req.params;

	console.debug('TRAC page:', id);

	try {

		id = parseInt(id);

		const data = await app.db.get('ticketinfo', id);
		
		if (data) {

			 console.debug('TICKET:', data);
			// console.debug('###', typeof data.time, data.time instanceof Date);

			data.description = marked.parse(data.description);
			data.isMobile = isMobile;

			res.setHeader('ETag', etag(JSON.stringify(data), { weak: true }));
			res.setHeader('Cache-Control', 'public, max-age=300');

			return res.render('trac/index', data);
		}

	}
	catch (e) {
		return res.status(500).end();
	}

	
	res.status(404).end();
});



module.exports = router;
