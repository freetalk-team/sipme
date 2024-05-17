require('module-alias/register');

const express = require('express')
	, { join, resolve } = require('path')
	, favicon = require('serve-favicon')
	, useragent = require('express-useragent')
	;

require('@common/utils');
require('@common/logger');


const kPort = process.env.PORT || 3010;
const isProduction = process.env.NODE_ENV == 'production';

var app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname ));
app.use(express.static(resolve(__dirname, '..', 'public')));

app.listen(kPort, async function() {
	console.log('Express server listening on port', kPort);
});
