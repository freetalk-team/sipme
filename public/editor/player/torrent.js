
import { EditorBase } from './base.js';
import { Search, TorrentMonitor } from '../common.js';

const kResultsPerPage = 10;
const kMaxDownloading = 2;

class Torrent {

	#progress;
	#speed;
	#start;
	#total;
	#info;
	#timeout;
	#next = 0;
	#more = true;

	get id() { return this.#info.id; }
	get uri() { return this.#info.uri; }


	constructor(container) {
		this.#progress = container.querySelector('progress');
		this.#speed = container.querySelector('.speed');
	}

	download(info) {
		this.#info = info;
		this.#start = Date.seconds();
		this.#total = info.files.reduce((a, b) => a + b.size, 0);

		// todo: use runner
		this.#timeout = setInterval(() => this.#push(), 10000);

		app.downloadTorrent(info.uri, this);
	}

	progress(portion) {
		console.log('Torrent download progress:', portion);

		this.#timeout = clearInterval(this.#timeout);
				
		this.#progress.value = Math.floor(portion * 100);

		const size = Math.floor(this.#total * portion);
		const interval = Date.seconds() - this.#start;

		this.#speed.innerText = `${fileX.formatSize(size/interval)}/s`;
	}

	done() {
		
		app.db.update('torrent', this.id, { progress: 100 });
		app.firebase.set('data/torrent', this.id, app.uid, Date.seconds());

		this.ondone();
	}

	error(e) {
		
	} 

	ondone() {}

	async #push() {
		if (!this.#more && this.#next > 0) {
			this.#next = 0;
			this.#more = true;
		}

		let count = 0;
		const hash = this.id;

		const peers = await app.firebase.ls(`data/torrent/${hash}`, 3, this.#next, true);
		if (!peers) {
			this.#more = false;
			return;
		}

		for (const peer of Object.keys(peers)) {
			// todo: send PUSH

			const m = {
				type: 'push',
				torrent: hash
			};

			console.log('Sending torrent push:', hash);

			await app.sendMessage(peer, m, false);

			count += 1;
		}

		this.#next += count;

		if (count < 3)
			this.#more = false;
	}
}

export class TorrentPage extends EditorBase {
	static id = 'torrent';

	#offset = 0;
	#more = false;
	#results;
	#main;

	#local;

	get more() { return this.#results && this.#results.length == kResultsPerPage; }
	get ds() { return app.ds('torrent'); }

	constructor(container) { 
		super(container, TorrentPage.id, 'editor-player-content-torrent');

		const area = this.container.querySelector('.search-area');

		this.#results = new Search(area, 'torrent');
		this.#main = UX.List.createMixin(this.container.querySelector('.main'));

		app.on('torrentdownloading', e => this.#onDownload(e.detail));
	}

	load() { 
		return this.#load(); 
	}

	open() {}

	onAction(action, id, target) {

		switch (action) {

			case 'more':
			this.#results.showMore();
			break;

			case 'less':
			this.#results.showLess();
			break;

			case 'clear': 
			this.#results.clear();
			break;

			case 'search':
			this.#results.search(this.#local);
			break;

			default:
			this.#handleAction(action, id, target);
			break;
			
		}
	}

	onFilesDrop(media, images) {
		this.#renderNewTorrent(media, images);
	}

	async search(text) {

		console.log('Sending search request:', text);

		try {

			await this.#results.search(text);

		}
		catch (e) {
			console.error('Search request failed', e);
		}
	}

	onInput(e) {
		const name = e.getAttribute('name');

		switch (name) {

			case 'search':
			this.#results.onInput(e);
			break;
		}
	}

	async #load() {

		// const torrents = await app.db.lsByRating('torrent', this.#offset);
		const ds = this.ds;

		const torrents = await ds.ls(false, this.#offset);
		const local = torrents.filter(i => !i.remote);

		console.log('PLAYER ED: Loading files: ', this.#offset, torrents.length);

		this.#offset += torrents.length;
		this.#more = torrents.length >= 50;

		const inprogress = [];

		for (const i of local) {
			const e = this.#main.addItemTemplate('editor-player-torrent', i, false, ['torrent-actions']);
			if (i.progress < 100) {
				e.classList.add('downloading');

				inprogress.push([i, e]);
				//const progress = e.querySelector('progress');
			}
		}

		this.#sort();
		this.#local = new Set(local.map(i => i.id));

		// inprogress.sort((a, b) => b[0].progress - a[0].progress);

		// // todo: start downloading in app init ???
		// // const inprogress = torrents.filter(i => i.progress == 100).sort((a,b) => b.progress - a.progress);
		// const downloading = inprogress.slice(0, kMaxDownloading);

		// for (const i of downloading)
		// 	this.#download(...i);
	}

	#sort() {
		this.#main.sort((a, b) => {

			if (a.progress < 100) return -1;
			if (b.progress < 100) return 1;

			return (Number(a.dataset.rating) < Number(b.dataset.rating) || a.dataset.name > b.dataset.name) ? 1: -1;
		});
	}

	#renderNewTorrent(files, images) {

		files.sort((a ,b) => a.meta && a.meta.track && b.meta && b.meta.track ? a.meta.track - b.meta.track : -1);

		const data = files.map(i => Object({ 
			name: i.meta && i.meta.title ? i.meta.title : fileX.getName(i.name),
			size: i.size,
			type: fileX.getType(i.type),
		}));

		let e = dom.renderTemplate('editor-player-torrent-new', data);
		this.append(e, true);

		const submit = e.querySelector('button[name="submit"]');
		const name = e.querySelector('input[name="title"]');

		for (const i of files) {
			if (i.meta && i.meta.album) {
				name.value = i.meta.album;
				break;
			}
		}

		let count = files.length;

		e.onclick = event => {
			const target = event.target;

			switch (target.tagName) {

				case 'BUTTON': {

					switch (target.name) {

						case 'submit': {


							const unselected = Array.from(e.querySelectorAll('input[type="checkbox"]:not(:checked)')).map(i => i.dataset.index);
							console.log('Creating new torrent, skiped', unselected.length);

							for (const i of unselected)
								files[parseInt(i)] = null;

							files = files.filter(i => !!i);

							console.log('Selected files:', files.map(i => i.name));

							const title = name.value;
							const id = files.map(i => i.name.hashCode()).reduce((a,b) => a ^ b, 0) >>> 0;

							const data = { id, title, rating: 0, files: [] };
							for (const i of files) {

								const j = { name: i.name, size: i.size };
								if (i.meta && i.meta.title)
									j.display = i.meta.title;

								data.files.push(j);
							}

							dom.removeElement(e);

							this.#addTorrent(data, files);
						}

						break;

						case 'cancel':
						dom.removeElement(e);
						break;
					}

				}
				break;

				case 'INPUT':{

					if (target.type == 'checkbox') {
						count += target.checked ? 1 : -1;
						submit.disabled = count == 0;
					}

					//console.log('CHECK:', target.value);
				}
				break;
			}
		}
	}

	async #addTorrent(data, files) {

		try {

			if (files) {
				const torrent = await app.seed(files);
				console.log('Seeding torrent:', torrent.infoHash);

				data.hash = torrent.infoHash;
				data.uri = torrent.magnetURI;

				const res = await ajax.post('/api/torrent', data);
				console.log('Torrent created:', res.id);

				data.id = res.id;
			}

			//const info = await app.seed();

			await app.db.put('torrent', data);
			

			this.#main.addItemTemplate('editor-player-torrent', data, true);
		}
		catch (e) {
			console.error('Failed to add torrent', e);
		}
	}

	async #handleAction(action, e, target) {

		let id = e.dataset.id;

		if (id && id.startsWith('magnet:')) {
			const { hash } = parseMagnetURI(id);
			id = hash;
		}

		switch (action) {

			case 'download': {
				const uri = e.dataset.id;
				this.#results.disableResult(uri);

				const info = this.#results.getResult(id);
				if (info) { 
					this.#renderTorrent(info);
					app.downloadTorrent(uri);
				}
			}
			break;
		}
	}

	#download(info, container) {
		const torrent = new Torrent(container);

		torrent.ondone = () => {

			const progress = container.querySelector('.progress');
			dom.removeElement(progress);

			container.classList.remove('downloading');
			dom.highlightElement(container);

		}

		torrent.download(info);
	}

	async #onDownload(torrent) {
		const id = torrent.infoHash;

		let info = this.#results.getResult(id);
		if (!info) 
			info = await this.ds.get(id);

		const e = this.#renderTorrent(info);
		
		const m = new TorrentMonitor(e);
		app.addTorrentMonitor(id, m);
	}

	#renderTorrent(info, state='downloading') {
		let e = this.#main.getElement(info.id);
		if (!e) {
			e = this.#main.addItemTemplate('editor-player-torrent', info, true, ['torrent-actions']);
			e.dataset.id = info.id;
		}

		e.setAttribute('state', state);

		return e;
	}
}