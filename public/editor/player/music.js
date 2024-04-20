
import { EditorBase } from './base.js';

export class MusicPage extends EditorBase {

	static id = 'files';

	#offset = 0;
	#total = 0;
	#track;
	#more = false;

	constructor(container) { 
		super(container, MusicPage.id); 

		app.on('audioadd', e => this.#onAudioImport(e.detail));
	}

	open(playlist) {

		const ed = this.container;

		if (playlist) {
			ed.setAttribute('playlist', '');

			this.loadPlaylist(playlist.tracks);
		}
		else {
			ed.removeAttribute('playlist');
		}

	}

	async load() {
		this.#offset = 0;
		this.#total = await app.db.count('audio');

		const files = await app.db.lsByRating('audio', this.#offset);

		return this.loadFiles(files);
	}

	loadFiles(files) {

		console.log('PLAYER ED: Loading files: ', this.#offset, files.length, this.#total);

		this.#offset += files.length;
		this.#more = files.length >= 50;

		for (const i of files)
			this.#renderItem(i);

		this.sort(sortFiles);

		if (app.player.isPlaying) {
			const info = app.player.current;
			let e = this.getElementBy('id', info.id);

			if (!e) {
				e = this.#renderItem(info, true);
			}

			e.classList.add('playing');

			this.#track = info.id;
		}
	}

	async loadPlaylist(files) {

		const items = this.getElementsBy('playlist', 'true');
		for (const i of items) {
			// i.removeAttribute('data-playlist');
			delete i.dataset['playlist'];
		}

		for (const i of files) {

			let e = this.getElement(i.id);
			if (!e) {

				e = this.#renderItem(i);
			}

			e.dataset.playlist = true;
		}

	}

	// virtual
	onFilesDrop(media) {

		console.log('Importing media files', media.length);

		
	}

	onClick(id) {
		console.log('Playing file:', id);
		app.player.playFile(id, true);
	}

	onAction(action, id, container) {

		switch (action) {

			case 'delete':
			dom.removeElement(container);
			return app.db.rm('audio', parseInt(id));
		}	

	}
	
	onTrackChange(info) {

		console.log('Player editor on track change:', info);

		this.state = 'playing';

		this.#updateCurrentTrack();
		this.#track = info.id;

		const e = this.getElement(info.id);
		if (!e) return;

		e.classList.add('playing');

		// fix animation speed
		const title = e.querySelector('.title');
		
		// const duration = Math.floor(title.innerText.length / 4);
		// title.style['animation-duration'] = `${duration > 2 ? duration : 2}s`; 
		const duration = Math.floor(title.innerText.length / 4);
		title.style['animation-duration'] = `${duration}s`; 

		if (e.dataset.type == 'video') {
			const video = app.player.videoElement;
			e.appendChild(video);
		}

		//this.scrollTo(e);

		updateTime(e, info.duration);

		return e;
	}

	onTrackStop() { 
		this.#updateCurrentTrack();
	}

	#updateCurrentTrack() {

		if (!this.#track) return;

		const e =  this.getElement(this.#track);
		if (!e) return;

		e.classList.remove('playing');

		const video = e.querySelector('video');
		if (video)
			dom.removeElement(video);
	}

	#renderItem(i, top=false) {
		const name = i.name || i.filename || i.file.name;
		const type = i.type ? fileX.getType(i.type) : getType(name);

		const data = {
			id: i.id || name.hashCode()
			, title: fileX.getTitleFromMeta(i) 
			, desc: fileX.getDescriptionFromMeta(i)
			, rating: i.rating
			, type
		};

		if (i.meta && i.meta.duration)
			data.duration = i.meta.duration;

		const e = this.addItemTemplate('edior-player-track-item-file', data, top);
		e.dataset.name = data.title.slice(0, 8).toLowerCase();
		e.dataset.type = type;

		return e;
	}

	#onAudioImport(media) {
		for (const i of media)
			this.#renderItem(i, true);
	}
} 

function sortFiles(a, b) {
	if (a.dataset.rating == b.dataset.rating)
		return a.dataset.name > b.dataset.name ? 1: -1;

	return parseInt(b.dataset.rating) - parseInt(a.dataset.rating);
}

function updateTime(container, duration) {

	const e = container.querySelector('.time');
	e.innerText = fileX.getDuration(duration);
}

function getType(fname) {
	const ext = fileX.getExtension(fname);
	return fileX.isVideo(ext) ? 'video' : 'audio';
}
