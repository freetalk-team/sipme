
const addResourcesToCache = async (resources) => {
	const cache = await caches.open('v1');
	await cache.addAll(resources);
}

const putInCache = async (request, response) => {
	const cache = await caches.open('v1');
	await cache.put(request, response);
}

self.addEventListener('install', (event) => {
	event.waitUntil(
	  addResourcesToCache([
		'/ui/svg/app-icon.svg',
		'/ui/ogg/ringtone.ogg',
		'/ui/ogg/popsound.mp3',
		'/ui/ogg/ringback-tone.ogg',
	  ])
	);
});

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

const params = new URL(location).searchParams;
const apiKey = params.get("apiKey");
const authDomain = params.get("authDomain");
const projectId = params.get("projectId");
const storageBucket = params.get("storageBucket");
const messagingSenderId = params.get("messagingSenderId");
const appId = params.get("appId");
const measurementId = params.get("measurementId");

firebase.initializeApp({
	apiKey,
	authDomain,
	projectId,
	storageBucket,
	messagingSenderId: parseInt(messagingSenderId),
	appId,
	measurementId,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(data) {
	// console.log('[firebase-messaging-sw.js] Received background message ', payload);
	// // Customize notification here
	// const notificationTitle = 'Background Message Title';
	// const notificationOptions = {
	// 	body: 'Background Message body.',
	// 	icon: '/ui/svg/app-icon.svg'
	// };

	// self.registration.showNotification(notificationTitle, notificationOptions);

	self.clients.matchAll().then(all => all.map(client => client.postMessage(data)));
});

