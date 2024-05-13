
const express = require('express')
	, etag = require('etag')
	;

const router = express.Router();

router.get('/privacy', render.bind('privacy'));
router.get('/security', render.bind('security'));
router.get('/terms', render.bind('terms'));

function render(req, res) {
	const isMobile = req.useragent.isMobile;
	const path = this.valueOf();

	// res.setHeader('ETag', etag(r.content, { weak: true }));
	// res.setHeader('Cache-Control', 'public, max-age=300');

	res.render(path, { isMobile });
}

module.exports = router;
