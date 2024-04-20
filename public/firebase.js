

// import { initializeApp } from "./ui/lib/firebase-10.7.0/app.js";
// import * as Auth from "./ui/lib/firebase-10.7.0/auth.js";
// import * as Database from "./ui/lib/firebase-10.7.0/database.js";
// import * as Storage from './ui/lib/firebase-10.7.0/storage.js';
// import * as Messaging from  './ui/lib/firebase-10.7.0/messaging.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import * as Auth from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import * as Database from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import * as Storage from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import * as Messaging from  'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js';

export class Firebase {

	#timeout;
	#nextOnline;
	#state = 'disconnected';
	#offline = [];
	#token;

	get currentUser() {
		return this.auth.currentUser;
	}

	get connected() { return this.#state == 'connected'; }
	get offline() { return this.#state == 'disconnected'; }

	constructor() {

		const kConfig = Config.firebase;
		const kUserEmulator = Config.firebase.emulator || false;
		const isSecure = location.protocol.startsWith('https');

		if (!(kUserEmulator || isSecure)) {
			console.error('Failed to connect to firebase on not secured connection');
			return;
		}

		const firebase = initializeApp(kConfig);


		const auth = Auth.getAuth(firebase);
		const storage = Storage.getStorage(firebase);
		const messaging = Messaging.getMessaging();

		if (kUserEmulator) {

			const hostname = location.hostname;
			console.log('Firebase: Using emulator =>', hostname);

			Auth.connectAuthEmulator(auth, kEmulators.auth.url, { disableWarnings: true });
			Database.connectDatabaseEmulator(db, kEmulators.database.host, kEmulators.database.port);
			Storage.connectStorageEmulator(storage, kEmulators.storage.host, kEmulators.storage.port);
		}
		// else {
		// 	messaging = getMessaging(firebase);

		// 	onMessage(messaging, payload => this.#onMessage(payload));
		// }

		Messaging.onMessage(messaging, data => this.#onMessage(data));


		this.auth = auth;
		this.storage = storage;
		this.messaging = messaging;

	}

	async connect(token) {
		token = Array.isArray(token) ? token[0] : token;
		return Auth.signInWithCustomToken(this.auth, token);
	}

	onAuthStateChanged(...args) {
		Auth.onAuthStateChanged(this.auth, ...args);
	}

	
	signOut() {
		Auth.signOut(this.auth);
		//return this.messaging.getToken({ vapidKey: Config.firebase.vapidKey });
	}

	
	async uploadImage(path, data, type='png') {
		
		const { ref, uploadString,  getDownloadURL } = Storage;

		const r = ref(this.storage, path);

		const res = await uploadString(r, data, 'data_url');
		const url = await getDownloadURL(res.ref);

		console.log('Upload result', url);

		return url;
	}

	async uploadFile(path, fileOrBlob, type='png') {

		const { ref, uploadBytes,  getDownloadURL } = Storage;

		path += '/' + fileOrBlob.name;

		const r = ref(this.storage, path);

		const metadata = typeof type == 'string' ? { contentType: fileX.getMimeType(type) } : type;

		// todo: add torrent progress
		const res = await uploadBytes(r, fileOrBlob, metadata);
		const url = await getDownloadURL(res.ref);

		console.log('Upload result', url);

		return url;
	}

	async uploadPhoto(data, type='png') {
		const path = `/photo/${app.uid}`;
		const url = this.uploadImage(path, data, type);

		URL.revokeObjectURL(data);

		return url;
	}

	async loadContacts() {
		const url = 'https://people.googleapis.com/v1/people/me/connections'

		var accessToken = app.accessToken; // Here gapi is used for retrieving the access token.
		console.debug('USING ACCESS TOKEN:', accessToken);
		//var form = new FormData();
		//form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
		//form.append('file', file);

		var xhr = new XMLHttpRequest();
		xhr.open('get', url);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.responseType = 'json';
		xhr.onload = () => {

			console.log('### CONTACTS loaded', xhr.response);

			//document.getElementById('content').innerHTML = "File uploaded successfully. The Google Drive file id is <b>" + xhr.response.id + "</b>";
			//document.getElementById('content').style.display = 'block';
		};
		xhr.send();
	}

	updateProfile(info) {
		return Auth.updateProfile(this.auth.currentUser, info);
	}

	getRegistrationToken(registration) {

		const params = {
			vapidKey: Config.firebase.vapidKey
		};

		if (registration)
			params.serviceWorkerRegistration = registration;

		return Messaging.getToken(this.messaging, params);
	}

	#onMessage(data) {

		console.debug('FCM message received');

		app.onPushMessage(data);
	}
}

