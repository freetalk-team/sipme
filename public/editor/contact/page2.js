

import { ContactContent, ChannelContent } from './content2.js';
import { loadArticle } from '../channel/common.js';
// import MP4 from '../../ui/lib/mp4.js';


const kLifecycleInterval = 1 * 60 * 1000; // 5 min
const kMaxMessageSize = 2600;

class ChatListPage extends UX.ListPage {

	static id = 'contact';

	#active = false;

	get active() { return this.#active; }

	constructor(parent) {
		super(parent);

		this.bottom = true;

		// this.registerClickHandlers();
		//this.scrollBottom();

		// this.area.addEventListener('drop', () => { console.log('DROP contact'); });

	}

	get type() { return ChatListPage.id; }

	get loadingElement() { return this.area.querySelector('.loading'); }
	get contentElement() { return this.area.querySelector('.chat-content'); }

	get dragOptions() { 
		return {
			directory: false
			, hover: true
			, files: ['image', 'audio', 'video', 'text', 'pdf', 'zip']
			// , files: ['image', 'audio']
			, items: ['contact', 'room', 'channel', 'playlist'] // internal
		}
	}

	show() {
		this.#active = true;
		super.show();
	}

	hide() {
		this.#active = false;
		super.hide();
	}

	toggleLoading() {
		const loading = this.loadingElement;
		loading.classList.toggle('hidden');
	}

	showLoading(show=true) {
		const e = this.loadingElement;

		if (show) e.classList.remove('hidden');
		else e.classList.add('hidden');
	}
}

export class ContactPage extends ChatListPage {

	#content = null;

