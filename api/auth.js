const passport = require('passport')
	, express = require('express')
	, { join } = require('path')
	, GoogleStrategy = require('passport-google-oauth20').Strategy
	, oauth2refresh = require('passport-oauth2-refresh')
	, { google } = require('googleapis')
	;

const { post } = require('@common/request');

const { setupUser, sessionChecker } = require('./common');

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive'];
const CONTACT_SCOPE = ['https://www.googleapis.com/auth/contacts.readonly'];
const PHOTO_SCOPE = [
	'https://www.googleapis.com/auth/photoslibrary',
	//'https://www.googleapis.com/auth/photoslibrary.sharing'
];

const PHOTO_API = 'https://photoslibrary.googleapis.com/v1/albums';

// const SCOPES = ['email', ...CONTACT_SCOPE, ...DRIVE_SCOPE, ...PHOTO_SCOPE];
const SCOPES = ['email', ...CONTACT_SCOPE ];
const REDIRECT_URL =  'https://' + Config.domain + '/auth/google/callback/';

const CLIENT_ID = process.env.AUTH_CLIENT_ID || Config.google.client_id;
const CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET || Config.google.client_secret;

const TOKEN_EXPIRE_TIMEOUT = 50 * 60; // 50 min

const kRoot = join(__dirname, '..');

console.debug('OAUTH2:', '\n', 'Client ID:', CLIENT_ID);

// app.use(passport.initialize());
// app.use(passport.session());

// FIREBASE redirect
app.use('/__/auth', express.static(join(kRoot, 'oauth2'), { extensions:['html'] }) );

// passport.serializeUser((user, done) => done(null, user));
// passport.deserializeUser((userDataFromCookie, done) => done(null, userDataFromCookie));

console.log('Using callback url: ', REDIRECT_URL);

const strategy = new GoogleStrategy({
		clientID: CLIENT_ID,
		clientSecret: CLIENT_SECRET,
		callbackURL: REDIRECT_URL,
		scope: SCOPES,
		// accessType: 'offline',
		// includeGrantedScopes: true,
		// prompt: 'consent',
		// approval_prompt: 'force'
	},
	(accessToken, refreshToken, profile, cb) => {
		console.log('User authenticated with Google', profile);
		console.log('Access token:', accessToken);
		console.log('Refresh token', refreshToken);

		profile.accessToken = accessToken;
		profile.accessTokenExpire = Date.seconds() + TOKEN_EXPIRE_TIMEOUT;

		if (refreshToken)
			profile.refreshToken = refreshToken;

		cb(null, profile);
	});

passport.use(strategy);
// oauth2refresh.use(strategy);

const router = express.Router();

