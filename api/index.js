const express = require('express');

const router = express.Router();

router.use('/ticket', require('./ticket'));
router.use('/', require('./admin'));
router.use('/', require('./user'));

module.exports = router;