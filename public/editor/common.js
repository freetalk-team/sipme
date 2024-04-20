
import { createPopup } from '../ui/lib/picmo/popup.js';
import { CommentBottom } from './channel/comment-bottom.js';

const kShowResults = 10;
const kIconSelector = '[role="icon"]';

class Header {

	#elem;

	constructor(container) {
		this.#elem = container;
	}

	set title(text) {
		const e = this.#elem.querySelector('.title');
		e.innerText = text;
	}

	set desc(text) {
		const e = this.#elem.querySelector('.ns');
		e.innerText = text;
	}

	set icon(id) {
		const e = this.#elem.querySelector(kIconSelector);
		const classes = e.className.split(' ').slice(0, -1);
		classes.push(id);
		e.className = classes.join(' ');
	}

	set avatar(url) {
		const e = this.#elem.querySelector('.avatar');
		e.src = url;
	}

	set region(id) {
		const e = this.#elem.querySelector('.flag-icon');
		e.className = 'flag-icon';

		if (id)
			e.classList.add(`flag-icon-${id}`);
	} 

	set mode(mode) {
		this.#elem.setAttribute('mode', mode);
	}

	get icon() {

		class Wrapper {
			#e;
			constructor(e) { this.#e = e; }

			set name(v) { this.#e.setAttribute('name', v); }
			set id(v) { this.#e.setAttribute('value', String.fromCodePoint(parseInt(v||'f111', 16))); }
			set color(v) { this.#e.style.color = v||'inherit'; }
			set region(v) { 
				const i = this.#e.querySelector('.flag-icon');
				i.className = `flag-icon flag-icon-${v}`;
			}
		}

		const e = this.#elem.querySelector(kIconSelector);
		return new Wrapper(e);
	}

	set admin(v) {
		const b = this.#elem.querySelector('button[name="admin"]');
		if (b) v ? dom.showElement(b) : dom.hideElement(b);
	}

	get toolbar() { return this.#elem.querySelector('.toolbar'); }
	get right() { return this.#elem.querySelector('.right'); }

	set onclick(cb) { this.#elem.onclick = cb; }

	get headline() { return this.#elem.querySelector('.headline'); }

	button(name) {
		return this.#elem.querySelector(`button[name="${name}"]`);
	}

	role(name) {
		return this.#elem.querySelector(`[role="${name}"]`);
	}

	q(selector) {
		return this.#elem.querySelector(selector);
	} 
}

class Caret {
	/**
	 * get/set caret position
	 * @param {HTMLColletion} target 
	 */
	constructor(target) {
		this.target = target
	}

	get contentEditable() { return !!this.target.contentEditable; }

	/**
	 * get caret position
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Range}
	 * @returns {number}
	 */
	getPos() {
		// for contentedit field
		if (this.contentEditable) {
			this.target.focus()
			let _range = document.getSelection().getRangeAt(0)
			let range = _range.cloneRange()
			range.selectNodeContents(this.target)
			range.setEnd(_range.endContainer, _range.endOffset)
			return range.toString().length;
		}
		// for texterea/input element
		return this.target.selectionStart
	}

	/**
	 * set caret position
	 * @param {number} pos - caret position
	 */
	setPos(pos) {
		// for contentedit field
		if (this.contentEditable) {
			this.target.focus()

			try {
				document.getSelection().collapse(this.target, pos)
			}
			catch (e) {}

			return
		}
		this.target.setSelectionRange(pos, pos)
	}
}

function createEmojiPicker(button, input, position='auto') {
	const picker = createPopup({}, {
		// The element that triggers the popup
		triggerElement: button,
	  
		// The element to position the picker relative to - often this is also the trigger element,
		referenceElement: button,
	  
		// specify how to position the popup
		// position: 'top-end'
		position,

		hideOnClickOutside: false
	});

	picker.addEventListener('picker:close', () => {

		const e = input.tagName && ['INPUT', 'TEXTAREA'].includes(input.tagName) ? input : input.element;

		const car = new Caret(e);
		const p = car.getPos();
		car.setPos(p + 1);

		e.focus();

		delete document._popup;
	});

	picker.addEventListener('picker:open', () => {
		document._popup = picker;
	});

	picker.addEventListener('emoji:select', event => {
		console.log('Emoji selected:', event.emoji);

		input.value += event.emoji + ' ';

		const send = input.parent.lastElementChild;
		send.disabled = false;
	});

	button.blur();
	picker.open(); 
}

function createInputWrapper(e) {

	if (e.tagName == 'INPUT') return e;

	class Wrapper {
		#input;

		constructor(input) { this.#input = input; }

		get element() { return this.#input; }
		get parent() { return this.#input.parentElement; }

		get value() { return this.#input.innerText; }
		set value(v) { 
			this.#input.innerText = v;
			// this.#input.oninput();
		}

		set oninput(cb) { return this.#input.oninput = cb; }
		set onkeydown(cb) { this.#input.onkeydown = cb; }

		focus() { this.#input.focus(); }
	}

	return new Wrapper(e);
}

function renderLinks(container, text) {

	//const re = /http(s)?:\/\/[^\s]+/g;
	const re = /(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
	const rd = /(drive:\/\/)([-_a-zA-Z0-9]{2,256})([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

	let m;

	const images = [];

	while ((m = re.exec(text)) != null) {

		const url = m[0];

		try {

			const u = new URL(url);

			if (/youtube.com/.test(u.hostname)) {

				const vid = u.searchParams.get('v');

				if (!vid)
					continue;

				const box = dom.createElement('a', 'yt', 'w3-padding', 'noevents');
				box.dataset.id = vid;
				// const icon = dom.createElement('i', 'fa', 'youtube');

				const img = dom.createElement('img');
				img.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;

				// box.appendChild(icon);
				box.appendChild(img);

				container.appendChild(box);

				continue;
			}

			let path = u.pathname;

			const [ , ext ] = fileX.getFilename(path);
			
			if (ext) {
				if (fileX.isImage(ext))
					images.push(url);
			}
			// else {

			// 	const params = u.searchParams;
			// 	const type = params.get('type');

			// 	if (type == 'image') {
			// 		images.push(url);
			// 	}
			// }

		}
		catch (e) {
			console.error('Failed to parse URL:', url);
		}
	}

	while ((m = rd.exec(text)) != null) {

		const link = m[0];
		const url = new URL(link);
		const type = url.searchParams.get('type');

		if (type == 'image')
			images.push(link);
	}

	if (images.length > 0)
		renderImages(container, images);

}

async function renderImages(container, images) {

	// todo: start loading

	// const drive = /^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/;

	let url, m;

	for (let i = 0; i < images.length; ++i) {

		url = images[i];

		if (/*m = url.match(drive)*/url.startsWith('drive')) {

			const [, id, type ] = url.match(/drive:\/\/([^?]+)\?type=([a-z]+)/);
			const thumb = await app.google.loadImage(id);

			if (thumb)
				images[i] = thumb;
		}
	}

	const e = dom.renderTemplate('slideshow', images, 'div margin-top');
	container.appendChild(e);
}

class Search {

	#container;

	#more;
	#less;
	#offset = 0;
	#template;
	#ds;
	#search = '';
	#results;

	get results() { return this.#results; }
	get resultsElement() { return this.#container.querySelector('.results'); }

	getResult(id) { return this.#results.get(id); }

	constructor(container, ds) {

		this.#container = container;
		this.#more = container.querySelector('a[name="more"]');
		this.#less = container.querySelector('a[name="less"]');
		this.#template = `search-${ds}-results`;
		this.#ds = app.ds(ds);
	}

	async search(local=new Set, ...params) {

		dom.hideElement(this.#less);
		dom.hideElement(this.#more);

		const area = this.#container;

		this.clear();

		area.classList.add('loading3');

		const data = await delayResolve(this.#ds.search(this.#search, ...params), 1200);

		console.debug('Got results:', data);

		if (data && data.length > 0) {

			data.local = local;

			const e = dom.renderTemplate(this.#template, data)
			dom.insertBefore(e, area.lastElementChild);

			if (data.length > kShowResults) {
				dom.showElement(this.#more);

				const items = Array.from(e.childNodes).slice(kShowResults);
				for (const i of items)
					dom.hideElement(i);
			}
		}

		area.classList.remove('loading3');
		//area.appendChild(e);

		this.#results = new Map(data.map(i => [i.id, i]));

		return data;
	}

	disableResult(id) {
		const container = this.resultsElement;
		const e = container.querySelector(`.item[data-id="${id}"]`);

		if (e) {
			const actions = e.querySelector('.actions');
			dom.removeElement(actions);

			e.classList.add('italic', 'watermark');
		}

		return this.#results.get(id);
	}

	cloneResultElement(id, actions, disable=false) {
		const container = this.resultsElement;
		let e = container.querySelector(`.item[data-id="${id}"]`);
		let item;

		if (e) {

			item = e.cloneNode(true);

			if (actions) {
				let e = item.querySelector('.actions');
				dom.removeElement(e);

				e = dom.renderTemplate(actions);
				item.appendChild(e);
			}

			if (disable) {
				const actions = e.querySelector('.actions');
				dom.removeElement(actions);

				e.classList.add('italic', 'watermark');
			}
		}

		return item;
	}

	clear() {
		let e = this.resultsElement;
		if (e) dom.removeElement(e);

		e = this.#container.querySelector('.input-area');

		const input = e.firstElementChild;
		input.value = '';
		input.focus();

		const search = e.lastElementChild;
		search.disabled = true;

		dom.hideElement(this.#less);
		dom.hideElement(this.#more);

		this.#offset = 0;
	}

	showMore() {

		this.#offset += kShowResults;

		const e = this.resultsElement;
		const all = Array.from(e.childNodes);
		const items = all.slice(this.#offset, this.#offset + kShowResults);
		for (const i of items)
			dom.showElement(i);

		if (this.#offset + kShowResults >= all.length)
			dom.hideElement(this.#more);

		dom.showElement(this.#less);
	}

	showLess() {
		const e = this.resultsElement;
		const items = Array.from(e.childNodes).slice(this.#offset, this.#offset + kShowResults);

		for (const i of items)
			dom.hideElement(i);

		this.#offset -= kShowResults;
		if (this.#offset == 0)
			dom.hideElement(this.#less);

		dom.showElement(this.#more);
	}

	onInput(e) {
		const v = e.value;
		// const send = e.parentElement.lastElementChild;
		
		// send.disabled = v.length < 3;
		this.#search = v;

		// const clear = send.previousElementSibling;
		// clear.disabled = v.length == 0;
	}
}

class TorrentMonitor {

	#container;
	#progress;
	#speed;
	#total;
	#start;

	constructor(e) {
		this.#progress = e.querySelector('progress');
		this.#speed = e.querySelector('[role="speed"]');
		this.#total = parseInt(e.dataset.size);
		this.#start = Date.seconds();
		this.#container = e;

		e.setAttribute('state', 'downloading');
	}

	progress(portion) {
		if (portion == 1) {
			const id = this.#container.dataset.id;
			this.done(id);
			return;
		}

		this.#progress.value = Math.floor(portion * 100);

		const size = Math.floor(this.#total * portion);
		const interval = Date.seconds() - this.#start;

		this.#speed.innerText = `${fileX.formatSize(size/interval)}/s`;
	}

	done(id) {
		console.debug('On torrent done:', id);
		this.#progress.value = 100;
		this.#container.setAttribute('state', 'done');
	}
}

class CommentReplies {

	static wrap(parent, group) {
		const g = parent.wrapGroup(group);
		return new CommentReplies(g);
	}

	static create(parent, opt) {
		const g = UX.List.createGroup(parent, opt);
		return new CommentReplies(g);
	}

	#group;

	constructor(group) {
		this.#group = group;
	}

	loadRecent() {
		const recent = app.recent.comment;
		// const msgs = recent.replies;
		const msgs = recent;

		console.debug('Adding replies:', msgs.length);

		for (const i of msgs) 
			this.#group.add(i);
	}

	async add(m) {
		let e;

		if (m.own) {

			// comments
			let template = 'editor-sidebar-comment-reply';

			const channel = typeof m.channel == 'string' ? m.channel : m.channel.id;

			if (m.parent == channel) {

			}
			else {
				
				if (!m.comment) {
					const ds = app.ds('comment');

					const comment = await ds.get(m.gid);
					if (!comment) {
						console.error('Reply to unknown comment received:', m);
						return;
					}

					m.comment = comment;
				}

				// replies
				const msgs = this.#group.getElements(m.gid);
				for (const i of msgs)
					addComment(i, m.msg);
			}
				
			//e = this.#comments.addTemplate(template, m, true);
			
		}
		else {
			// console.debug('You message:', m);
			// this.#replies.add(m, true);

			const id = m.gid;

			e = this.#group.getItem(id);
			if (e) {

				let msg = e.querySelector('.msg');

				const rep = msg.querySelector('[data-replies]');
				const count = parseInt(rep.dataset.replies);

				dom.removeElement(msg);

				msg = dom.renderTemplate('editor-sidebar-msg', m, 'div', [count + 1]);
				dom.insertTop(msg, e);

				const g = this.#group.wrapGroup(id);

				g.add(m, true);
			}
			else {

				let comment = m.comment;

				if (!comment)
					comment = await app.ds('comment').get(id);

				comment.childs = [m];
				e = this.#group.add(comment, true);
			}
		}

		if (e) dom.highlightElement(e);
	}

	update(comments) {
		for (const i of comments) {
			const items = this.#group.getElements(i.id);
			for (const e of items) {
				const bottom = CommentBottom.from(e);
				bottom.update(i);
			}
		}
	}
}

function addComment(item, msg) {
	const reply = item.querySelector('button[name="reply"]');
	if (reply) {
		const container = reply.parentElement;

		const i = dom.createElement('i', 'fa', 'fa-comment', 'fade', 'watermark-6');

		dom.removeElement(reply);
		container.appendChild(i);

		const input = item.querySelector('.input');
		if (input)
			dom.removeElement(input);

		const e = dom.createElementFromMarkdown(msg);
		dom.insertAfter(e, container);
	}
}

export {
	Header,
	Search,
	TorrentMonitor,
	createEmojiPicker,
	createInputWrapper,

	renderLinks,

	CommentReplies
}