router.get('/google/callback'
	, passport.authenticate('google', { 
		failureRedirect: '/'
		, session: true
		, accessType: 'offline' 
	})
	, async (req, res) => {

		const db = app.db;
		const fb = app.firebase;
		const user = req.user;

		console.log('OAuth2 callback:', user);
		req.session.user = user;

		const id = user.id;
		const email = user.emails[0].value;
		const ip = req.socket.remoteAddress;
		const uid = email.hashHex();

	

		const data = { role: 'user' };
		const info = { };

		let update = false, token = user.refreshToken;

		// if (token) {
		// 	data.token = token;
		// 	// fields.push('token');
		// }

		let r, createAlbum = false, createUser;

		try {

			//const r = await db.update('login', uid, data, );

			const fields = ['id', 'name', 'email', 'state', 'login', 'data', 'perm', 'token'];

			r = await db.increment('login', 'login', uid, 1, fields);

			const row = r[0];

			if (row.length > 0) {
				r = Array.isArray(row[0]) ? row[0][0] : row[0];
			}

			if (r.login == 1) {

				data.photo = user.photos[0].value;

				const info = { data };


				if (user.displayName) {
					info.name = user.displayName;
					r.name = user.displayName;
				}

				if (token)
					info.token = token;

				info.data = data;

				update = true;
				//createAlbum = true;
				createUser = true;
				

			}
			else if (token) {
				update = true;
				info.token = token;
				await db.update('login', uid, { token });
			}
			else {
				user.refreshToken = r.token;
			}

			

			console.debug('DB User:', r);

			delete user.id;
			delete user.emails;
			delete user.photos;
			delete user._raw;
			delete user._json;

			Object.assign(user, r);

			setupUser(user);
			
			app.users[user.id] = user;


		}
		catch (e) {
			console.error('Failed to login:', e);
			return res.status(401).end('Not invited');
		}

		
		//const [r, created ] = await app.db.upsert('login', data, fields);
		// console.debug('## LOGIN:', r);

		const oauth2 = getOAuth2Client();
		oauth2.setCredentials({ access_token: user.accessToken});

		try {
			const tokenInfo = await getTokenInfo(oauth2, user.accessToken);
			const scopes = tokenInfo.scopes;

			user.accessTokenExpire = tokenInfo.expiry_date;
			user.google = {
				photo: scopes.includes(PHOTO_SCOPE[0]),
				contact: scopes.includes(CONTACT_SCOPE[0]),
				drive: scopes.includes(DRIVE_SCOPE[0])
			};

			
		}
		catch (e) {
			console.error('Failed to get token info', e);
		}

		if (Config.google.firebase) {
			// todo: add claims
			try {

				if (createUser) {
					const info = await fb.createUser(user);
					console.debug('Firebase user created');
				}

				const token = await fb.createCustomToken(uid);

				user.firebaseToken = token;
				user.firebaseTokenExpire = Date.now() + 58 * 60 * 1000;
			}
			catch (e) {
				console.error('Failed to create custom token', e);
			}
		}

		if (createAlbum && user.google.photo) {

			const album = {
				id: 'sipme',
				title: 'SIPme app shares'
			};

			try {

				const r = await post(PHOTO_API, { album }, null, user.accessToken);

				data.album = r.id;
				console.debug('Album created:', r);
			}
			catch (e) {
				console.error('Failed to create album', e);
			}

		}

		if (update) {
			console.log('Updating user:', info);

			try {
				await db.update('login', uid, info);
			}
			catch (e) {
				console.error('Failed to update user info', e);
			}
		}

		

		if (false) {
			let uid = user.id;

			// note: It could be the first login and the info wont be created yet
			try {
				const info = await app.firebase.getUser(email);
				console.debug('Firebase Auth user:', info);

				uid = info.uid;
			}
			catch (e) {
				console.error('Failed to load Firebase user', email);
			}

			user.email = email;
			user.role = r.role;
			user.su = user.role == 'su';
			user.uid = uid;

			console.log('ON LOGIN:', email, ', isnew:', created, user);
		}

		res.redirect('/');
	}
);

router.post('/refresh', sessionChecker, async (req, res) => {

	const user = req.user;
	const params = req.body;

	const uid = params.uid;
	const now = Date.now();
	const expire = user.accessTokenExpire || 0;

	if (now >= expire) {
		// renew

		console.debug('Refresh access token request:', user.email);

		const oauth2 = getOAuth2Client();
		oauth2.setCredentials({ refresh_token: user.refreshToken });

		try {
			const tokens = await refreshAccessToken(oauth2);
			const tokenInfo = await getTokenInfo(oauth2, tokens.access_token);
			
			user.accessToken = tokens.access_token;
			user.accessTokenExpire = tokenInfo.expiry_date - 5*10*1000;
		}
		catch (e) {
			console.error('Failed to refresh access token', e);
			return res.status(500).end('Failed to refresh access token');
		}
	}

	res.json({
		token: user.accessToken,
		expire: user.accessTokenExpire 
	});

});

module.exports = router;

function checkAuthenticated(req, res, next) {
	if (req.isAuthenticatd()) next();
	else res.status(403).redirect('/');
}

function decodeJwt(token) {
    var segments = token.split('.');

    if (segments.length !== 3) {
      throw new Error('Not enough or too many segments');
    }

    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];
    var signatureSeg = segments[2];

    // base64 decode and parse JSON
    var header = JSON.parse(base64urlDecode(headerSeg));
    var payload = JSON.parse(base64urlDecode(payloadSeg));

    return {
      header: header,
      payload: payload,
      signature: signatureSeg
    }

  }

function base64urlDecode(str) {
	return new Buffer(base64urlUnescape(str), 'base64').toString();
}
  