	get uri() { return this.#content.uri; }
	get id() { return this.#content.id; }
	get isChannel() { return this.#content.isChannel; }

	set mode(m) {
		this.container.setAttribute('mode', m);

		const share = this.headerElement.querySelector('button[name="share"]');
		share.setAttribute('cmd', `share-${m}`);
	}

	constructor(container) {
		if (!container) {
			container = dom.renderTemplate('editor-base', {}, 'div', 'editor-header-contact', 'editor-chat');
			container.id = 'contact-editor';
		}

		super(container);

		this.mode = 'contact';

		// const clear = header.querySelector('button[name="clear"]');
		// clear.addEventListener('click', (e) => {
		// 	// app.openEditor('video', 'call', 'radio1', { audio: true, video: false });
		// 	const muted = false;
		// 	app.openEditor('video', 'call', 'radio1-777', { audio: true, video: false, muted });
		// });

		this.cache = new Map;
		this.lastMsgDay = 0;

		app.on('chatmsg', e => this.onMessage(e.detail));
		app.on('confirm', e => this.onMessage(e.detail));
		app.on('gamemsg', e => this.onGameMessage(e.detail));
		app.on('status', e => this.updateStatus(e.detail));

		app.on('answer', e => {

			const videos = this.area.querySelectorAll('iframe, video');
			for (const i of videos) {
				if (i.tagName.toLowerCase() === 'video') {
					i.pause();
				} else {
					const src = i.src;
					i.src = src;
				}
			}
		});

		app.on('contactadd', e => this.#onContactAdd(e.detail));
		
		app.on('daychange', () => {
			if (this.#content)
				this.#content.onDateChange();
		});
	}

	get current() { return this.id; }

	get head() {
		const h = this.headerElement;

		const title = h.querySelector('h2');
		const ns = h.querySelector('.ns');
		const avatar = h.querySelector('img.avatar');
		const call = h.querySelector('button[name="call"]');

		//const content = this.list.area;

		return { title, ns, avatar, call, header: h };
	}

	

	onAction(name, e, target) {

		if (!this.#content) return;

		switch (name) {

			case 'clear':
			this.#content.clearChat();
			break;
		}
		
	}

	onEditorAction(name, e, target) {

		switch (name) {

			case 'send':
			this.#handleSend(null, target);
			break;

			default:
			this.#content.onAction(name, e, target);
			break;
		}
	}

	onCommand(target, action) {

		if (target == 'contact') {

			switch (action) {

				case 'clear':
				// todo: clear content
				break;

			}
		}
	}

	onInput(e) {
		const msg = e.innerText.trim();
		const send = e.parentElement.lastElementChild;

		if (msg == '') {
			send.disabled = true;
			return;
		}

		if (msg.length > kMaxMessageSize) {
			// todo
		}

		send.disabled = false;
	}

	onKeyPress(e, key) {
		if (key == 'Enter') {
			this.#handleSend(e);
		}
	}

	async open(type, id) {

		let data;
		if (typeof id == 'object') {
			data = id;
			id = data.id;
		}

		if (this.#content) {

			if (type == this.#content.type && id == this.#content.id)
				return;

			this.#content.y = this.posY;
			this.#content.hide(this);
		}

		// if (!this.#timer) {
		// 	this.#timer = setInterval(() => this.#onUpdate(), kLifecycleInterval);
		// }

		//const uri = getSipUri(id);

		const item = this.cache.get(id);

		let content, load = false;

		if (!item) {

			console.log('Contact: Content not exists!', id, typeof id);

			let contact = data;

			if (type == 'room') {
				if (!contact)
					contact = await app.loadRoom(id);

				content = new ChannelContent(contact, this);
			}
			else {
				if (!contact)
					contact = await app.loadContact(id);

				content = new ContactContent(contact, this);

			}

			this.cache.set(id, { contact, content });

			load = true;
		}
		else {
			content = item.content;
		}

		this.mode = type;

		const { title, ns, avatar, call, header } = this.head;

		// const id = content.id;
		const name = content.name;
		const status = content.status;

		header.dataset.id = id;
		title.innerText = name;
		ns.innerHTML = dom.renderEmojis(status);
		avatar.src = content.photo;
		call.disabled = content.isChannel;

		this.#content = content;

		if (load) {
			await content.load();

			if (!content.isChannel)
				app.subscribeUserPresence(id);
		}

		// this.headerElement.dataset.id = id;

		content.show(this);

		// if (!item)
		// 	this.scrollBottom();

		// this.showLoading(content.more);
		// this.setFocus();

	}

	async sendMessage(text) {

		text = text.trim();
		if (!text) return;

		// text = renderMessage(text);
		// text = renderEmojis(text);

		console.log('Sending message', this.id, text);

		try {

			await this.#sendMessage(this.id, text);

			// await app.sendMessage(this.#id, text);

			this.posY = 1;
			// this.#content.addMessage({
			// 	name: 'you'
			// 	, msg: text
			// 	, own: true
			// });
		}
		catch (e) {
			// todo: handle error
			console.error('Exception', e);
		}

	}

	destroyContent(content) {
		const id = content.id;
		this.cache.delete(id);

		content.onDestroy();
	}

	async onMessage(message) {

		const from = message.room || message.user;
		const id = from.id;

		console.log('Editor: On message', id);

		let content;
		let scroll = false;

		if (this.#content && id == this.id) {
			content = this.#content;
			scroll = true;
		}
		else {

			const item = this.cache.get(id);
			if (item) {
				content = item.content;
			}
		}

		if (content && !message.own) {

			if (typeof message == 'object') {
				if (message.encrypted) {

					// const key = await content.loadKey();
					// const counter = base64ToBuffer(message.iv);
	
					// const decrypt = async (m, k) => `<pre>${await decryptMessage({ key, counter }, k)}</pre>`;

					// const [text, count] = await asyncStringReplace(message.msg, /\$\$(.+)\$\$/g, decrypt);
	
					// message.msg = text;
				}
			}

			content.addMessage( message );
		}

		if (this.active && scroll)
			app.editor.scrollBottom();
	}

	onGameMessage(m) {
		if (m.params) {
			// invite

			this.onMessage(m.user, m);

		}
	}

	updateStatus(data) {

		if (this.#content && data.id == this.id) {
			const container = this.headerElement;
			dom.updateValues(container, data);
		}
	}

	// #onScrollPosChange(y) {
	onScrollY(y) {
		const kThreshold = 10;

		if (y > kThreshold) return;
		if (!this.#content || !this.#content.more) return;

		console.debug('Contact content on scroll:', y);

		this.#content.loadHistory();
	}

	onResize(totalHeightOld, totalHeight, height) {
		// console.debug('CHAT on height change', totalHeight, height);

		if (!this.#content || !this.#content.more) return;

		if (totalHeight <= height)
			this.#content.loadHistory();
	}

	async onFileDrop(files) {

		if (files.length == 1) {

			const f = files[0];
			if (f.size < kMaxMessageSize && fileX.getFileType(f) == 'text') {

				// sending as a message
				this.#content.sendFile(f);
				return;
			}
		}

		console.log('Contact editor on file drop:', files.length);

		const other = [];

		this.#content.uploadFiles(files);

		if (other.length > 0) {
			console.error('Skipped files:', other.length);
		}
	}

	async onDrop(info, ctype) {
		console.log('Chat editor on drop', ctype, info);

		if (this.id == info.id) {
			console.debug('Skiping to send to same user!');
			return;
		}

		info._type = ctype;

		return this.#sendMessage(this.id, info);
	}

	async onClick(id, e, target) {

		console.log('Contact editor on click', id);

		switch (target.tagName) {

			case 'BUTTON':
			this.#handleAction(target.name, target, id, e);
			return;
		}

		if (e.classList.contains('feed')) {

			let article = e.querySelector('.article');
			if (article) {
				article.classList.toggle('hidden');
				return;
			}

			const data = {
				id,
			};
	
			dom.getValues(e, data);
	
			await loadArticle(data, e);

			return;
		}

	}

	#sendMessage(id, ...args) {
		// return this.#content.isChannel ? app.sendRoomMessage(...args) : app.sendMessage(...args);
		return this.#content.handleSendMessage(...args);
	}

	#onUpdate() {

		console.log('Contact editor on update');

		const now = Date.now();

		for (const [id, item] of this.cache) {

			const content = item.content;

			if (content == this.#content) continue;

			if (content.timeout < now) {

				content.destroy();

				this.cache.delete(id);
			}

		}

	}

	#handleAction(action, target, id, e) {

		switch (action) {

			case 'remove':
			// todo: check is downloading
			dom.removeElement(e);
			break;

			// case 'download':
			// target.disabled = true;
			// e.classList.add('downloading');
			// break;

			case 'saveall':
			break;
		}

	}

	#handleSend(input, button) {

		let value;

		if (!button) {
			button = input.parentElement.lastElementChild;
			value = input.value || input.innerText;;
		}
		else if (!input) {
			input = button.parentElement.firstElementChild;
			value = button.inputValue;
		}

		button.disabled = true;

		const text = value.trim();

		if (text)
			this.sendMessage(text);
	}

	#onContactAdd({ id }) {

		if (this.#content.id == id)
			this.mode = 'contact';

	}
}




function getTitleFromFilename(filename) {
	const i = filename.lastIndexOf('.');

	let t = i != -1 ? filename.slice(0, i) : filename;

	// remove the '01 - '
	return t.replace(/^\d{1,2}\s*-\s*/, '').replace(/_+/g, ' ');
}

async function asyncStringReplace(str, regex, aReplacer) {
    const substrs = [];
    let match;
	let i = 0;
	let count = 0;
    while ((match = regex.exec(str)) !== null) {

		//console.log('#$$', str);

        // put non matching string
        substrs.push(str.slice(i, match.index));
        // call the async replacer function with the matched array spreaded
        substrs.push(aReplacer(...match));
		i = regex.lastIndex;
		++count;
    }
    // put the rest of str
    substrs.push(str.slice(i));
    // wait for aReplacer calls to finish and join them back into string
    return [(await Promise.all(substrs)).join(''), count];
};


/* Overwrite links

$('.link').click(function(){
  location.href = $(this).attr('data-url');
});

.link{
  background: red;
  padding: 2px;
  margin: 2px;
  cursor: pointer;
}

<span class="link" data-url="https://stackoverflow.com">Link span</span>



It can be done with HTML 5 video and canvas tags:

HTML:

<input type="file" id="file" name="file">

<video id="main-video" controls>
   <source type="video/mp4">
</video>

<canvas id="video-canvas"></canvas>

Javascript:

var _CANVAS = document.querySelector("#video-canvas");
var _CTX = _CANVAS.getContext("2d");
var _VIDEO = document.querySelector("#main-video");

document.querySelector("#file").addEventListener('change', function() {

    // Object Url as the video source
    document.querySelector("#main-video source").setAttribute('src', URL.createObjectURL(document.querySelector("#file").files[0]));

    // Load the video and show it
    _VIDEO.load();

    // Load metadata of the video to get video duration and dimensions
    _VIDEO.addEventListener('loadedmetadata', function() {
        // Set canvas dimensions same as video dimensions
        _CANVAS.width = _VIDEO.videoWidth;
        _CANVAS.height = _VIDEO.videoHeight;
    });

    _VIDEO.addEventListener('canplay', function() {
        _CANVAS.style.display = 'inline';
        _CTX.drawImage(_VIDEO, 0, 0, _VIDEO.videoWidth, _VIDEO.videoHeight);
    });

});


var handler = {
    get: function(target, name) {
        if (name in target) {
            return target[name];
        }
        if (name == 'length') {
            return Infinity;
        }
        return name * name;
    }
};
var p = new Proxy({}, handler);

p[4]; //returns 16, which is the square of 4.



class Foo {
    constructor(v) {
        this.data = v
        return new Proxy(this, {
            get: (obj, key) => {
                if (typeof(key) === 'string' && (Number.isInteger(Number(key)))) // key is an index
                    return obj.data[key]
                else 
                    return obj[key]
            },
            set: (obj, key, value) => {
                if (typeof(key) === 'string' && (Number.isInteger(Number(key)))) // key is an index
                    return obj.data[key] = value
                else 
                    return obj[key] = value
            }
        })
    }
}

var foo = new Foo([])

foo.data = [0, 0, 0]
foo[0] = 1
console.log(foo[0]) // 1
console.log(foo.data) // [1, 0, 0]


*/

