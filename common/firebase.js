
const functions = require('firebase-functions');
const firebase = require('firebase-admin');


class FirebaseAdmin {

	get database() { return firebase.database(); }
	get messaging() { return firebase.messaging(); }

	init(emulator=false) {

		const config = Config.google;
		console.log('Using firebase config', config);

		const projectId = process.env.FB_PROJECT_ID || config.firebase.projectId;
		const databaseURL = config.firebase.databaseURL;
		const sa = process.env.FB_SA ? JSON.parse(process.env.FB_SA) : config.firebase.sa;

		if (emulator || config.emulator) {
			// console.log('Firebase using emulator');

			process.env.FIREBASE_DATABASE_EMULATOR_HOST = config.emulators.database;
			process.env.FIREBASE_AUTH_EMULATOR_HOST = config.emulators.auth;
			process.env.FIREBASE_STORAGE_EMULATOR_HOST = config.emulators.storage;
	
			firebase.initializeApp({
				projectId
				//, databaseURL: `http://${config.emulators.database}/?ns=${config.web.projectId}`
				, databaseURL: `http://${config.emulators.database}/?ns=${config.web.projectId}-default-rtdb`
				//, authorizationURL: `http://${config.emulators.auth}/`
				, credential: firebase.credential.cert(sa)
			});
		}
		else {
			firebase.initializeApp({
				projectId
				, credential: firebase.credential.cert(sa)
				//, databaseURL
			});
		}

		this.auth = firebase.auth();
		// this.db = firebase.database();
	}

	getUser(email) {
		return this.auth.getUserByEmail(email);
	}

	offline() {
		this.database.goOffline();
	}

	decodeIdToken(token) {
		const auth = firebase.auth();
		const user = auth.verifyIdToken(token);
		// const info = auth.getAdditionalUserInfo(user);

		//console.log('### IS NEW USER:', JSON.stringify(user, null, 2));

		return user;
	}


	ref(path) {
		return this.database.ref(path);
	}

	rm(table, key) {
		const ref = this.ref(`${table}/${key}`);
		return ref.remove();
	}

	ls(table, index, value) {
		return new Promise((resolve, reject) => {

			let ref = this.ref(table);

			if (index) {

				const q = ref.orderByChild(index).equalTo(value);
				ref = q;
			}
			
			ref.once('value', snapshot => {
				if (snapshot.exists())
					resolve(snapshot.val());
				else
					// reject('Snapshot not exists: ' + table);
					resolve(null);
			});

			
		});
	}

	tail(table, limit) {
		return new Promise((resolve, reject) => {

			let ref = this.ref(table);
			
			ref.orderByKey().limitToLast(limit).once('value', snapshot => {

				if (!snapshot.exists()) {
					return reject();
				}

				const res = [];

				snapshot.forEach((data) => {
					res.push(data.val());
				});

				resolve(res);

			});
			
		});
	}

	get(table, key, onchange) {
		const path = key ? `${table}/${key}` : table;
		const ref = this.ref(path);

		if (onchange) {
			ref.on('value', snapshot => onchange(snapshot.val()));
			return;
		}

		return new Promise((resolve, reject) => {

			ref.once('value', snapshot => {
				// console.debug('FB get result:', snapshot.exists());

				// if (snapshot.exists()) {
				// 	resolve(snapshot.val());
				// }
				// else
				// 	reject();

				resolve(snapshot.exists() ? snapshot.val() : undefined);
			});
		});
	}

	fetch(path) {
		const ref = this.ref(path);
		return new Promise((resolve) => ref.once('value', snapshot => resolve(snapshot.exists() ? snapshot.val() : undefined)));
	}

	data(table, key, onchange) {
		const ref = this.ref(`data/${table}/${key}`);

		if (onchange) {
			ref.on('value', snapshot => onchange(snapshot.val()));
			return;
		}

		return new Promise((resolve, reject) => {

			ref.once('value', snapshot => {
				if (snapshot.exists()) {
					resolve(snapshot.val());
				}
				else
					reject();
			});
		});
	}

	set(table, ...args) {

		let path = table;

		while (args.length > 1)
			path += `/${args.shift()}`;

		const data = args[0];
		const ref = this.ref(path);

		Object.deleteUndefined(data);

		return ref.set(data);
	}

	push(table, data) {
		const ref = this.ref(table);
		return ref.push(data);
	}

	onwrite(path, callback) {
		console.debug('FB registering onWrite callback', path);
		const r = functions.database.ref(path);
		r.onWrite(callback);
	}

	oncreate(path, callback) {
		console.debug('FB registering onCreate callback:', path);
		const r = functions.database.ref(path);
		r.onCreate(callback);
	}

	async upload(file, destination) {

		const config = kConfig.firebase;
		const bucket = firebase.storage().bucket(config.storage.bucket);

		const res = await bucket.upload(file, {
			destination
			// , gzip: true
			, metadata: {
				cacheControl: 'public, max-age=31536000'
			}
		});

		const link = res[1].mediaLink;

		return link;
	}

	async createUser(info) {

		const { id, email, name, phone, photo, ...r } = info;
		const data = {
			uid: id,
			email,
			emailVerified: true,
			// password: 'secretPassword',
			displayName: name,
			disabled: false,
		};

		if (phone)
			data.phoneNumber = phone;

		if (photo)
			data.photoURL = photo;

		let uid;

		try {

			const r = await this.auth.createUser(data);

			uid = r.uid;
			info.id = uid;
		}
		catch (e) {
			console.error('Failed to create Firebase user', e);
		}

		return uid;
	}

	async createCustomToken(uid, claims={}) {

		let token, expires;

		try {

			token = await this.auth.createCustomToken(uid, claims);
			expires = Date.now() + 55 * 60 * 1000;

			return [ token, expires ];

		}
		catch (e) {
			console.error('Failed to create custom token for user:', uid);
		}
	}

	subscribeTopic(topic, token) {
		console.debug('FCM subscribing for topic:', topic, token);
		return this.messaging.subscribeToTopic([token], topic);
	}

	unsubscribeTopic(topic, token) {
		return this.messaging.unsubscribeFromTopic([token], topic);
	}
}

module.exports = {
	FirebaseAdmin
}