function base64urlUnescape(str) {
	str += Array(5 - str.length % 4).join('=');
	return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function getOAuth2Client() {
	return new google.auth.OAuth2(
		CLIENT_ID,
		CLIENT_SECRET,
		REDIRECT_URL
	);
}

function refreshAccessToken(oauth2) {

	return new Promise((resolve, reject) => {
		oauth2.refreshAccessToken((err, tokens) => {
			// your access_token is now refreshed and stored in oauth2Client
			// store these new tokens in a safe place (e.g. database)

			if (err) reject(err);
			else resolve(tokens);
		});
		
	});

}

async function getTokenInfo(oauth2, token) {

	const info = await oauth2.getTokenInfo(token);
	const timeout = info.expiry_date - Date.now();

	console.debug('OAUTH2 access token expires in:', Math.ceil(timeout / (60 * 1000)), 'min');
	console.debug('#', info);

	return info;
}


/*

	pavel.patarinski@gmail.com
	refreshToken: '1//09bYrOlCv18esCgYIARAAGAkSNwF-L9IrLY7EUKU0ixRIR6espK-EIc-TwXb07iMjQmcvs7N_wLCkmYUX2uiiifUAWmSyr7DKMZI'
*/

/*

The refresh_token is only provided on the first authorization from the user. Subsequent authorizations, such as the kind you make while testing an OAuth2 integration, will not return the refresh_token again. :)

Go to the page showing Apps with access to your account: https://myaccount.google.com/u/0/permissions.
Under the Third-party apps menu, choose your app.
Click Remove access and then click Ok to confirm
The next OAuth2 request you make will return a refresh_token (providing that it also includes the 'access_type=offline' query parameter.

# Client id from Google Developer console
# Client Secret from Google Developer console
# Scope this is a space seprated list of the scopes of access you are requesting.

# Authorization link.  Place this in a browser and copy the code that is returned after you accept the scopes.
https://accounts.google.com/o/oauth2/auth?client_id=[Application Client Id]&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=[Scopes]&response_type=code

# Exchange Authorization code for an access token and a refresh token.

curl \
--request POST \
--data "code=[Authentcation code from authorization link]&client_id=[Application Client Id]&client_secret=[Application Client Secret]&redirect_uri=urn:ietf:wg:oauth:2.0:oob&grant_type=authorization_code" \
https://accounts.google.com/o/oauth2/token

# Exchange a refresh token for a new access token.
curl \
--request POST \
--data 'client_id=[Application Client Id]&client_secret=[Application Client Secret]&refresh_token=[Refresh token granted by second step]&grant_type=refresh_token' \
https://accounts.google.com/o/oauth2/token

*/

/*

DRIVE:
https://www.googleapis.com/auth/drive	See, edit, create, and delete all of your Google Drive files
https://www.googleapis.com/auth/drive.appdata	See, create, and delete its own configuration data in your Google Drive
https://www.googleapis.com/auth/drive.file	See, edit, create, and delete only the specific Google Drive files you use with this app
https://www.googleapis.com/auth/drive.metadata	View and manage metadata of files in your Google Drive
https://www.googleapis.com/auth/drive.metadata.readonly	See information about your Google Drive files
https://www.googleapis.com/auth/drive.photos.readonly	View the photos, videos and albums in your Google Photos
https://www.googleapis.com/auth/drive.readonly	See and download all your Google Drive files
https://www.googleapis.com/auth/drive.scripts	Modify your Google Apps Script scripts' behavior

CONTACTS:
https://www.googleapis.com/auth/contacts	See, edit, download, and permanently delete your contacts
https://www.googleapis.com/auth/contacts.other.readonly	See and download contact info automatically saved in your "Other contacts"
https://www.googleapis.com/auth/contacts.readonly	See and download your contacts
https://www.googleapis.com/auth/directory.readonly	See and download your organization's GSuite directory
https://www.googleapis.com/auth/user.addresses.read	View your street addresses
https://www.googleapis.com/auth/user.birthday.read	See and download your exact date of birth
https://www.googleapis.com/auth/user.emails.read	See and download all of your Google Account email addresses
https://www.googleapis.com/auth/user.gender.read	See your gender
https://www.googleapis.com/auth/user.organization.read	See your education, work history and org info
https://www.googleapis.com/auth/user.phonenumbers.read	See and download your personal phone numbers
https://www.googleapis.com/auth/userinfo.email	See your primary Google Account email address
https://www.googleapis.com/auth/userinfo.profile	See your personal info, including any personal info you've made publicly available

*/