const kHiddenStyle = 'hidden';

class PageBase {
	constructor (parent) {
		let container = typeof parent == 'string' ? document.getElementById(parent) : parent;
		if (container.tagName == 'TEMPLATE') container = dom.renderTemplate(container.id);
		this.container = container;
	}

	set id(id) { this.container.dataset.id = id; }
	get id() { return this.container.dataset.id || this.container.id; }

	get headerElement() { return this.container.querySelector(':scope > .header'); }
	get editorElement() { return this.container.querySelector('.editor'); }

	get active() { return !this.container.classList.contains(kHiddenStyle); }
	get viewport() { return this.container.getBoundingClientRect(); }

	set mode(mode) {
		if (mode) this.container.setAttribute('mode', mode);
		else this.container.removeAttribute('mode');
	}

	/*
		Page header elements
	*/
	onAction() {}

	/*
		On commond executed from editor
	*/
	onCommand() {}

	onEditorAction() {}
	onInput() {}
	onChange() {}
	onFilter() {}
	onKeyPress() {}
	onClick() {}
	onLinkClick() {}
	onElementClick() {}
	onResize() {}

	loadAutocomplete() {}

	static createHeader(container) { 
		const e = dom.createElement('div', 'header');
		container.appendChild(e);
		return e;
	}

	static createEditor(container) { 
		const e = dom.createElement('div', 'editor');
		container.appendChild(e);
		return e;
	}
}

const PageMixin = {
	hide() {
		//console.log('Hiding page', this.container);
		this.container.classList.add(kHiddenStyle);
	}

	, show() {
		this.container.classList.remove(kHiddenStyle);
	}

	, getElementByClass(classname) {
		return this.container.querySelector(`:scope > .${classname}`);
	}

	, getButton(name) {
		return this.container.querySelector(`button[name="${name}"]`);
	}

	, showLoading() {
		const e = dom.createElement('div', 'loader');
		this.container.appendChild(e);
		return e;
	}

	, query(q) {
		return this.container.querySelector(q);
	}

	, appendChild(e, top=false) {
		if (top && this.container.firstElementChild) {
			dom.insertBefore(e, this.container.firstElementChild);
		}
		else {
			this.container.appendChild(e);
		}
	}

	, removeChilds() {
		dom.removeChilds(this.container);
	}

	, clearContent() {
		this.container.innerHTML = '';
	}

	, removeSelf() {
		dom.removeElement(this.container);
	}

	, updateTimes(now=Date.now()) {
		dom.updateElapsed(this.container, now);
	}

	, addStyle(...s) {
		this.container.classList.add(...s);
	}

	, toggleLoading() {
		return this.container.classList.toggle('loading3');
	}

	, addTemplate(id, data, tag='div', ...styles) {
		const e = dom.renderTemplate(id, data, tag, ...styles);
		this.container.appendChild(e);
		return e;
	}

	, queryElement(query) {
		return this.container.querySelector(query);
	}

	, querySelector(query) {
		return this.container.querySelector(query);
	}

	, querySelectorAll(query) {
		return this.container.querySelectorAll(query);
	}

	

};

Object.assign(PageBase.prototype, PageMixin);

class Page extends PageBase {

	get sashElement() { return this.container.querySelector('div.v-sash'); }
	get sidebarElement() { return this.container.querySelector('div.sidebar'); }

	get meta() { return {}; }

	static createMixin(container) {

		return {
			container
			, ...PageMixin
		}
	}
}
	

class PageController /*extends EventTarget*/ {

	constructor() {
		//super();

		this.pages = new Map;
		this.current = null;
	}

	get currentPage() {
		return this.pages.get(this.current);
	}
}

const PageControllerMixin = { 
	

	addPage(name, page) {

		//console.log('Adding page:', name);

		let p = page;

		if (typeof page == 'string') {

			//console.log('Adding page id', page);

			const e = document.getElementById(page);
			p = new Page(e);

			p.hide();
			this.pages.set(name, p);

			return;
		}

		page.hide();
		this.pages.set(name, page);

		return p;
	}

	, switchTo(name) {

		if (this.current == name) return this.pages.get(name);

		if (this.current) {
			const p = this.pages.get(this.current);

			//console.log('Hidding page:', this.current);
			p.hide();
		}

		const p = this.pages.get(name);
		if (p) {
			p.show();
			this.current = name;
		}

		return p;
	}

	, getPage(id) {
		return this.pages.get(id);
	}

	, getCurrentPage() {
		return this.pages.get(this.current);
	}

	, remove(editor) {
		let id;

		if (typeof editor == 'string') {
			id = editor;
			editor = this.pages.get(id);
		}
		else {
			id = editor.id;
		}

		const container = editor.container;
		dom.removeElement(container);

		this.pages.delete(id);
	}

}

Object.assign(PageController.prototype, PageControllerMixin);

export {
	Page,
	PageBase,
	PageMixin,
	PageController
	, PageControllerMixin
}