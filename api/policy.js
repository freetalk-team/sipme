
const express = require('express');

const router = express.Router();

router.get('/privacy', (req, res) => res.render('privacy'));
router.get('/security', (req, res) => res.render('security'));
router.get('/terms', (req, res) => res.render('terms'));

module.exports = router;