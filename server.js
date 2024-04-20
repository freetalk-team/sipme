require('module-alias/register');

const express = require('express')
	, { join, resolve } = require('path')
	, passport = require('passport')
	, flash = require('connect-flash')
	, utils = require('./utils')
	, bcrypt = require('bcrypt')
	, logger = require('morgan')
	, cookieParser = require('cookie-parser')
	, bodyParser = require('body-parser')
	, methodOverride = require('method-override')
	, session = require('express-session')
	, favicon = require('serve-favicon')
	, cors = require('cors')

	, LocalStrategy = require('passport-local').Strategy
	// , RememberMeStrategy = require('passport-remember-me').Strategy
	, RememberMeStrategy = require('./node/passport-remember-me/lib').Strategy
	;

const { setupUser } = require('./api/common');
	

require('@common/utils');
require('@common/logger');


const kPort = process.env.PORT || 3000;

const ALLOWED_DOMAINS = [
	{
		// origin: 'https://photoslibrary.googleapis.com',
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		credentials: true
	}
];

const { Config, ConfigUI } = loadConfiguration();

console.debug('CONFIG:', Config);

global.Config = Config;

const { Database } = require('@common/db');
const { FirebaseAdmin } = require('@common/firebase');
const { Bot } = require('@service/notify/bot');

const db = new Database;
const firebase = new FirebaseAdmin;
const bot = new Bot(Config.sip.internal, Config.sip.bot);


function cors_(origins) {
	return (req, res, next) => {
		for (const { origin, methods, credentials } of origins) {
			res.setHeader('Access-Control-Allow-Origin', origin);
			if (methods) {
				res.setHeader('Access-Control-Allow-Methods', methods.join(','));
			}
			res.setHeader('access-control-allow-headers', 'Origin,Accept,X-Requested-With, Content-Type');

			if (credentials)
				res.setHeader('Access-Control-Allow-Credentials', 'true');
		}
		
		next();
	}
}

/* Fake, in-memory database of users */

const users = {};
// async function findById(id, fn) {

// 	try {

// 		const user = await db.find('user', { where: { id } });

// 		fn(null, user);

// 	} catch(err) {
// 		fn(err);
// 	}
// }

async function findById(id, fn) {

	let user = users[id];

	if (user) {

		const now = Date.now();

		if (user.firebaseTokenExpire && user.firebaseTokenExpire < now) {

			try {
				const token = await firebase.createCustomToken(id);

				user.firebaseToken = token;
				user.firebaseTokenExpire = now + 58 * 60 * 1000;
			}
			catch (e) {
				console.error('Failed to create Firebase token', e);
				delete user.firebaseToken;
				delete user.firebaseTokenExpire;
			}

		}

		fn(null, user);
	} else {

		try {

			const attributes = ['id', 'name', 'email', 'state', 'data', 'perm', 'token'];
			
			user = await db.find('login', id, attributes);

			if (user) {
				setupUser(user);

				users[user.id] = user;

				fn(null, user);
			}
			else {
				fn(new Error('User ' + id + ' does not exist'));
			}
	
		} catch(err) {
			fn(err);
		}

	}
  }
  

function findByUsername(username, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}

/* Fake, in-memory database of remember me tokens */

var tokens = {}

function consumeRememberMeToken(token, fn) {
	var uid = tokens[token];
	// invalidate the single-use token
	delete tokens[token];
	return fn(null, uid);
}

function saveRememberMeToken(token, uid, fn) {
	tokens[token] = uid;
	return fn();
}



// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
	console.debug('SERIALIZE:', user);

	if (user.provider == 'google') {

		const email = user.emails[0].value;
		const id = email.hashHex();

		done(null, id);
	}
	else {
		done(null, user.id);
	}
});

