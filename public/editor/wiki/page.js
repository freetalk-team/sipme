
import { Header } from '../common.js';

import { Fields as CommonFields } from '../../editor/settings/fields.js';
import { Sidebar } from '../sidebar.js';


const kIcon = 'fa-search'
	, kDescription = 'Search the database for examples and tips'
	, kTitle = 'Wiki'
	;

const kNewArticle = [
	CommonFields.string({ name: 'title', validate(v) { return v.length > 3; } })
	, CommonFields.string({ name: 'tags', validate(v) { return /[a-z][a-z0-9]{2,}/.test(v); } })
	// , CommonFields.content({ name: 'content' })
	, {
		type: 'md-code'
		, title: 'Content'
		, name: 'content'
	}
];

const kHeader = ['editor-header-grid', 'editor-wiki-toolbar'];
const kEditor = ['editor-scrollable', 'wiki-editor-content'];
const kSidebar = [{ name: 'pin', icon: 'pin watermark-6' }];

export class WikiEditor extends UX.ListPage {

	#main;
	#sidebar;
	#current;
	#id;
	#mde;
	#path = [];

	static id = 'wiki';

	get sidebar() { return this.#sidebar; }

	constructor() {

		//const editor = document.getElementById('editor');

		const container = dom.renderTemplate('editor-base-sidebar', {}, 'div', kHeader, kEditor, kSidebar);
		container.id = 'wiki-editor';

		//editor.appendChild(container);

		super(container);

		this.mode = 'view';

		const header = new Header(this.headerElement);

		header.title = kTitle;
		header.desc = kDescription;
		header.icon = kIcon;

		const editor = this.editorElement;

		const main = editor.querySelector('.main');
		this.#main = UX.List.createMixin(main);

		const sidebar = this.sidebarElement;
		this.#sidebar = new Sidebar(sidebar);
		this.#sidebar.toggle();

		const element = editor.querySelector('textarea');
		this.#mde = new MDE({ element, spellChecker: false, autoDownloadFontAwesome: false });

		// this.#main.area.onclick = (event) => {

		// 	const e = event.target;

		// 	switch (e.tagName) {

		// 		case 'A':
		// 		this.#loadResult(e.parentElement);
		// 		break;


		// 	}

		// }
	}

	async open(action, id) {

		if (id && this.#id == id) {
			return;
		}

		if (action == 'start') {
			action = 'page';
			this.#path = [];
		}

		this.#current = action;
		this.#id = id;

		this.container.dataset.id = id;

		console.log('Wiki editor open:', action);

		let search = false;

		switch (action) {

			case 'search':
			this.mode = 'search';
			break;

			default:
			this.mode = 'view';
			await this.#loadDocument(id);
			break;
			
		}

		//this.removeContent();

		// if (typeof params == 'object') {
		// 	this.#addResult(params);
		// }

	}

	onAction(action) {
		
		switch (action) {
			case 'edit':
			this.#edit(this.#id, false);
			break;
		}
	}

	async onEditorAction(action, container, target) {

		console.log('Wiki editor on action', action);

		if (target.tagName == 'A') {

			const link = target.getAttribute('link');
			if (link)
				this.#handleAction(link);

			return;
		}

		// const e = container.closest('[data-id]');
		const e = container;
		const id = e.dataset.id;

		switch (action) {

			case 'submit': {

				// const textarea = this.#mde.toTextArea();
				const text = this.#mde.value();
				
				this.mode = 'view';
				this.#updateDocument(id, text);
			}
			break;

			case 'cancel':
			// this.#mde.toTextArea(); // free CodeMirror
			this.mode = 'view';
			break;

			case 'edit':
			this.#edit(id, false);
			break;
		}
	}

	// onElementClick(e) {}

	onLinkClick(path) {

		if (path.startsWith('/')) {
			this.#loadDocument(path);
		}
		else {
			const id = `#${this.#current}_${path}`;
			const e = this.#main.querySelector(id);

			if (e) {
				app.editor.scrollTo(e);
			}
		}

	}

	

	async #updateDocument(id, text) {

		const content = text.trim();

		console.log('Updating document', id, content);

		this.#main.toggleLoading();
		this.#main.removeContent();

		const ds = app.ds('wiki');

		try {

			const data = {
				id, 
				content,
				tags: 'wiki'
			};

			await delayResolve(ds.put(data), 1200);

			// todo add into cache

			// todo: add to sessionStorage directly
			//localStorage.setItem(id, content);

			this.#renderDocument(id, content);
		}
		catch (e) {
			console.error('Failed to update document', id);
		}

		this.#main.toggleLoading();
	}

