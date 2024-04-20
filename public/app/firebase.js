
import { Firebase } from '../firebase.js';

const FirebaseMixin = {

	_pushMessages: new CacheMap({ maxCacheTime: 30_000 })

	, async startFirebase() {


		const firebase = new Firebase;
		const token = this.user.firebaseToken;

		try {

			console.debug('Connecting firebase: ', token);

			if (token) {
				const user = await firebase.connect(token);
				console.debug('Firebase connected:', user);
			}

			this.firebase = firebase;
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
		const { body, title } = notification;

		console.debug('APP push received', msg);

		const msgid = messageId || fcmMessageId;
		const { user, room, type } = data;

		if (type == 'invite') {

			console.debug('PUSH incomming call');

			this.messenger.register();

		} else {
			const info = { user };

			if (room)
				info.room = room;

			this.onMessage(info, body, true);
		}
	}
}

export {
	FirebaseMixin
}
