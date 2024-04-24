
import { Firebase } from '../firebase.js';

const FirebaseMixin = {

	_pushMessages: new CacheMap({ maxCacheTime: 30_000 })

	, async startFirebase() {


		const token = this.user.firebaseToken;

		try {

			console.debug('Connecting firebase: ', token);

			if (token) {
				const firebase = new Firebase;

				const user = await firebase.connect(token);
				console.debug('Firebase connected:', user);

				await startServiceWorker(firebase);

				this.firebase = firebase;
			}

		}
		catch (e) {
			console.error('Firebase failed to connect:', e);
		}

	}

	, async onPushMessage(msg) {

		if (msg.messageType/* == 'notification-clicked'*/) {
			console.debug('Click notification skipped!');
			return;
		}

		const { notification, data, messageId, fcmMessageId } = msg;
		let { body, title } = notification;

		console.debug('APP push received', msg);

		const msgid = messageId || fcmMessageId;
		const { user, room, type } = data;

		switch (type) {

			case 'invite':
			console.debug('PUSH incomming call');
			this.messenger.register();
			break;

			// case 'game':
			// break;

			default: {
				const info = { user };

				if (room)
					info.room = room;

				if (data.body)
					body = JSON.parse(data.body);

				this.onMessage(info, body, true);
			}
			break;

		}
	}
}

export {
	FirebaseMixin
}


async function startServiceWorker(firebase) {
	if ('serviceWorker' in navigator) {

		const id = `did-${app.uid}`;

		let sw;
		let token = localStorage.getItem(id);

		const opt = {
			scope: '/',
			//type: 'module'
		};

		const params = new URLSearchParams(Object.entries(Config.firebase));
		const path = '/sw.js?' + params.toString();

		const registration = await navigator.serviceWorker.register(path, opt);
		
		if (!token) {

			token = await firebase.getRegistrationToken(registration);

			console.log('Registration token:\n', token);

			try {

				// const { key } = await ajax.post('/app/register', { token });
				// this.deviceId = key;

				// if (Config.internalPush)

				// Should assign device ID with 'user' topic
				await ajax.post('/api/register', { token });

				localStorage.setItem(id, token);

			}
			catch (e) {
				console.error('Failed to register device token');
			}
			
		}

		if (registration.active) {
			sw = registration.active;
			
		}

		navigator.serviceWorker.addEventListener('message', function (event) {
			// console.log('SwerviceWorker message:', event.data);

			app.onPushMessage(event.data);
		});
	}
}
