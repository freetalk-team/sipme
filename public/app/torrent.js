import { PersistentChunkStore } from './torrent/persistent.js';
// import WebTorrent from '../ui/lib/webtorrent/index.esm.js';

const kClientOptions = {
	dht: false, 
	lsd: false,
	//tracker: false,
	tracker: {
		rtcConfig: {
			iceServers: [
				// { urls: 'stun:127.0.0.1:3478' },
				// { urls: 'stun:192.168.8.68:3478' }
				// { urls: 'stun:192.168.8.11:3478' }
			]
			// , iceTransportPolicy: 'all'
			// , iceTransportPolicy: 'relay'
		}
	},
	// torrentPort: 50000 + Math.floor(Math.random() * 10000)
	// uploadLimit: 2 * 1024 * 1024 // 2MB
};

const announceList = [
	// ['ws://127.0.0.1:8000'],
	[`ws://${location.hostname}/torrent/tracker`]
	// ['http://127.0.0.1:8000/announce'] 
];

const kCleanupInterval = 300;
const kMinSeedTime = 6000;

const kProgressInterval = 10;
const kSeedRequestInterval = 30;

const kMinDownloadSpeed = 256000;
const kMaxPeers = 5;
const kSeederInviteInterval = 15;
const kSeedInterval = 600;

const kTorrentRoom = Config.torrent.rooms;

