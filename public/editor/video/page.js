
import { Header } from '../common.js';

const kHeader = ['editor-header-avatar', 'editor-video-toolbar'];
const kEditor = 'editor-video-base';

export class VideoEditor extends UX.Page {

	static id = 'video';

	#timeUpdater;
	#status;
	#duration;

	get excludeFromStack() { return true; }

	constructor() {

		const container = dom.renderTemplate('editor-base', {}, 'div', kHeader, kEditor);

		container.id = 'video-editor';
		container.classList.add('video-editor');

		super(container);

		this.editorElement.classList.add('dark');
		this.#status = this.headerElement.querySelector('.ns');
		
		app.on('answer', e => this.#setState('call'));
		app.on('hangup', e => this.#setState('initial'));
	}

	async open(action, info, opt={ audio: true, video: true }) {

		if (typeof info == 'string')
			info = await app.loadContact(info);

		console.log('Account editor open:', action, info, opt);

		const avatar = info.photo || app.defaultAvatar;
		const header = new Header(this.headerElement);

		header.title = info.display || info.name;
		header.desc = 'Ringing ...';
		header.avatar = avatar;

		const remote = this.container.querySelector('#remote-video');
		// remote.setAttribute('poster', avatar);
		remote.style.background = `transparent url(${avatar}) no-repeat center center`;

		// const icon = h.querySelector('i.fa.icon');
		// const title = h.querySelector('.title');
		// const desc = h.querySelector('.ns');

		// title.innerText = 'Call';
		// desc.innerText = 'Chat with friends, share screen';

		switch (action) {

			case 'call':
			this.#setState('ringing');
			// app.call(info.id, opt);
			break;

			case 'incomingcall':
			this.#setState('ringing');
			//setTimeout(() => app.answer(), 5000);
			break;
		}

	}

	#setState(state) {

		this.container.setAttribute('state', state);

		if (this.#timeUpdater) {
			clearInterval(this.#timeUpdater);
			this.#timeUpdater = null;
		}

		

		switch (state) {

			case 'ringing':
			break;

			case 'call':
			this.#duration = 0;
			this.#timeUpdater = setInterval(() => {
				this.#status.innerText = formatDuration(++this.#duration);
			}, 1000);
			break;


		}
	}
	
	

	// #handleIncomingCall(info) {
	// }

	#handleAction(action, e) {

		switch (action) {

			case 'hangup':
			app.hangup();
			break;

			case 'answer':
			app.answer();
			break;
		}

	}
}

function formatDuration(seconds) {
	var minutes = Math.floor(seconds / 60);
	var remainingSeconds = seconds % 60;

    // Add leading zeros if necessary
    var formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    var formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;

    return formattedMinutes + ':' + formattedSeconds;
}
