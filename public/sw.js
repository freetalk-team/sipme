
const addResourcesToCache = async (resources) => {
	const cache = await caches.open('v1');
	await cache.addAll(resources);
}

const putInCache = async (request, response) => {
	const cache = await caches.open('v1');
	await cache.put(request, response);
}

const kApp = [
	'/app.css',
	'/app.js',
	'/dist/sip.js',
	'/dist/codemirror.js',
	'/dist/webtorrent.min.js'
];

const kImages = [
	'/ui/svg/app-icon.svg',
	'/ui/svg/team.svg',
	'/ui/svg/sipme.svg'
];

const kAudio = [
	'/ui/ogg/ringtone.ogg',
	'/ui/ogg/popsound.mp3',
	'/ui/ogg/ringback-tone.ogg'
];

const kFontawesome = [
	'/ui/lib/fontawesome6/webfonts/fa-brands-400.ttf',
	'/ui/lib/fontawesome6/webfonts/fa-brands-400.woff2',
	'/ui/lib/fontawesome6/webfonts/fa-regular-400.ttf',
	'/ui/lib/fontawesome6/webfonts/fa-regular-400.woff2',
	'/ui/lib/fontawesome6/webfonts/fa-solid-900.ttf',
	'/ui/lib/fontawesome6/webfonts/fa-solid-900.woff2',
	'/ui/lib/fontawesome6/webfonts/fa-v4compatibility.ttf',
	'/ui/lib/fontawesome6/webfonts/fa-v4compatibility.woff2'
];

// self.addEventListener('install', (event) => {
// 	event.waitUntil(
// 	  addResourcesToCache([
// 		...kApp,
// 		...kImages,
// 		...kAudio,
// 		...kFontawesome
// 	  ])
// 	);
// });

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
	// messagingSenderId: parseInt(messagingSenderId),
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