const TorrentMixin = {

	async startTorrent(sw) {

		console.log('TORRENT: RTC support', WebTorrent.WEBRTC_SUPPORT);

		const client = new WebTorrent(kClientOptions);

		// client.throttleDownload(-1);
		// client.throttleUpload(-1);

		// if (sw) {
		// 	client.loadWorker(sw);
		// }

		client.on('error', function (err) {
			console.error('TORRENT ERROR: ' + err.message)
		});

		// client.on('update', function (data) {
		// 	console.log('got an announce response from tracker: ' + data.announce)
		// 	console.log('number of seeders in the swarm: ' + data.complete)
		// 	console.log('number of leechers in the swarm: ' + data.incomplete)
		//   })
		  
		// client.once('peer', function (addr) {
		// 	console.log('found a peer: ' + addr) // 85.10.239.191:48623
		// })

		// todo: load Service worker
		// client.loadWorker()

		this.torrent = client;
		this._torrent = { 
			downloading: new Map, 
			monitors: new Map, 
			seeding: new Map,
			seeders: new Map,
			task: {}
		};

		// const root = await this.getRootDirectory('Torrents');
		// const entries = await fs.ls(root);
		// console.log(entries);
	}

	, seed(files) {

		console.log('Torrent seed request:', Array.isArray(files) ? files.length : 1);

		return new Promise((resolve, reject) => {

			this.torrent.seed(files, { announceList },  (torrent) => {

				// torrent.on('wire', function (wire, addr) {
				// 	console.log('Downloaded', wire.downloaded)
				// 	console.log('Uploaded', wire.uploaded)
				// 	console.log('Download Speed', wire.downloadSpeed())
				// 	console.log('Upload Speed', wire.uploadSpeed())
				// })

				const uri = torrent.magnetURI;
				const id = torrent.infoHash;
				const ctx = this._torrent;

				torrent.own = true;

				console.log('TORRENT Client is seeding:', torrent);
				ctx.seeding.set(id, torrent);

				if (ctx.task.seed) 
					ctx.task.seed = this.runner.setTimeout(kSeedInterval, cleanupSeeds.bind(ctx), true);

				resolve(torrent);
			});

		});
	}

	, async createTorrentFromPlaylist(info) {

		const fileIds = info.tracks.map(i => i.id || i.name.hashCode());
		const files = [];

		for (const i of fileIds) {

			const data = await this.db.get('audio', i);
			files.push(data.file);
		}

		const torrent = await this.seed(files);

		const uri = torrent.magnetURI;
		const hash = torrent.infoHash;

		// todo: add description

		const data = {
			title: info.display || info.name,
			uri, hash,
			genre: info.genre,
			files: info.tracks.map(i => Object({ 
				name: i.filename,
				size: i.size,
				type: i.type
				})),
		};

		const ds = this.ds('torrent');
		const r = await ds.put(data);

		torrent.title = data.title;

		if (kTorrentRoom)
			await this.joinRoom(hash);

		return data;
	}

	, async downloadTorrent(info, handler) {

		const ds = this.ds('torrent');
		const ctx = this._torrent;

		if (typeof info == 'string') {
			// assuming is magnet
			const { hash, uri } = parseMagnetURI(info);

			info = await ds.get(hash);
		}

		const { id, uri, title } = info;

		if (ctx.downloading.has(id)) {
			console.log('TORRENT Already added:', id);
			return;
		}

		if (handler)
			this.addTorrentMonitor(id, handler);

		const opt = { store: PersistentChunkStore };
		//const opt = {};

		const seed = this.monitor.setTimeout(kSeederInviteInterval, requestSeed.bind(ctx), true);
		seed.hash = id;

		this.torrent.add(uri, opt, async (torrent) => {

			seed.cancel();

			console.log('TORRENT downloading:', torrent);

			torrent.title = title || torrent.name;

			const id = torrent.infoHash;
			const uri = torrent.magnetURI;

			torrent._seeders = ctx._seeders;

			await ds.update(id, { state: 'progress', remote: undefined }, { id, uri });

			torrent.on('done', async () => {
		
				console.log('Progress: 100%');
		
				const root = await app.getRootDirectory('Torrents');
				const torrents = await fs.dump(root);
				console.log('TORRENTS:', torrents.join('\n'));
		
				const dir = await fs.directory(root, torrent.name);
		
				const items = await fs.ls(dir);
				const files = [];
				const handles = [];
		
				for (const i of items) {
					if (i.isDirectory) continue;
		
					const ext = fileX.getExtension(i.name);
					if (!fileX.isMedia(ext)) continue;
		
					const meta = await fs.metadata(i);
		
					const id = i.name.hashCode();
					const size = meta.size;
		
					files.push({ id, name: i.name, size });

					const file = await fs.getFile(dir, i.name);
					handles.push(file);
				}
		
				await app.importAudioFiles(handles);
		
				//creating torrent
				await ds.update(id, { files, state: 'done' });

				handleDone(torrent, this._torrent);
		
			  // todo: add into IndexDB
			})
		
			torrent.on('error', (e) => {
				console.error('TORRENT ERROR:', e);

				handleDone(torrent, this._torrent, e);
			});

			this.addTorrent(torrent);

		});

		return uri;
	}

	, addTorrentMonitor(id, handler) {
		let monitors = this._torrent.monitors.get(id);
		if (!monitors) {
			monitors = [];
			this._torrent.monitors.set(id, monitors);
		}

		monitors.push(handler);
	}

	, async shareTorrent(id) {

		const files = [];
		let fids = [];

		if (typeof id == 'string') {

			const ds = this.ds('torrent');
			const data = await ds.get(id);

			fids = data.files.map(i => i.id || i.name.hashCode(i.name));
		}
		else {
			fids = id;
		}

		if (fids.length == 0) {
			console.error('Torrent share with no files');
			return;
		}

		for (const i of fids) {
			const data = await this.db.get('audio', i);
			files.push(data.file);
		}

		return this.seed(files);
	}

	, addTorrent(torrent) {

		const hash = torrent.infoHash;
		const startlfc = this.torrent.torrents.length == 0;

		torrent._lastSeederInvite = Date.now();

		this._torrent.downloading.set(hash, torrent);

		console.debug('Adding torrent:', hash);
		
		if (!this._torrent.task.down) {
			this._torrent.task.down = this.monitor.setTimeout(5, monitor.bind(this._torrent), true);
		}

		this.emit('torrentdownloading', torrent);

		// if (startlfc) {

		// 	this.runner.setTimeout(kCleanupInterval, (task) => {

		// 		const now = Date.now();
		// 		const min = kMinSeedTime * 1000;
				
		// 		for (const i of this.torrent.torrents) {

		// 			const hash = i.infoHash;
		// 			// const own = i.client.peerId == this.torrent.peerId;
		// 			const own = torrent.own;

		// 			console.log('TORRENT LFC', hash, i.numPeers);
		// 			// console.log('TORRENT LFC', i);
		// 			// continue;

		// 			if (now - i.created.getTime() < min)
		// 				continue;
					
		// 			if ((own && i.numPeers == 0) || (i.done && i.numPeers == 1)) {

		// 				//this._.torrents.delete(hash);

		// 				console.log('Destroying torrent:', torrent);

		// 				//i.destroy();
		// 				this.torrent.remove(i.magnetURI);
		// 			}
		// 		}

		// 		if (this.torrent.torrents.length == 0)
		// 			task.cancel();

		// 	}, true);

		// } 
	}

	, cancelTorrent(id) {

		const torrent = this.torrent.get(id);
		if (torrent)
			this.torrent.remove(id);
	}

	, seedTorrent(id) {
		console.debug('SEED TORRENT REQUEST');

		return this.shareTorrent(id);
	}
}

