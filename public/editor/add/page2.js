
import { SettingsList } from '../settings/page.js';
import { Fields as CommonFields } from '../settings/fields.js';
import { Header } from '../common.js';

import CodeMirror from '../component.js';


const kStatusField = CommonFields.string({
	name: 'status'
	, title: 'Status'

});

const kPhotoField = {
	type: 'photo'
	, name: 'photo'
	, title: 'Avatar'
};

const kProfileFields = [ CommonFields.name, kStatusField, kPhotoField ];

class BasePage extends UX.Page {

	get area() { return this.container; }

	constructor(container, template) {

		const e = template 
			? dom.renderTemplate(template) 
			: dom.createElement('div', 'container-col', 'settings', 'fade', 'hidden');

		container.appendChild(e);
		super (e);
	}
}

Object.assign(BasePage.prototype, UX.ListMixin);

class SettingsPage extends BasePage {}

class CodePage extends BasePage {

	#cm;

	constructor(container) {
		super(container, 'editor-add-code');
	}

	async load() {
		const text = this.querySelector('textarea[name="code"]');
		this.#cm = await CodeMirror.bind(text, 'js', true);
	}

	set value(text) {
		this.#cm.setValue(text||'');
	}

	get value() {
		return this.#cm.getValue();
	}


	async onAction(action, data, target) {

		// const e = this.querySelector('input[name="path"]');

		// if (action == 'scrap') {
		// 	const a = target.previousElementSibling;

		// 	const origin = location.origin;

		// 	let link = a.href;
		// 	if (link.startsWith(origin))
		// 		link = link.slice(origin.length);

		// 	e.value = link;
		// 	return;
		// }

		
	}
}

class TestPage extends BasePage {

	#results;

	constructor(container, type='scraper') {
		super(container, 'editor-add-test');

		const e = this.querySelector('.results');
		this.#results = UX.List.createMixin(e);
	}

	async onAction(action, data, target) {

		this.#results.clear();

		if (!data.domain) {
			console.error('Test request without domain!');
			return;
		}

		console.debug('Sending SCRAPER test request for domain:', data.domain, data.location || '/');

		if (!data.code) {
			console.error('Test request without code!');
			return;
		}

		console.debug(data.code);

		try {

			//let template = data.type == 'weather' ? 'editor-add-weather-result' : 'editor-add-scrap-result';
			let template = 'channel-feed';

			let res = await ajax.post('/api/scrap/test', data);

			if (!Array.isArray(res)) {
				
				if (typeof res == 'object')
					res = res.data;
			}

			console.debug('GOT result:', res.length);

			if (Array.isArray(res)) {
				for (const i of res) 
					this.#results.addItemTemplate(template, i);
			}
			else if (typeof res == 'string') {

				// markdown
				result.innerHTML = dom.markdown(res);
			}


		}
		catch (e) {
			console.error('Test request failed:', e);
		}
	}
}

export class AddEditor extends UX.ListPage {

	static kOptions = {};
	static register(id, opt, onAdd) { 
		if (onAdd) opt.onAdd = onAdd;
		AddEditor.kOptions[id] = opt; 
	}

	static kPreview = {};
	static preview(id, Instance) { AddEditor.kPreview[id] = Instance; }

	#settings;
	#tabs;
	#code = {};
	#editor;
	#preview;
	#test;
	#onadd;
	#onpreview;

	get id() { return 'add'; }
	get storageId() { return this.id + '-' + this.type; }

	get dragOptions() { 
		return {
			directory: false
			, hover: false
			, files: ['image']
		}
	}

	get excludeFromStack() { return true; }

	constructor(id='add-editor') {
		super(id);

		this.pages = new Map;

		const header = this.headerElement;

		let add = header.querySelector('button[name="submit"]');

		const editor = this.editorElement;
		this.#tabs = editor.querySelector('.tabbar');

		const main = new SettingsPage(this.area);
		this.addPage('main', main);

		const settings = new SettingsList(main);
		settings.onvalidchange = (valid) => add.disabled = !valid;

		this.#settings = settings;
	}

	// get inputSelector() { return "input[required]:not(:disabled):not([readonly]):not([type=hidden]),select[required]:not(:disabled):not([readonly]),textarea[required]:not(:disabled):not([readonly])"; }
	get inputSelector() { return 'input:not([type=radio]),select,textarea,input[type=radio]:checked'; }
	// get fields() { 
	// 	const r = {};

	// 	const fields = this.content.querySelectorAll(this.inputSelector);

	// 	for (const i of fields)
	// 		r[i.name] = getValue(i);

	// 	return r;
	// }

	onFileDrop(files) {
		this.#settings.onFileDrop(files);
	}