	async #edit(id, isnew=false) {

		this.mode = 'edit';

		let text = '';

		if (!isnew) {
			// this.toggleLoading();
			// const doc = await delayResolve(loadDocument(id), 1200);
			// this.toggleLoading();

			const doc = await loadDocument(id);
			if (doc) text = doc;
		}

		const edit = this.editorElement.querySelector('[role="edit"]');
		edit.dataset.id = id;

		// if (/*!this.#mde*/true) {
		// 	const element = edit.querySelector('textarea');
		// 	// element.value = text;
		// 	this.#mde = new MDE({ element, spellChecker: false, autoDownloadFontAwesome: false });
		// }

		this.#mde.value(text);
	}

	async #handleAction(link) {

		console.debug('WIKI handle link click');

		if (link.startsWith('#')) {

			const id = `#${this.#current}_${link.substr(1)}`;
			const e = this.#main.querySelector(id);

			if (e) {
				this.scrollTo(e);
			}

		}
		else {
			this.#loadDocument(link);
		}
		
	}

	async #loadDocument(id) {

		if (id.startsWith('/')) {
			const path = id.slice(1).split('/');
			id = path.join('-');
		}

		this.#main.toggleLoading();
		const doc = await delayResolve(loadDocument(id), 1200);
		this.#main.toggleLoading();

		if (doc) {

			const i = this.#path.indexOf(id);
			if (i < 0)
				this.#path.push(id);
			else
				this.#path.splice(i + 1, this.#path.length - (i + 1));

			this.#id = id;
			this.container.dataset.id = id;

			this.#renderDocument(id, doc);
		}

		else if (app.sudo) {

			console.log('Switching to edit mode');
			return this.#edit(id, true);
		}

	}

	#renderDocument(id, text, force=true) {

		if (force || id != this.#id) {
			
			this.#main.removeContent();
			this.posY = 0;

			this.#main.appendTemplate('editor-wiki-doc-content', { id, text, marked: markedOpt(id) }, 'div');

			this.#renderPath();

			
		}
	}

	#renderPath() {
		const path = this.#main.querySelector('.path');

		console.debug('WIKI updating path:', this.#path);

		dom.removeChilds(path);

		for (const i of this.#path.slice(0, -1)) {

			const p = i.split('-');
			const link = `#/${p.join('/')}`;

			const e = dom.createElement('a', 'smaller');
			e.setAttribute('link', link);
			e.innerText = p.join(' ');

			path.appendChild(e);
		}
	}
}

function loadDocument(id) {
	return app.cache.load('wiki', id);
}

function markedOpt(id) {
	return { headerIds: true, headerPrefix: id + '_' };
}

/*

<input class="gLFyf gsfi" jsaction="paste:puy29d; mouseenter:MJEKMe; mouseleave:iFHZnf;" maxlength="2048" name="q" type="text" aria-autocomplete="both" aria-haspopup="false" autocapitalize="none" autocomplete="off" autocorrect="off" role="combobox" spellcheck="false" value="sequelize-cli import models" aria-label="Search" data-ved="0ahUKEwj01NbKsrr4AhWfSvEDHfzbCUUQ39UDCAs">

*/
