
function onPlayerReady(event) {
	event.target.playVideo();
}

class Player {

	#audio;
	#state = 'stopped';
	#mode = 'player';
	#queue = [];
	#recent = [];
	#current;
	#player;
	#progress;
	#offset = 0;
	#duration = 0;
	#radio = false;

	get queueCount() { return this.#queue.length; }
	get recent() { return this.#recent.reverse(); }
	get videoElement() { return this.#audio; }
	get isPlaying() { return this.#state == 'playing'; }
	get current() { return this.#current; }

	constructor() {
		// this.#audio = new Audio;
		const media = createVideo();

		media.onplaying = () => this.#onPlaying();
		media.onended = () => this.#onEnd();
		media.onpause = () => this.#onPause();

		media.onloadedmetadata = (event) => {
			console.log('METADATA loaded', event);
		}

		this.#audio = media;
	}

	registerEvents() {
		app.on('call', e => this.#oncall(e.detail));
		app.on('hangup', e => this.#oncallend(e.detail));
	}

	pause() {
		console.log('PLAYER: pausing track'); 
		this.#pause();
		this.#state = 'paused';

		if (this.#progress) {
			clearInterval(this.#progress);
			this.#progress = null;
		}
	}

	resume() { 
		console.log('PLAYER: resuming track'); 
		this.#audio.play();
	}

	playYoutube(container) {
		const vid = container.dataset.id;
		// const e = document.getElementById('player');

		console.debug('Player: loading yt =>', vid);

		if (this.#player) {

			this.#player.stopVideo();

			const e = document.getElementById('player');
			const container = e.previousElementSibling;

			dom.showElement(container);
			dom.removeElement(e);
		}

		dom.hideElement(container);

		const e = dom.createElement('div');
		e.id = 'player';
		dom.insertAfter(e, container);
		// dom.showElement(e);

		// player.loadVideoById(vid, 0, 'large');

		this.#player = new YT.Player('player', {
			videoId: vid,
			events: {
				'onReady': function(event) {
					console.debug('YT on ready');
					event.target.playVideo(); 
				}
			}
		});
	}

	onYoutubeStateChange() {
		console.debug('YT player state change');
	}

	onYoutubeError(e) {
		console.error('YT player on error', e);

	}

	playFile(id, queue=false) {

		id = Number(id);

		if (queue && (this.#queue.length > 0 || this.#state != 'stopped')) {

			if (!this.#queue.includes(id)) {
				this.#queue.push(id);
				app.emit('trackqueued', id);
			}

			return;
		}

		return this.#playFile(id);
	}
	
	playNext() {
		if (this.#queue.length == 0) return;

		const id = this.#queue.shift();
		return this.#playFile(id);
	}

	playPrev() {
		if (this.#recent.length < 2) return;

		const item = this.#recent[this.#recent.length - 2];
		return this.#playFile(item.id);
	}

	clear() {
		this.#recent = [];
	}

	remove(id) {
		const index = this.#queue.indexOf(id);
		if (index != -1)
			this.#queue.splice(index, 1);
	}

	playRadio(id, action) {

		console.debug('Play radio request:', id, action);

		this.#playRadio(id, action);
		return;

		switch (this.#state) {

			case 'playing':

			switch (this.#mode) {
				
				case 'player':
				this.pause();
				this.#playRadio();
				break;

			}

			if (this.#mode == 'player') {

			}
			break;
		}

	}

	#playRadio(id, action) {

		if (/*app.inCall()*/false) {
			// todo: 
		}
		else {

			// navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			// // disable mic
			// navigator.getUserMedia({ audio: true, video: true }, 
			// 	(stream) => {

			// 		console.log('# RADIO:', stream.getAudioTracks().length);
			// 		stream.getAudioTracks()[0].enabled = false;
			// 	},
			// 	(error) => {
			// 		console.log(error);
			// 	}
			// )

			// const opt = { audio: false, video: false, muted: true };
			// app.call(uri, opt);

			if (this.#radio) {

				switch (action) {

					case 'play': {

						const current = this.#audio.src;
						if (/*todo: check is current*/false) {

						}

						this.resume();
					}
					break;

					case 'pause':
					this.pause();
					break;
				}

			}
			else {

				this.pause();

				this.#radio = true;
				this.#audio.src = 'http://127.0.0.1:8000/test';

				this.resume();

			}
		}

	}

	async #playFile(id) {
		this.#offset = 0;

		if (this.#recent.length > 50)
			this.#recent.shift();

		let item;
		const i = this.#recent.findIndex(i => i.id == id);
		if (i != -1) {

			item = this.#recent[i];
			this.#recent.splice(i, 1);
		}
		else {
			item = await app.db.get('audio', id);
		}

		item.rating++;
		await app.db.update('audio', id, { rating: item.rating });

		this.#current = item;
		this.#recent.push(item);

		//this.#checkState('play');
		const src = this.#audio.src;
		if (src && !src.startsWith('http'))
			URL.revokeObjectURL(src);

		const url = URL.createObjectURL(item.file);
		this.#audio.src = url;

		this.#audio.play();

	}

	#oncall() {
		
		switch (this.#state) {

			case 'playing':
			this.#pause();
			break;
		}
	}

	#oncallend() {
		switch (this.#state) {

			case 'playing':
			this.#resume();
			break;
		}
	}

	#pause() {
		this.#audio.pause(); 
	}

	#resume() {
		this.#audio.play(); 
	}

	#checkState(state) {

		// if (state == 'play') {

		// 	if (!this.#state) {
		// 		this.#audio = new Audio;
		// 		return;
		// 	}

		// 	if (this.#state == 'playing') {
		// 		//this.#audio.stop();
		// 	}


		// }

	}

	async #onPlaying() {
		console.log('Player: on playing, radio:', this.#radio);
		
		this.#state = 'playing';
		if (this.#radio) return;

		this.#duration = Math.round(this.#audio.duration);

		this.#startMonitor();

		let update = true;
		if (!this.#current.meta) 
			this.#current.meta = { duration: this.#duration };
		else if (!this.#current.meta.duration) 
			this.#current.meta.duration = this.#duration;
		else
			update = false;

		if (update)
			await app.db.update('audio', this.#current.id, { meta: this.#current.meta });

		const { id, rating, file, type } = this.#current;

		const info = { id, rating, file, type, duration: this.#duration };
		const meta = this.#current.meta;

		if (meta) {
			info.meta = meta;
			info.title = fileX.getTitleFromMeta(info);
			info.desc = fileX.getDescriptionFromMeta(info);
		}

		app.addRecent('player', info);
		app.emit('trackchange', info);
	}

	#onPause() {
		console.log('Player: on paused');
		this.#stopMonitor();

		app.emit('trackpause');
	}

	#onEnd() {
		console.log('Player: on end');

		if (this.#queue.length > 0) {

			this.playNext();
		}
		else {
			this.#stopMonitor();

			this.#state = 'stopped';
			app.emit('trackstop');
		}
	}

	#createVideo() {

	}

	#startMonitor() {
		if (this.#progress) return;

		//app.monitor(1, );

		this.#progress = setInterval(() => app.emit('trackprogress', { sec: ++this.#offset, total: this.#duration }), 1000);
	}

	#stopMonitor() {
		if (!this.#progress) return;

		clearInterval(this.#progress);
		this.#progress = null;
	}
}

function createVideo() {
	const e = dom.createElement('video');

	e.controls = true;
	e.disablePictureInPicture = true;
	e.disableRemotePlayback = true;
	e.setAttribute('controlslist', 'nodownload');
	
	// const codecs = [
	// 	'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
	// 	, 'video/mp4; codecs="avc1.4d002a, mp4a.40.2"'
	// ];

	// for (const i of codecs)
	// 	console.log('PLAYER MP4:', e.canPlayType(i), '=>', i);

	// e.setAttribute('type', 'video/mp4; codecs="avc1.4d002a, mp4a.40.2"');
	
	return e;
}

export {
	Player
}