	onAction(action) {

		switch (action) {

			case 'submit':
			this.onAddClicked(this.#settings.getData())
			break;

			case 'cancel':
			app.cancelEditor();	
			break;
		}

	}

	onEditorAction(action, e, target) {

		switch (this.current) {

			case 'code': {
				const data = this.#settings.getData();
				this.#editor.onAction(action, data, target);
			}
			break;

			case 'test': {
				const data = this.#settings.getData();
				data.code = this.#editor ? this.#editor.value : '';
				this.#test.onAction(action, data, target);
			}
			break;

		}

	}

	// onElementClick() {

	// 	switch (this.current) {
	// 		case 'preview':
	// 		this.#preview.onclick();
	// 		break;
	// 	}
	// }

	open(action, type, params) {

		if (!params.reload && this.type == type) return;

		if (!params.items) {
			const opt = AddEditor.kOptions[type];

			if (Array.isArray(opt))
				params.items = opt;
			else
				Object.assign(params, opt);
		}

		console.log('ADD editor open', action, type);

		this.type = type;

		const { icon, desc, items, onAdd, info, onPreview } = params;

		let title = `${action.capitalizeFirstLetter()} ${type.toLowerCase()}`;
		if (action == 'edit')
			title += ` '${info.name}'`;

		const h = new Header(this.headerElement);

		h.icon = icon;
		h.title = title;
		h.desc = desc||'no description';

		let data = info;

		if (!info) {
			const id = this.storageId;
			data = localStorage.getItem(id) || undefined;
			if (data)
				data = JSON.parse(data);
		}

		this.#settings.load(items, data);
		this.#onadd = items.onAdd || onAdd;
		this.#onpreview = onPreview || function() {}

		const edits = items.filter(i => i.type == 'edit');
		const others = items.filter(i => ['test', 'preview'].includes(i.type));

		if (edits.length == 0)
			dom.hideElement(this.#tabs);
		else {
			dom.showElement(this.#tabs);

			this.#code = {};

			let e = this.#tabs.firstElementChild.nextElementSibling;
			while (e) {
				const p = e;
				e = e.nextElementSibling;

				dom.removeElement(p);
			}

			for (const i of edits) {

				this.#addTab(i.name);

				if (info)
				 	this.#code[i.name] = info[i.name] || '';
				else
					this.#code[i.name] = i.val || '';
			}

			for (const i of others)
				this.#addTab(i.name);
		}

		this.#tabs.firstElementChild.classList.add('active');
		this.switchTo('main');
	}


	async onTabChange(tab, current) {

		console.debug('On TAB change', tab);

		if (!['main', 'preview', 'test'].includes(current)) {
			const value = this.#editor ? this.#editor.value : '// add code here\n';
			//console.debug('Editor value:', value);
			this.#code[current] = value;
		}

		let maxHeight = false;

		if (tab == 'preview') {

			maxHeight = true;

			if (!this.#preview) {

				const PreviewPage = AddEditor.kPreview[this.type];

				const p = new PreviewPage(this.area);

				p.updateSize(this.height);

				this.addPage('preview', p);
				this.#preview = p;
			}

			// todo: improve that
			const code = Object.values(this.#code)[0];

			this.#preview.loadFromCode(code);

			//const previewer = this.#onpreview(code);
			//this.#preview.previewer = previewer;
		}
		else if (tab != 'main') {
			// this.area.classList.add('max-height');

			if (tab == 'test') {
				if (!this.#test) {
					
					const p = new TestPage(this.area);
					this.addPage('test', p);

					this.#test = p;
				}
			}

			else {

				maxHeight = true;

				if (!this.#editor) {

					const p = new CodePage(this.area);
					this.#editor = p;

					await p.load();

					this.addPage('code', p);
				}

				this.#editor.current = tab;
				this.#editor.value = this.#code[tab];

				tab = 'code';
			}
		}

		if (maxHeight)
			this.area.classList.add('max-height');
		else
			this.area.classList.remove('max-height');

		this.switchTo(tab);
	}

	onAddClicked(data) {
		console.log('ADD CLICK', data);

		if (data.name)
			data.name = data.name.trim().replace(/\s+/g, ' ');

		const id = this.storageId;
		localStorage.setItem(id, JSON.stringify(data));

		if (this.#onadd) {

			if (this.current != 'main') {
				this.#code[this.#editor.current] = this.#editor.value;
			}

			// Object.assign(data, { code: this.#code });
			Object.assign(data, this.#code);
			console.debug('ON Add:', data);

			this.#onadd(data);
		}

		// app.editor.cancel(this.id);
	}


	#addTab(name) {
		const e = dom.createElement('span', 'tab');
		e.innerText = name;
		e.setAttribute('tab', name);

		this.#tabs.appendChild(e);
	}
}

Object.assign(AddEditor.prototype, UX.PageControllerMixin);

window.AddEditor = AddEditor;