passport.deserializeUser(function(id, done) {
	console.debug('Deserialize user:', id);

	findById(id, function (err, user) {
		done(err, user);
	});
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
	function(username, password, done) {
		// asynchronous verification, for effect...
		process.nextTick(async function () {
			
			// Find the user by username.  If there is no user with the given
			// username, or the password is not correct, set the user to `false` to
			// indicate failure and set a flash message.  Otherwise, return the
			// authenticated `user`.

			// const User = db.model('user');

			// const r = await User.increment('login', { 
			// 	by: 1,
			// 	// where: db.and({ email: username }, { password: password.hashMD5() }), 
			// 	where: { id: 0 },
			// 	returning: true
			// });

			const fields = ['id', 'name', 'email', 'state', 'data', 'perm'];
			const id = username.isEmail() ? username.hashHex() : username;
			const r = await db.increment('login', 'login', db.and({ id }, { password: password.md5() }), 1, fields);
					

			// const r = await User.update(
			// 	// { login: db.literal('login + 1') }, 
			// 	{ login: 1 }, 
			// 	{ 
			// 		// where: db.and({ email: username }, { password: password.hashMD5() }), 
			// 		where: { id: 0 },
			// 		// returning: true 
			// 	}
			// );

			console.debug(r);

			const row = r[0];

			if (row.length > 0) {

				const user = Array.isArray(row[0]) ? row[0][0] : row[0];

				if (user) {

					setupUser(user);
					console.debug('USER found:', user);

					users[user.id] = user;

					return done(null, user);
				}				
			}

			return done(null, false, { message: 'Unknown user ' + username });
		});
	}
));


// Remember Me cookie strategy
//   This strategy consumes a remember me token, supplying the user the
//   token was originally issued to.  The token is single-use, so a new
//   token is then issued to replace it.
passport.use(new RememberMeStrategy(
	function(token, done) {
		consumeRememberMeToken(token, function(err, uid) {
			if (err) { return done(err); }
			if (!uid) { return done(null, false); }
			
			findById(uid, function(err, user) {
				if (err) { return done(err); }
				if (!user) { return done(null, false); }
				return done(null, user);
			});
		});
	},
	issueToken
));

function issueToken(user, done) {
	var token = utils.randomString(64);
	saveRememberMeToken(token, user.id, function(err) {
		if (err) { return done(err); }
		return done(null, token);
	});
}


var app = express();

// configure Express
app.set('views', __dirname + '/views');
// app.set('views', [__dirname + '/views', __dirname + '/public']);
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));
app.use(logger('dev', { skip: function (req, res) { return res.statusCode < 400 } }));
app.use(express.static(__dirname + '/public'));
// favicon
app.use(favicon(join(__dirname, 'public/ui/ico', 'favicon.ico')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride());
app.use(session({ secret: 'faASKdkdsannnn', resave: false, saveUninitialized: false }));
app.use(flash());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));

// app.options('*', (req, res) => {

// 	console.log('OPTIONS preflight request');

// 	// set CORS headers for preflight request
// 	res.header("Access-Control-Allow-Origin", "https://photoslibrary.googleapis.com");
// 	res.header("Access-Control-Allow-Methods", "GET, POST");
// 	res.header("Access-Control-Allow-Headers", "Content-Type");
// 	res.header("Access-Control-Allow-Credentials", "true");
// 	res.send('CORS headers set');
// });

// app.use(cors(
// 	{
// 		origin: 'https://photoslibrary.googleapis.com',
// 		methods: 'GET,POST',
// 		allowedHeaders: 'Content-Type,Authorization',
// 		credentials: true,
// 		preflightContinue: false,
	
// 	}
// ));


app.disable('x-powered-by');


//app.get('/', cors(ALLOWED_DOMAINS), function(req, res){
//app.get('/', cors(corsOptions), function(req, res){
app.get('/', function(req, res){
	res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
	res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
	res.render('login', { user: req.user, message: req.flash('error') });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login', 
	passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
	function(req, res, next) {

		console.debug('ON LOGIN', req.user);

		// Issue a remember me cookie if the option was checked
		if (!req.body.remember_me) { return next(); }
		
		issueToken(req.user, function(err, token) {
			if (err) { return next(err); }
			res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 });
			return next();
		});
	},
	function(req, res) {
		res.redirect('/');
	});

