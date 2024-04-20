const express = require('express')
	,  marked = require('@common/marked')
	;


const router = express.Router();

router.get('/', async (req, res) => {

	try {

		const data = await app.db.ls('ticket');
		
		if (data) {

			data.sort((a, b) => b.time - a.time);

			// console.debug('TICKET:', data);
			// console.debug('###', typeof data.time, data.time instanceof Date);

			return res.render('trac/index', { data });
		}

	}
	catch (e) {
		return res.status(500).end();
	}

	res.status(404).end();
});
	
router.get('/:id', async (req, res) => {

	let { id } = req.params;

	console.debug('TRAC page:', id);

	try {

		id = parseInt(id);

		const data = await app.db.get('ticket', id);
		
		if (data) {

			// console.debug('TICKET:', data);
			// console.debug('###', typeof data.time, data.time instanceof Date);

			data.description = marked.parse(data.description);

			return res.render('trac/index', data);
		}

	}
	catch (e) {
		return res.status(500).end();
	}

	
	res.status(404).end();
});



module.exports = router;