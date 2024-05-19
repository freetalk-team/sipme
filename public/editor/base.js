
import './add/page2.js';
import './find/page.js';

import { PageBase } from './page.js';
import { Sidebar } from './sidebar.js';

import { createEmojiPicker, createInputWrapper, TorrentMonitor } from './common.js';
import { loadArticle } from '../editor/channel/common.js';

export class EditorBase extends UX.PageController {

	static Page = PageBase;
	static Sidebar = Sidebar;

	static #editors = {};
	static register(Editor, id=Editor.id) { 
		EditorBase.#editors[id] = Editor;
	}

	#dragCounter = 0;
	#container;
	#stack = [];
	#mo;
	#scrollable;
	#sidebar;
	#current;
	#autocomplete;

	get currentEditor() { return this.#current; }
	get loadingElement() { return document.getElementById('editor-loading'); }
	get showHover() { return this.#current.dragOptions && this.#current.dragOptions.hover; }
	get container() { return this.#container; }
	get dragOptions() { return this.#current.dragOptions; }

	constructor(id='editor') {
		super();

		const e = document.getElementById(id);

		this.#container = e;

		e.onclick = (e) => this.#onClick(e.target, { x: e.clientX, y: e.clientY });
		e.oninput = (e) => this.onInput(e.target, e.data);
		// e.onchange = (e) => this.onInput(e.target, e.data);
		e.onkeyup = (e) => {
				// enter
			if (e.key == 'Enter' && !e.shiftKey) { 
				e.preventDefault();

				const target = e.target;
				const area = target.closest('.search-area');

				let pass = true;

				if (area) {
					pass = !doSearch(area);
				}
				
				if (pass) {
					this.onKeyPress(target, e.key);
				}
			}
		}

		e.onkeydown = (e) => {
			// enter
			if (e.key == 'Enter' && !e.shiftKey) { 
				e.preventDefault();
			}
		}

		e.onchange = (e) => this.onChange(e.target, e.target.value);
		
		// this.#createMutationObserver();
		this.#addCommonEditors();
	}

	registerMouseEvents() {
		document.onmousedown = (e) => {

			const target = e.target;

			if (target.classList.contains('v-sash')) {

				const area = target.previousElementSibling;
				const reverse = target.classList.contains('reverse');
				//console.log('SASH mousedown', e.target);
	
				const startX = e.clientX;
				// const startW = parseInt(document.defaultView.getComputedStyle(area).width, 10);
				const startW = area.offsetWidth;
	
				//console.log('SASH resize start', startX, startW);
	
				document.body.style.cursor = 'e-resize';
	
				const doDrag = (e) => {
					// console.log('###', e.clientX);
					const delta = startX - e.clientX;
					const width = reverse ? startW + delta : startW - delta;
					
					//console.log('SASH => ', reverse, delta, width);
	
					area.style.width = `${width}px`;
				};
	
				const stopDrag = (e) => {
					document.documentElement.removeEventListener('mousemove', doDrag, false);
					document.documentElement.removeEventListener('mouseup', stopDrag, false);
	
					document.body.style.cursor = 'default';
	
					// todo: use custom attribute
					const id = area.id;
					if (id) {
						const width = parseInt(area.style.width);
						this.updateWidth(id, width);
					}
				};
	
				document.documentElement.addEventListener('mousemove', doDrag, false);
				document.documentElement.addEventListener('mouseup', stopDrag, false);
			}

			// todo: handle v slider properly
		}
	}

	onAction(action, e, target) {

		const params = [];

		switch (action) {

			case 'send': {
				const area = target.closest('.input-area');
				if (area) {
					target.disabled = true;

					const input = area.firstElementChild;
					let value;
					if (input.hasAttribute('contenteditable')) {
						value = input.innerText;
						input.innerText = '';
					}
					else {
						value = input.value;
						input.value = '';
					}

					value = value.trim();

					target.inputValue = value;
					params.push(value);
				}
			}
			break;

			case 'play': {

				const state = target.value == 'pause' ? 'play' : 'pause'

				target.value = state;
				target.title = state.capitalizeFirstLetter();
			}
			break;
		}

		const link = target.getAttribute('link');
		if (link) {
			const [, ...path ] = link.split('/');
			app.openEditor(...path);
			return;
		}

		let cmd = target.getAttribute('cmd');
		if (/^cmd-/.test(action))
			cmd = action.substr(4);

		if (cmd) {
			if (this.#onCommand(cmd, e, target, ...params))
				return;

			// this.#onCommand(cmd, e, target)
		}

		const ed = this.currentEditor;
		if (!ed) return;

		const header = ed.headerElement;
		if (header && header.contains(target)) {
			ed.onAction(action, e, target);
			return;
		}

		const sidebar = ed.sidebar;
		if (sidebar && sidebar.container.contains(target)) {
			sidebar.onAction(action, e, target);
			return;
		}

		if (ed.hasComments) {

			const group = target.closest('[comments]');
			if (group) {
				app.comments.onAction(target);
				return;
			}
		}

		let container = e;
		let remove = false;

		switch (action) {

			case 'call':
			app.openEditor('video', 'call', e.dataset.id, { audio: true, video: false });
			return;

			case 'emoji': {
				const input = createInputWrapper(target.parentElement.firstElementChild);
				createEmojiPicker(target, input, 'top-end');
			}
			return;

			case 'share':
			if (e.dataset.type) {
				app.share(e.dataset.type, e.dataset.id);
				return;
			}
			break;

			case 'cancel':
			case 'submit': 
			if (e.getAttribute('mode') == 'edit') {
				e.removeAttribute('mode');

				container = e.querySelector('[role="edit"]');
				dom.removeElement(container);
			}

			break;

			case 'remove':
			case 'delete':
			dom.removeElement(e);
			break;
		}

		ed.onEditorAction(action, e, target);
		
		// if (remove)
		// 	dom.removeElement(e);
	}

	onClick(e, pos) {


		let ed = this.currentEditor;
		if (!ed) return;

		const sidebar = ed.sidebar;
		if (sidebar && sidebar.container.contains(e)) {
			// sidebar.onClick(action, e, target);
			// return;

			ed = sidebar;
		}
		else {
			// todo: use closest
			// while (e.hasAttribute('container')) e = e.parentElement;

			if (e.hasAttribute('contenteditable') || ['INPUT', 'SELECT'].includes(e.tagName)) 
				return;

			if (ed.hasComments) {

				const group = e.closest('[comments]');
				if (group) {
					app.comments.onClick(e, group);
					return;
				}
			}

		}

		if (e.hasAttribute('expandable')) {
			const parent = e.closest('[data-id]');
			if (parent)
				e = parent;
		}
		

		const isItem = e.classList.contains('item');
		let id, group, selected;

		if (isItem) {

			e.removeAttribute('new');
			e.classList.remove('new');

			const collapsable = e.querySelector('[collapsable]');

			if (collapsable)
				collapsable.classList.toggle('hidden');

			// selected = e.classList.toggle('selected');
			if (e.hasAttribute('selected')) {
				selected = false;
				e.removeAttribute('selected');
			}
			else {
				selected = true;
				e.setAttribute('selected', '');
			}

			id = e.dataset.id;

			const g = e.closest('[group]');
			group = g ? g.getAttribute('group') : null;

			// check is command
			let cmd = e.getAttribute('cmd');

			if (!cmd && g)
				cmd = g.getAttribute('cmd');

			if (cmd) {
				this.#onCommand(cmd, e);
			}

			ed.onClick(id, e, selected, group);
		}
		else {

			const tab = e.getAttribute('tab');
			if (tab) {
				if (!e.classList.contains('active')) {

					const navbar = e.parentElement;

					let current = navbar.querySelector('.tab.active');
					current.classList.remove('active');

					e.classList.add('active');

					const currentTab = current.getAttribute('tab');
					const container = navbar.nextElementSibling;

					if (container.getAttribute('role') == 'tab-area') {
						let p;
					
						p = container.querySelector(`[page="${currentTab}"]`);
						dom.hideElement(p);
	
						p = container.querySelector(`[page="${tab}"]`);
						dom.showElement(p);
					}
					else {
						ed.onTabChange(tab, currentTab);
					}
				}

				return;
			}

			let cmd = e.getAttribute('cmd');

			if (cmd) {
				const item = e.closest('.item');
				this.#onCommand(cmd, item, e);
			}

			ed.onElementClick(e, pos);
		}
	}

	onInput(e, key) {

		// console.log(key);

		closeAllLists(e);

		const name = e.getAttribute('name');
		const ed = this.currentEditor;

		let exp = false;

		if (e.tagName == 'INPUT') {

			const value = e.value.trim();

			if (key) {

				if (value.isExpression()) {

					e.setAttribute('exp', true);
					e.setAttribute('_ph', e.placeholder);
					e.placeholder = 'expression';
					e.spellcheck = false;
					e.value = '';

					exp = true;

					return;
				}
				else {
					exp = e.hasAttribute('exp');
				}
			}
			else {
				if (value == '' && e.hasAttribute('exp')) {
					e.placeholder = e.getAttribute('_ph');
					e.removeAttribute('_ph');
					e.removeAttribute('exp');
				}
			}

			if (name == 'search') {

				const area = e.parentElement;
				const search = area.lastElementChild;
				const valid = value.length > 2;

				search.disabled = !valid;

				const clear = search.previousElementSibling;
				clear.disabled = value.length == 0;

				if (/*valid &&*/ ed)
					ed.onFilter(value, e);

				return;
			}
		}

		//console.debug('Base eitor on input');
		if (!ed) return;
		
		if (name == 'comment') {
			const v = e.innerText;

			const area = e.parentElement;
			const send = area.lastElementChild;

			send.disabled = !/.{2,2000}/.test(v.trim());

			return;
		}

		let attr;

		if (!exp) {
		
			attr = e.getAttribute('ds');
			if (attr) {

				const ds = app.ds(attr);
				if (ds) {

					this.#autocomplete = e;
					handleAutocomplete(e, ds);
				}
			}

			attr = e.getAttribute('_ac');
			if (attr) {
				this.#autocomplete = e;
				handleAutocompleteEditor(e, ed, attr);
			}

			if (e.hasAttribute('contenteditable'))
				e.value = e.innerText;

		}

		ed.onInput(e, key, exp);
	}

	onKeyPress(e, key) {
		//console.debug('Base eitor on input');
		const ed = this.currentEditor;
		if (!ed) return;

		if (ed.hasComments) {
			const group = e.closest('[comments]');
			if (group) {
				app.comments.onKeyPress(e, key);
				return;
			}
		}

		if (key == 'Enter') {

			let tag = e.tagName.toLowerCase(), value = e.value;

			if (e.hasAttribute('contenteditable')) {
				value = e.innerText;
				tag = 'input';
				e.innerText = '';
			}
			else {
				e.value = '';
			}

			if (['input'/*, 'select'*/].includes(tag)) {
				value = value.trim();
				e.inputValue = value;

				const name = e.getAttribute('name');

				switch (name) {

					case 'comment': {
						const area = e.parentElement;
						const send = area.lastElementChild;

						const cmd = send.getAttribute('cmd');
						if (cmd) {
							const item = area.closest('[data-id]');

							if (item)
								item.removeAttribute('selected');

							this.#onCommand(cmd, item, send, value);
						}

						// send.disabled = true;
					}
					break;
				}
				
			}
		}

		ed.onKeyPress(e, key);

	}

	onChange(e, value) {

		if (e.tagName != 'SELECT') return;
	
		closeAllLists();

		// const name = e.getAttribute('name');
		const ed = this.currentEditor;

		//console.debug('Base eitor on input');
		if (!ed) return;

		ed.onChange(e, value);
	}

	onElementClick() {}
	handleCommand() {}

	scrollTo(e) {
		if (this.#scrollable)
			this.#scrollable.scrollTo(e);
	}

	scrollBottom() {
		if (this.#scrollable)
			this.#scrollable.scrollBottom();
	}

	switchTo(id) {

		let p = this.currentEditor;
		if (!p) {
			p = super.switchTo(id);
		}
		else {

			if (this.current == id) return p;

			const loading = this.loadingElement;

			p.hide();
			dom.showElement(loading);
			
			p = this.getPage(id);

			setTimeout(() => {
				dom.hideElement(loading);
				super.switchTo(id)
			}, 800);
		}

		if (p)
			this.#setCurrent(p);

		return p;
	}

	addToStack() { 

		const id = this.current;
		if (!id) return;

		const editor = this.currentPage;

		if (!editor.excludeFromStack && 
			(this.#stack.length == 0 || this.#stack[this.#stack.length - 1] != id) ) 
		{
			this.#stack.push(id);
		}

	}

	handleEvent(e) {
		// console.log('Handle event:', e.type);

		// e.stopPropagation();
		// e.preventDefault();
		e.stopPropagation();
		e.preventDefault();

		// e.dataTransfer.dropEffect = "move";

		// console.log('#   Handle event:', e.target);
		// console.log('##  Handle event:', e.currentTarget);
		// // console.log('Handle event:', e.originalTarget);
		// console.log('### Handle event:', e.relatedTarget);

		switch (e.type) {
			case 'dragenter':
			if (this.#dragCounter++ == 0) {


				// let error = false;
				// const files = e.dataTransfer.files;
				// console.log('DRAG START:', files.length);


				// if (files.length > 0 && filterDraggedFiles(this.#dragOpts, files).length == 0)
				// 	error = true;

				// console.log('DRAG enter ...', e);

				// e.currentTarget.classList.add('hover');

				if (this.showHover)
					this.#container.classList.add('hover');
				
				// if (error)
				// 	this.#container.classList.add('error');

			}

			if (e.target.classList.contains('dropzone')) {
				console.debug('DROPZONE element enter');
				e.target.classList.add('hover');
			}

			return false;

			case 'dragleave':
			// case 'dragend':
			// // case 'dragover':
			// e.currentTarget.classList.remove('hover');
			// e.currentTarget.classList.toggle('hover');
			if (--this.#dragCounter == 0) 
				// e.currentTarget.classList.remove('hover');
					this.#container.classList.remove('hover', 'error');

			if (e.target.classList.contains('dropzone')) {
				console.debug('DROPZONE element leave');
				e.target.classList.remove('hover');
			}

			return false;

			case 'drop':
			this.onDrop(e);
			break;
		}

		// console.log('# CNT:', this.#dragCounter);

		// return false;

	}

	addPage(id, page, append=true) {
		const p = super.addPage(id, page);

		if (append)
			this.#container.appendChild(p.container);
		//this.#addObserver(p);
	}

	open(editor, id, ...args) {

		if (typeof editor != 'string')
			editor = editor.id;


		this.addToStack(editor);

		this.#dragCounter = 0;

		let ed = this.switchTo(editor);
		if (!ed) {

			const Editor = EditorBase.#editors[editor];
			if (!Editor) {
				console.error('Invalid editor:', editor);
				throw new Error('Invalid editor ' + editor);
			}

			let container;
			if (Editor.create)
				container = Editor.create();

			ed = new Editor(container);

			this.addPage(editor, ed);
			this.switchTo(editor);

			// ed.load();
		}


		

		
		//this.dropArea = ed.dropArea;

		// todo: handle CodeMirror textareas
		// const container = ed.editorElement;
		// const codeElements = container.querySelectorAll('textarea[type="codemirror"]');
		// for (const i of codeElements) {
			
		// }

		ed.open(id, ...args);

		// if (this.addToStack(editor))
		// 	this.#stack.push(this.current);
	}

	back() {
		const id = this.#stack.pop();
		console.log('Editor back', id);
		this.switchTo(id);
	}

	cancel(editor) {
		console.log('STACK: ', this.#stack);

		if (this.#stack.length == 0) return;
		// if (['add'].includes(editor) && editor != this.current) return;

		const top = this.#stack[this.#stack.length - 1];

		this.switchTo(top);
	}

	notify(msg, result='success') {
		const ed = this.currentEditor;
		if (!ed) return;

		const container = ed.editorElement;
		const box = dom.createElement('div', 'popup', 'top-right', 'w3-container', 'w3-padding', 'w3-round');
		box.setAttribute('value', result);
		box.innerHTML = msg;
		
		container.appendChild(box);
		setTimeout(() => dom.removeElement(box), 3000);
	}

	showNotification(msg, type='warning', timeout=2000) {

		let container = this.#container.querySelector('[role="popup-area"]');

		if (!container) return;

		const box = dom.renderTemplate('popup-item', { msg });
		container.appendChild(box);
		
		if (type != 'progress')
			setTimeout(() => dom.removeElement(box), timeout);

		return box;
	}

	// cancel() {

	// 	switch (this.current) {

	// 		case 'add':
	// 		case 'find':
	// 		const id = 
	// 		break;
	// 	}

	// }

	async onDrop(e) {
		const dt = e.dataTransfer;
		const fileList = dt.files;

		// console.log('# ON DROP', dt);

		const fileHandlesPromises = [...dt.items]
			.filter((item) => item.kind === 'file')
			.map((item) => item.getAsFileSystemHandle());

		const files = [];
		let directory;

		for await (const handle of fileHandlesPromises) {
			if (handle.kind === 'directory') {

				console.log(`Directory: ${handle.name}`);
				await getDirectoryFileMeta(handle, files);

				directory = handle.name;
			} else {
				console.log(`File: ${handle.name}`);
				const file = await handle.getFile();
				files.push(file);
			}
		}

		// if ('getFilesAndDirectories' in dt) {
		// 	console.log('Smart directory import');
		// 	return 
		// }

		this.#dragCounter = 0;
		this.#container.classList.remove('hover');

		//const files = dt.files;

		this.handleImport(files, directory);
	}

	async onImport(fileHandles) {
		const files = [];
		let directory;

		for (const handle of fileHandles) {
			if (handle.kind === 'directory') {

				console.log(`Directory: ${handle.name}`);
				await getDirectoryFileMeta(handle, files);

				directory = handle.name;
			} else {
				console.log(`File: ${handle.name}`);
				const file = await handle.getFile();
				files.push(file);
			}
		}

		this.handleImport(files, directory);
	}

	async handleImport(files, directory) {
		if (files.length > 0) {

			console.log('FILE TYPE:', files[0].type);

			const images = [];
			const media = [];
			const other = [];

			for (const i of files) {

				const ext = fileX.getExtension(i.name);

				if (fileX.isImage(ext)) images.push(i);
				else if (fileX.isMedia(ext)) media.push(i);
				else other.push(i);
			}

			if (/*images.length > 0*/false) {
				await importImageFiles(images);
				//this.#content.addImageFromFile(images);
			}


			if (media.length > 0) {

				const e = this.showNotification(`### Importing ${media.length} files`, 'progress');
				let last;

				await app.importAudioFiles(media, (id, state, info) => {

					switch (state) {

						case 'begin': 
						last = dom.renderTemplate('popup-file-item', info);
						e.appendChild(last);
						break;

						case 'end':
						last.setAttribute('state', 'done');
						break;

						case 'meta':
						// todo
						break;

						case 'done':
						dom.removeElement(e);
						break;
					}


				});
			}

			// for (const file of files) {

			// 	// const res = await app.contacts.get('file', 2049090216);
			// 	// console.log(res);

			// 	console.log('File droped:', file);

			// 	await this.currentPage.onFileDrop(file);
			// }

			const filtered = filterDraggedFiles(files, this.dragOptions);
			if (filtered.length > 0)
				await this.currentPage.onFileDrop(filtered, null, directory);

			console.log('EDITOR: emitting files drop event');
			app.emit('filesdropped', files);
		}
		else {

			const type = dt.getData('type');

			const ed = this.currentPage;
			const opt = ed.dragOptions;

			if (opt.items && !opt.items.includes(type))
				return;

			let data = dt.getData('data');
			if (!data) {
				const id = dt.getData('id');
				if (!id) {
					console.error('No data assigned');
					return;
				}

				const ds = app.ds(type);
				if (!ds) {
					console.error('DataSource not exists:', type);
					return;
				}

				data = await ds.get(id);
			}
			else {
				data = JSON.parse(dt.getData('data'));
			}

			this.currentPage.onDrop(data, type);

		}
	}

	#onClick(e, pos) {

		if (this.#autocomplete) {

			if (e == this.#autocomplete) return;

			const current = this.#autocomplete;

			this.#autocomplete = null;

			if (e.classList.contains('autocomplete-item')) {

				const i = e.querySelector('input');
				const v = i.value;
				const id = i.dataset.id;

				const list = e.parentElement;

				const input = list.previousElementSibling;
				input.value = v;
				input.dataset.id = id;

				dom.removeElement(list);
				
				let ed = this.currentEditor;
				if (ed)
					ed.onInput(current);

				return;
			}


			const list = current.nextElementSibling;
			if (list)
				dom.removeElement(list);
		}

		if (e.hasAttribute('contenteditable'))
			return;

		if (UX.List.handleClick(e))	return;

		switch (e.tagName) {

			case 'A':
			this.#handleClickLink(e, pos);
			break;

			case 'BUTTON': 
			this.#handleClickButton(e);
			break;

			case 'I': {

				if (e.hasAttribute('tooltip')) {
					const button = e.closest('button');
					const value = e.getAttribute('value');

					button.value = value;

					let item = button.closest('[container]') || button.parentElement;

					if (button.name == 'like') {
						button.disabled = true;

						const container = e.parentElement;
						dom.removeElement(container);
					}

					this.onAction(button.name, item, button);

					break;
				}
			}

			default:
			this.onClick(e, pos);
			break;
		}
	}

	#handleClickButton(e) {
		let state = e.getAttribute('state');
		if (state) {

			const old = state;


			switch (state) {
				case 'on': 
				state = 'off';
				break;

				case 'off':
				state = 'on';
				break;
			}

			e.setAttribute('state', state);

			const title = e.title;
			if (title) {
				let i = title.lastIndexOf(state);

				if (i != -1) {
					e.title = title.slice(0, i) + old;
				}
			}
		}

		switch (e.name) {

			case 'like': {
				const tooltip = e.querySelector('.reaction');
				if (tooltip) dom.removeElement(tooltip);

				e.disabled = true;
			}
			break;

			case 'search': {
				const container = e.closest('.search-area');
				if (container) {
					if (doSearch(container))
						return;
				}
			}
			break;

			case 'clear': {
				const container = e.closest('.search-area');
				if (container) {
					clearSearch(container);

					let ed = this.currentEditor;
					if (ed) ed.onFilter('', e);

					return;
				}
			}
			break;
			
			// case 'additem': {
			// 	const root = e.closest('[role="complex"]');
			// 	if (root) {

			// 		const template = root.getAttribute('item');
			// 		const container = root.lastElementChild;

			// 		const index = container.childNodes.length;
			// 		const name = root.dataset.name || root.getAttribute('name');

			// 		const e = dom.renderTemplate(template, );


			// 	}
			// }
			// break;
		}

		// let item = e.closest('[container]') || e.parentElement;
		let item = e.closest('[data-id]') || e.parentElement;

		switch (e.name) {
			case 'accept': {
				const p = e.nextElementSibling;
				e.disabled = true;
				p.disabled = true;
			}
			break;

			case 'reject': {
				const p = e.previousElementSibling;
				e.disabled = true;
				p.disabled = true;
			}
			break;
		}

		this.onAction(e.name, item, e);
	}

	#handleClickLink(e, pos) {
		if (e.classList.contains('yt')) {
			app.player.playYoutube(e);
			return;
		}

		const name = e.getAttribute('name');
		if (['next', 'prev'].includes(name)) {

			const slideshow = e.closest('.slideshow-container');
			if (slideshow) {

				const imgs = slideshow.querySelectorAll('img');
				for (let i = 0; i < imgs.length; ++i) {
					const e  = imgs[i];

					if (dom.isHidden(e)) continue;

					if (name == 'prev') {
						if (--i < 0) i = imgs.length - 1;
					}
					else {
						++i;
					}

					i = i % imgs.length;

					const num = slideshow.querySelector('.number');
					num.innerText = `${i + 1} / ${imgs.length}`;

					dom.hideElement(e);
					dom.showElement(imgs[i]);

					break;
				}

				return;
			}
		}
		else if (['more', 'less'].includes(name)) {

			const area = e.closest('.search-area');
			if (area) {

				const results = area.querySelector('.results');
				const container = results.firstElementChild;

				let c = 0;
				const elements = container.querySelectorAll('.item.hidden');
				const items = Array.from(elements).slice(0, 10);

				for (const i of items) dom.showElement(i);

				if (items.length < 10)
					dom.hideElement(e);

				return;
			}

		}

		let ed = this.currentEditor;
		if (!ed) return;

		// const sidebar = ed.sidebar;
		// if (sidebar && sidebar.container.contains(e))
		// 	ed = sidebar;

		const link = e.getAttribute('link');
		if (link && link.startsWith('#')) {
			const path = link.slice(1);
			const id = (path.startsWith('/') ? path.slice(1) : path)
				.replaceAll('/', '-');

			app.executeCommand('open-page-wiki', id);
			// ed.onLinkClick(link.slice(1));
		}
		else
			this.onClick(e, pos);
		// else {
		// 	const action = e.getAttribute('name');
		// 	this.onEditorAction(action, null, e);
		// }
	}

	#onCommand(cmd, item, target, ...params) {

		if (this.handleCommand(cmd, item, target)) 
			return true;

		const [action, ...rest] = cmd.split('-');

		params.unshift(...rest);

		if (target) {

			switch (target.name) {
				case 'play': {
					const state = target.getAttribute('state');
					const newst = state == 'play' ? 'pause' : 'play';

					target.setAttribute('state', newst);
					target.title = newst.capitalizeFirstLetter();

					params.push(state);
				}
				break;

				
			}
		}

		switch (action) {

			case 'copy': {

				const type = params.shift();

				switch (type) {
					case 'code': {
						const e = target.previousElementSibling;
						if (e) {
							const v = e.innerText;
							console.debug('Copied to clipboard:', v);
							navigator.clipboard.writeText(v);
							this.notify('Copied to cliboard');
						}
					}
					break;

					default:
					console.error('Copy not implemented:', type);
					break;
				}

			}
			break;

			case 'find':
			app.find(...params);
			return true;

			case 'share': {

				const type = params.shift();
				let channel;

				switch (type) {

					case 'channel':
					if (!item && this.#current.type == 'channel') {
						const id = this.#current.id;

						app.share('channel', id);
						return true;
					}
					break;

					case 'post':
					case 'article': {

						switch (this.#current.type) {

							case 'channel':
							channel = this.#current.current;
							break;

							default: {
								const e = item.closest('[data-channel]');
								if (e) {
									channel = e.dataset.channel;
								}
							}
							break;
						}

					}
					break;

				}

				const id = item.dataset.id;

				let p;
				if (channel)
					p = { channel };

				app.share(type, id, p);
			}
			return true;

			case 'follow':
			if (!item && this.#current.type == 'channel') {

				let follow = this.#current.follow;
				
				const id = this.#current.id;
				const type = this.#current.type;

				if (follow) {
					console.log('Unsibscribing from channel:', id);
					follow = false;
				}
				else {
					console.log('Sibscribing from channel:', id);
					follow = true;

				}

				// this.#info.follow = follow;

				target.value = follow;
				target.title = follow ? 'Unfollow' : 'Follow';

				app.executeCommand('follow', 'channel', type, id);

				return true;
			}
			break;

			// case 'comment': {
			// 	const type = params.shift();
			// 	const id = item.dataset.id;
			// 	const channel = item.dataset.channel;
				
			// 	// app.executeCommand('comment', 'add', type, id, channel);

			// }
			// break;

			case 'torrent': {

				const uri = item.dataset.id;
				const m = new TorrentMonitor(item);

				app.downloadTorrent(uri, m);
			}
			break;

			case 'load': {

				// currently only article
				const e = item;
				const link = e.dataset.link;
				const id = e.dataset.id;

				e.removeAttribute('cmd');

				const md = e.querySelector('.md');
				if (md) 
					loadArticle({ id, link}, md, true);

			}
			break;

			default: {

				switch (action) {
					case 'pin':
					dom.removeElement(target);
					break;
				}


				
			}
			// app.openEditor(action, ...params);
			break;

		}

		let id, e = item;

		if (item) {
			let e = item;
			id = e.dataset.id;

			if (!id) {
				e = target.closest('[data-id]');
				if (e) id = e.dataset.id;
			}
			
			let data;

			if (e)
				data = Object.assign({ target, item, parent: e }, e.dataset);

			app.executeCommand(action, ...params, id, data);

			if (target)
				this.#current.onAction(target.name || action, item, target);

			return true;
		}

		app.executeCommand(action, ...params);

		return false;
	}

	#setCurrent(p) {

		this.#current = p;

		const dragOpts = p.dragOptions;
		// console.log('EDITOR: open =>', p.id, 'drag=', !!dragOpts);

		dragOpts ? this.#registerListeners() : this.#unregisterListeners();

		if (this.#scrollable) {
			this.#scrollable.unregisterEvents();
			this.#scrollable = null;
		}

		if (this.#sidebar) {
			this.#sidebar.unregisterEvents();
			this.#sidebar = null;
		}

		const ed = p.editorElement;
		let scrollable = ed.querySelector('.scrollable');

		if (scrollable) {
			this.#scrollable = new UX.Scrollable(scrollable);

			this.#scrollable.registerEvents();
			this.#scrollable.onScrollY = (...args) => this.#current.onScrollY(...args);
			this.#scrollable.onHeightChange = (...args) => this.#current.onResize(...args);
		}

		const sb = p.sidebarElement;
		if (sb) {
			scrollable = sb.querySelector('.scrollable');

			this.#sidebar = new UX.Scrollable(scrollable);
			this.#sidebar.registerEvents();
		}

	}

	#registerListeners() {

		this.#container.addEventListener('dragenter', this, true);
		this.#container.addEventListener('dragleave', this, true);
		// container.addEventListener('dragend', this);
		this.#container.addEventListener('dragover', this, true);
		this.#container.addEventListener('drop', this, true);
	}

	#unregisterListeners() {
		this.#container.removeEventListener('dragenter', this);
		this.#container.removeEventListener('dragleave', this);
		// this.#container.removeEventListener('drop', this);
	}


	#addCommonEditors() {
		// this.addPage('loading', new PageBase('editor-loading'));
		// this.addPage('find', new FindEditorPage);

		this.addPage('add', new AddEditor);
		this.addPage('find', new FindEditor);
	}

	#createMutationObserver() {
		this.#mo = new MutationObserver(e => {

			let added = 0, removed = 0;
			for (const i of e) {
				added += i.addedNodes;
				removed += i.removedNodes;
			}

			console.debug('Editor node observer:', added, removed);
		});
	}

	#addObserver(page) {
		const editor = page.editorElement;
		if (editor) {
			console.debug('Editor adding MO for:', page.id);
			this.#mo.observe(editor, { childList: true });
		}
	}
}

function filterDraggedFiles(files, opt) {
	return opt ? Array.from(files)
		.filter(i => opt.files.includes(i.type ? fileX.getType(i.type) : fileX.getTypeFromFilename(i.name))) 
		: [];
		
}

async function importImageFiles(files) {

	console.log('Importing image files:', files.length);

	for (const file of files) {

		const id = file.name.hashCode();

		const i = await app.db.get('file', id);
		if (i) continue;

		const item = {
			id, type: 'image', file
		};

		await app.db.put('file', item);
	}
} 


async function getDirectoryFileMeta(handle, files) {

	const album = handle.name;

	for await (const entry of handle.values()) {
		//console.log(entry.kind, entry.name);
		if (entry.kind == 'file') {

			const [name, ext] = fileX.getFilename(entry.name);
			const meta = { album };

			if (fileX.isMedia(ext)) {

				const m = name.match(/^([0-9]{1,2})([ -.]+)?(.*)/);
				if (m) {
					meta.title = m[3];
					meta.track = parseInt(m[1]);
				}

			}
			// else if (!fileX.isImage(ext)) {
			// 	console.log('Skipping file:', name);
			// 	continue;
			// }

			const file = await entry.getFile();
			file.meta = meta;

			files.push(file);
		}
	}

	console.log('READING meta', files.map(i => i.meta));

}

async function doSearch(container) {
	const name = container.getAttribute('ds');
	const template = container.getAttribute('template');

	const area = container.querySelector('.input-area');
	const input = area.firstElementChild;
	const value = input.value;

	const search = area.lastElementChild;
	search.disabled = true;

	let e = container.querySelector('.results');
	if (e) dom.removeElement(e);

	const handled = false;

	if (app) {

		const ds = app.ds(name);

		if (ds) {
			container.classList.toggle('loading3');

			try {
				const data = await delayResolve(ds.search(value), 1200);
				e = dom.renderTemplate('search-area-results', data, 'div', template);

				// const footer = container.querySelector('footer');
				// dom.insertBefore(e, footer);

				container.appendChild(e);

				handled = true;
			}
			catch (e) {

			}

			container.classList.toggle('loading3');
		}

	}

	return handled;
}

function clearSearch(container) {
	const area = container.querySelector('.input-area');
	const input = area.firstElementChild;
	input.value = '';

	const search = area.lastElementChild;
	search.disabled = true;

	let e = container.querySelector('.results');
	if (e) dom.removeElement(e);
}

function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
		dom.removeElement(x[i]);
		// if (elmnt != x[i] && elmnt != inp) {
		// 	x[i].parentNode.removeChild(x[i]);
		// }
	}
}

