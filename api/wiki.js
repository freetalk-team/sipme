const express = require('express')
	, etag = require('etag')
	, pako = require('pako')
	;

const marked = require('@common/marked');

const router = express.Router();
	
router.get('/:id', async (req, res) => {

	const isMobile = req.useragent.isMobile;
	const { id } = req.params;

	console.debug('WIKI page:', id, isMobile);

	try {

		const r = await app.db.get('wiki', id, ['content']);
		
		if (r) {

			const md = unzip(r.content)
				.replaceAll('#/', '/doc/')
				;

			const html = marked.parse(md);

			res.setHeader('ETag', etag(r.content, { weak: true }));
			res.setHeader('Cache-Control', 'public, max-age=300');

			return res.render('wiki', { html, isMobile } );
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
