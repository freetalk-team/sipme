
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

self.addEventListener('install', (event) => {
	event.waitUntil(
	  addResourcesToCache([
		...kApp,
		...kImages,
		...kAudio,
		...kFontawesome
	  ])
	);
});