function addActive(x) {
	/*a function to classify an item as "active":*/
	if (!x) return false;
	/*start by removing the "active" class on all items:*/
	removeActive(x);
	if (currentFocus >= x.length) currentFocus = 0;
	if (currentFocus < 0) currentFocus = (x.length - 1);
	/*add class "autocomplete-active":*/
	x[currentFocus].classList.add("autocomplete-active");
}

function removeActive(x) {
	/*a function to remove the "active" class from all autocomplete items:*/
	for (var i = 0; i < x.length; i++) {
		x[i].classList.remove("autocomplete-active");
	}
}

async function handleAutocomplete(e, ds) {

	if (!e._items)
		e._items = await ds.ls();

	renderAutocomplete(e, e._items);
}

async function handleAutocompleteTimeout(e, ds) {


	if (!e._timeout) {

		e._timeout = setTimeout(async () => {

			e.disabled = true;

			try {

				// const arr = ['Title', 'Gender', 'Date of birth', 'Fuel', 'Transmission'];
				const arr = await ds.ls();
		
				renderAutocomplete(e, arr);
			}
			catch (err) {
				console.error('Failed to load autocomplete items from ds:', ds.name);
			}
			finally {
		
				e.disabled = false;
			}


			delete e.dataset.id;
			delete e._timeout;
		}, 2000);

	}
}