async function monitor() {

	console.debug('Torrent monitor task:');

	const now = Date.now();

	// for (const i of this.torrent.torrents) {
	for (const i of this.downloading.values()) {

		const id = i.infoHash;
		const monitors = this.monitors.get(id);

		if (!monitors) {
			console.debug('No monitors for torrent:', id);
			continue;
		}

		if (/*!kTorrentRoom*/true) {
			if (i.downloadSpeed < kMinDownloadSpeed && i.numPeers < kMaxPeers) {
				// todo: request more seed

				if (now - i._lastSeederInvite > kSeederInviteInterval) {

					i._lastSeederInvite = now;

					if (!i._seeders) 
						i._seeders = await loadSeaders(id);

					const seeder = i._seeders.shift();
					if (seeder) 
						await seedRequest(seeder, id);
				}
			}
		}

		for (const m of monitors) {
			console.debug('Torrent progress:', id, i.downloadSpeed);
			m.progress(i.progress);
		}
	}

}

function cleanupSeeds() {

	for (const [id, torrent] of this.seeding) {
		if (torrent.numPeers == 0) {
			torrent.destroy();
			this.seeding.delete(id);
		}
	} 

	if (this.seeding.size == 0) {
		this.task.seed.cancel();
		delete this.task.seed;
	}

}

function handleDone(torrent, ctx, e) {

	const id = torrent.infoHash;
	const active = ctx.downloading;
		
	active.delete(id);

	console.debug('Torrent complete, remianing:', active.size);

	if (active.size == 0) {
		ctx.task.cancel();
		delete ctx.task;
	}

	ctx.seeding.set(id, torrent);

	const monitors = ctx.monitors.get(id);
	if (monitors) {
		for (const m of monitors)
			e ? m.error(id, e) : m.done(id, torrent);

		ctx.monitors.delete(id);
	}

}

async function loadSeaders(id) {

	// const ds = app.ds('torrent');
	// const torrent = await ds.get(id);

	// if (!torrent) return [];

	// todo: order by timestamp
	const res = await app.firebase.ls(`data/torrent/${id}`);
	const seeders = res ? Object.keys(res).filter(uid => uid != app.uid) : [];

	if (kTorrentRoom)
		seeders.unshift('room');

	return seeders;
}

function seedRequest(user, id) {

	console.debug('Torrent Sending seed request:', user, id);

	return user == 'room' 
		? app.sendRoomMessage(id, { id, type: 'seed' })
		: app.sendMessage(user, { id, type: 'seed' }, true)
		;
}