app.get('/logout', function(req, res){
	// clear the remember me cookie when logging out
	res.clearCookie('remember_me');
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
	// req.logout();
	// res.redirect('/');
});

app.post('/setup', ensureAuthenticated, async (req, res) => {

	const user = req.user;

	console.debug('SETUP request', user.id, req.body);

	const { fname, lname, email, phone, dd, mm, yyyy, password } = req.body;
	const name = `${fname} ${lname}`;

	const data = db.info('login', user, 'data');

	Object.assign(data, {
		phone,
		dob: `${dd}-${mm}-${yyyy}`
	});

	if (user.photo)
		data.photo = user.photo;

	try {

		await db.update('login', req.user.id, { 
			name,
			email,
			password: password.md5(),
			state: 'complete',
			data 
		});

		const rooms = app.rooms.map(i => ({
			username: req.user.id, 
			domain: Config.sip.domain, 
			room: `sip:${i}@${Config.sip.internal}`, 
			flag: 0 
		}));

		await db.createOrUpdate('member', rooms);

		Object.assign(req.user, { name, email, complete: true });
	}
	catch (e) {
		console.error('Failed to setup user', e);
	}

	res.redirect('/');

}); 

app.get('/config', (req, res) => {
	const js = 'var Config = ' + JSON.stringify(ConfigUI);

	res.setHeader('Content-Type', 'text/javascript');
	res.end(js);
});

app.get('/user', (req, res) => {

	const { refreshToken, token, password, state, ...info } = req.user;

	const js = 'var User = ' + JSON.stringify(info);

	res.setHeader('Content-Type', 'text/javascript');
	res.end(js);
});

// app.get('/sw', (req, res)) {
// 	res.render('sw', ConfigUI.firebase);
// }

app.db = db;
app.firebase = firebase;
app.bot = bot;
app.users = users;

global.app = app;

// routings
app.use('/api', require('./api'));
app.use('/doc', require('./api/wiki'));
app.use('/trac', require('./api/trac'));
app.use('/policy', require('./api/policy'));

if (Config.google) {
	app.use('/auth', require('./api/auth'));
}

app.listen(kPort, async function() {

	try {
		
		await db.init('', join(__dirname, 'db') );
		
		if (Config.google && Config.google.firebase) {
			firebase.init();
		}

		const data = await db.ls('room', { where: { domain: Config.sip.internal }});
		const rooms = data.map(i => i.name);

		console.log('INTERNAL rooms:', rooms);

		app.rooms = rooms;

		bot.start();

	}
	catch (e) {
		console.error('Failed to load internal rooms', e);
	}


	console.log('Express server listening on port', kPort);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login')
}

function loadConfiguration() {
	const kConfigFile = process.env.CONFIG || join(__dirname, 'config', 'local.yaml');
	const Config = loadConfig(kConfigFile);

	// todo: Check sip proxy domain and add it ALLOWED_DOMAINS

	if (Config.uploads) {

		for (const [i, path] of Object.keys(Config.uploads))
			Config.uploads[i] = resolve(path);
	}

	const ConfigUI = Object.assign({
		title: Config.title,
		domain: Config.domain,
		...Config.ui
	},

	{ 
		sip: Object.assign({}, Config.sip, Config.ui.sip) 
	});

	if (Config.google && Config.google.firebase) {

		const projectId = process.env.FB_PROJECT_ID;
		if (projectId) {
			ConfigUI.firebase = {
				projectId,
				apiKey: process.env.FB_API_KEY,
				authDomain: `${projectId}.firebaseapp.com`,
				storageBucket: `${projectId}.appspot.com`,
				messagingSenderId: parseInt(process.env.FB_MESSAGING_SENDER_ID),
				appId: process.env.FB_APP_ID,
				measurementId: process.env.FB_MEASUREMENT_ID
			};
		}
		else {
			ConfigUI.firebase = Config.google.firebase.web;
		}
	}

	Object.freeze(Config);
	Object.freeze(ConfigUI);

	return { Config, ConfigUI }
}