async function handleAutocompleteEditor(e, ed, name) {

	const data = await ed.loadAutocomplete(name);

	if (!data) {
		ed.onInput(e);
		return;
	}

	renderAutocomplete(e, data);
}

function renderAutocomplete(e, arr) {
	var a, b, i, val = e.value;

	/*close any already open lists of autocompleted values*/
	if (!val || arr.length == 0) { return false;}
	// currentFocus = -1;
	/*create a DIV element that will contain the items (values):*/
	a = dom.createElement('div', 'autocomplete-items');
	a.setAttribute("id", e.name + "autocomplete-list");

	/*append the DIV element as a child of the autocomplete container:*/
	e.parentNode.appendChild(a);

	let name, id, avatar;
	/*for each item in the array...*/
	for (i = 0; i < arr.length; i++) {

		avatar = null;

		if (typeof arr[i] == 'string' ) {
			name = arr[i].capitalizeFirstLetter();
			id = arr[i];
		}
		else {
			name = arr[i].display || arr[i].name.capitalizeFirstLetter();
			id = arr[i].id || arr[i].name;
			avatar = arr[i].photo || arr[i].avatar;
		}

		/*check if the item starts with the same letters as the text field value:*/
		if (name.substr(0, val.length).toUpperCase() == val.toUpperCase()) {
			/*create a DIV element for each matching element:*/

			let html = '';

			if (avatar) 
				html += `<img src="${avatar}" class="photo x24 w3-margin-right">`;

			/*make the matching letters bold:*/
			html += `<strong>${name.substr(0, val.length)}</strong>`;
			html += name.substr(val.length);
			/*insert a input field that will hold the current array item's value:*/
			html += `<input type='hidden' value='${name}' data-id='${id}'>`;
			/*execute a function when someone clicks on the item value (DIV element):*/
			// 	b.addEventListener("click", function(e) {
			// 	/*insert the value for the autocomplete text field:*/
			// 	inp.value = this.getElementsByTagName("input")[0].value;
			// 	/*close the list of autocompleted values,
			// 	(or any other open lists of autocompleted values:*/
			// 	closeAllLists();
			// });
			b = dom.createElement('div', 'noevents', 'autocomplete-item', 'row', 'ci', 'w3-padding-small');
			b.innerHTML = html;

			a.appendChild(b);
		}
	}
}
