const express = require('express')
	, pako = require('pako')
	,  marked = require('@common/marked')
	;


const router = express.Router();
	
router.get('/:id', async (req, res) => {

	const { id } = req.params;

	console.debug('WIKI page:', id);

	try {

		const r = await app.db.get('wiki', id, ['content']);
		
		if (r) {

			const md = unzip(r.content)
				.replaceAll('#/', '/doc/')
				;

			const html = marked.parse(md);

			return res.render('wiki', { html } );
		}

	}
	catch (e) {
		return res.status(500).end();
	}

	
	res.status(404).end();
});

function unzip(content) {
	return pako.inflate(content, { to: 'string'});
}

module.exports = router;