async function requestSeed(task) {

	const id = task.hash;

	// if (kTorrentRoom) {
	// 	task.cancel();
	// 	return app.sendRoomMessage(id, { id, type: 'seed' });
	// }

	let seeders = this.seeders.get(id);
	if (!seeders) {
		seeders = await loadSeaders(id);
		this.seeders.set(id, seeders);
	}

	const seeder = seeders.shift();
	if (!seeder) {
		task.cancel();
		this.seeders.delete(id);
		return;
	}

	return seedRequest(seeder, id);
}

// function onTorrent (torrent) {
// 	console.log('Got torrent metadata!')
// 	console.log(
// 	  'Torrent info hash: ' + torrent.infoHash + ' ' +
// 	  '<a href="' + torrent.magnetURI + '" target="_blank">[Magnet URI]</a> ' +
// 	  '<a href="' + torrent.torrentFileBlobURL + '" target="_blank" download="' + torrent.name + '.torrent">[Download .torrent]</a>'
// 	)

// 	// Print out progress every 5 seconds
// 	var interval = setInterval(async () => {

// 		if (torrent.destroyed) {
// 			clearInterval(interval);
// 			return;
// 		}


// 		console.groupCollapsed('Torrent progress');
// 		console.log('Progress:' , (torrent.progress * 100).toFixed(1) + '%');
// 		console.log('Download speed:', torrent.downloadSpeed);
// 		console.log('Num peers:', torrent.numPeers);
// 		console.groupEnd();

// 		this.progress(torrent.progress);
// 	}, kProgressInterval * 1000)

// 	torrent.on('done', async () => {
// 		clearInterval(interval);

// 	  	console.log('Progress: 100%');

// 		// const promises = [];
// 		// for (const i of torrent.files) {
// 		// 	promises.push(new Promise((resolve, reject) => {
// 		// 		// i.getBlobURL((err, url) => {
// 		// 		// 	if (err) return reject(err);
// 		// 		// 	resolve(url);
// 		// 		// });

// 		// 		i.getBlob((err, blob) => {
// 		// 			if (err) return reject(err);
// 		// 			resolve({ blob, name: i.name});
// 		// 		});
// 		// 	}));
// 		// }

// 		// const urls = await Promise.all(promises);
// 	  	// this.done(urls);

// 		const root = await app.getRootDirectory('Torrents');
// 		const torrents = await fs.dump(root);
// 		console.log('TORRENTS:', torrents.join('\n'));

// 		const dir = await fs.directory(root, torrent.name);

// 		const items = await fs.ls(dir);
// 		const files = [];

// 		for (const i of items) {
// 			if (i.isDirectory) continue;

// 			const ext = fileX.getExtension(i.name);
// 			if (!fileX.isMedia(ext)) continue;

// 			const meta = await fs.metadata(i);

// 			const id = i.name.hashCode();
// 			const size = meta.size;

// 			const file = await fs.getFile(dir, i.name);
// 			const type = fileX.isAudio(ext) ? 'audio' : 'video';

// 			await app.db.put('audio', { id, file, rating: 0, type });

// 			files.push({ id, name: i.name, size });
// 		}

// 		const id = torrent.infoHash;
// 		const uri = torrent.magnetURI;
// 		const name = torrent.title || torrent.name;

// 		//creating torrent
// 		await app.db.put('torrent', { id, uri, name, files });

// 	  	this.done();

// 	  // todo: add into IndexDB
// 	})

// 	torrent.on('error', (e) => {
// 		console.error('TORRENT ERROR:', e);
// 		this.error();
// 	});

// 	// // Render all files into to the page
// 	// torrent.files.forEach(function (file) {
// 	//   //file.appendTo('.log')
// 	//   //log('(Blob URLs only work if the file is loaded from a server. "http//localhost" works. "file://" does not.)')
// 	//   file.getBlobURL(function (err, url) {
// 	// 	if (err) return console.error(err.message)
// 	// 	//log('File done.')
// 	// 	//log('<a href="' + url + '">Download full file: ' + file.name + '</a>')
// 	//   })
// 	// })
//   }



export {
	TorrentMixin
}