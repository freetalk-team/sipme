import { PageMixin } from './page.js';
import { Scrollable, ScrollableMixin } from './scrollable2.js';

const ListMixin = Object.assign({
	addItem(item, top=false) {
		const i = item.create();
		item.render(i);

		this.append(i);

		if (top) {
			this.area.insertBefore(i, this.area.firstElementChild);
		}

		return i;
	}

	, addItemTemplate(templateId, data, top=false, ...styles) {
		const tag = this.elementTag || 'div';

		let templates = [];
		if (styles.length > 0 && Array.isArray(styles[0]))
			templates = styles.shift();

		const i = dom.renderTemplate(templateId, data, tag, ...templates);
		i.classList.add('item');

		if (!i.dataset.id && data.id) 
			i.dataset.id = data.id;

		if (styles.length > 0)
			i.classList.add(...styles);

		this.append(i);

		if (top) {

			let before = this.area.firstElementChild;

			switch (tag) {
				case 'li':
				if (before && before.tagName == 'LH') 
					before = before.nextElementSibling;

				break;
			}

			this.area.insertBefore(i, before);
		}

		return i;
	}

	, addGroup(opt={}, top=false) {
		return List.createGroup(this.area, opt, top);
	}

	, addContent(opt={}) {
		const o = Object.assign({
			template: 'list-group-content',
			item: 'list-base-item',
			hide: false,
			empty: false,
			draggable: false,
			visible: -1 >>> 0
		}, opt);

		const e = dom.renderTemplate(o.template, o);

		if (o.name)
			e.setAttribute('name', o.name);

		if (o.id)
			e.dataset.id = o.id;

		if (top) {
			this.area.insertBefore(e, this.area.firstElementChild);
		}
		else {
			this.area.appendChild(e);
		}

		return createGroup(e, o);
	}

	, wrapGroup(group, template) {
		const e = typeof group == 'string' 
			? this.area.querySelector(`[group="${group}"]`)
			: group;

		return List.wrapGroup(e, template);
	}

	// , attachGroup(g, template) {

	// 	return 

	// }

	, open(id) {

		if (!id) return;

		const e = this.getElement(id);
		if (e && !e.hasAttribute('selected')) {
			this.clearSelection();
			e.setAttribute('selected', '');
		}
	}
	
	, clearSelection() { List.clearSelection(this.area); }
	, getSelected() { return this.querySelector('.item[selected]'); }

	, selectItem(id) {
		const current = this.getSelected();
		if (current) {
			if (current.dataset.id == id) return;

			current.removeAttribute('selected');
		}

		const e = this.getElement(id);
		if (e) e.setAttribute('selected', '');

		return e;
	}

	, delete(id) {
		const e = this.getElement(id);
		if (e) e.parentElement.removeChild(e);
		return e;
	}
	, getElement(id) { return this.area.querySelector(`.item[data-id="${id}"]`); }
	, getElements(id) { 
		const query = id ? `.item[data-id="${id}"]` : '.item[data-id]';
		return Array.from(this.querySelectorAll(query)); 
	}

	, getLastElement() { return this.area.lastElementChild; }
	, getElementBy(tag, value) { return this.area.querySelector(`.item[data-${tag}="${value}"]`); }
	, getElementsBy(tag, value) { return this.area.querySelectorAll(`.item[data-${tag}="${value}"]`); }
	, getElementByClass(classname) { return this.area.querySelector(`.item.${classname}`); }
	, getElementIds() { return this.getElements().map(e => e.dataset.id); }

	, getItem(id) { return this.area.querySelector(`:scope > .item[data-id="${id}"]`); }
	, getItems(tag, value, query=':scope > .item') {

		if (tag) 
			query += value ? `[data-${tag}="${value}"]` : `[data-${tag}]`;

		return this.area.querySelectorAll(query);
	}

	, queryItems(selector) {
		const query = `:scope > .item ${selector}`;
		return this.area.querySelectorAll(query);
	}

	, registerClickHandlers() {
		this.area.onclick = e => {
			const target = e.target;

			if (List.handleClick(target, this))
				return;

			switch (target.tagName) {
				case 'BUTTON': {

					let e = target.closest('.item[data-id]');
					let id;

					if (e) {
						id = e.dataset.id;
					}
					else {

						let g, p = target.closest('.group');

						if (p) {
							g = p.querySelector('[group]');
						}
						else {
							g = target.closest('[group]');
						}

						if (g) {
							id = g.getAttribute('group');
						}
						
					}

					this.onAction(target.name, id, target);
				}
				break;
			}
		}
	}

	, filter(value, query='.item') {

		if (!value || value == '') {
			const items = this.querySelectorAll('.item[data-name].filter');
			for (const i of items)
				i.classList.remove('filter');

			return;
		}

		const re = new RegExp(value, 'i');
		const items = this.getItems('name', null, query);

		for (const i of items) {

			const name = i.dataset.name;

			if (re.test(name))
				i.classList.remove('filter');
			else
				i.classList.add('filter');
		}
	}

	, filterDelay(text, target, selectors=['.name']) {

		const showAll = () => {
			const items = this.getItems();
			for (const i of items)	
				dom.showElement(i);
		}

		console.debug('Filter:', text);

		this._filter = text.toLowerCase();

		if (text.length < 3) {
			showAll();
			return;
		}


		if (this._filterTimeout) 
			clearTimeout(this._filterTimeout);

		this._filterTimeout = setTimeout(async () => {

			if (this._filter.length < 3) {
				showAll();
			}
			else {

				this.toggleLoading();
				target.disabled = true;
				await sleep(800);
				target.disabled = false;
				target.focus();
				this.toggleLoading();

				const items = this.getItems();
				for (const i of items) {

					let found = false;

					for (const selector of selectors) {

						const t = i.querySelector(selector).innerText;
						if (t.toLowerCase().search(this._filter) != -1) {
							found = true;
							break;
						}
					}

					if (found) dom.showElement(i);
					else dom.hideElement(i);
				}
			}

			delete this._filter;
			delete this._filterTimeout;

		}, 1000);
	}


	, sort(callback) {

		const items = this.getItems();
		const sorted = [].slice.call(items).sort(callback);

		for (const i of sorted)
			this.area.appendChild(i);
	}

	, clear() {
		const items = this.getElements();
		for (const i of items) 
			dom.removeElement(i);
	}

	, toggleLoading() {
		return dom.toggleLoading(this.area);
	}

	, async loadGroups() {

		const groups = this.area.querySelectorAll('[group][ds]');

		let ds, g, m, more, group;

		for (const e of groups) {

			await List.loadGroup(e);
		}

	}

	

}, ScrollableMixin);

class List extends Scrollable {

	set hover(b) {
		if (b) this.containerElement.removeAttribute('nohover');
		else this.containerElement.setAttribute('nohover', '');
	}

	scrollToItem(id) {
		// console.log('ScrollTo:', id);

		const e = this.getElement(id)
		if (!e) return;

		this.scrollTo(e);

		dom.highlightElement(e);
	}

	static create(container) {
		const list = List.createElement(container);
		return new List(list);
	}

	static createElement(container) {
		const list = Scrollable.createElement(container);

		list.classList.add('list2');
		list.tabIndex = 0;

		return list;
	}

	static createItemElement(item) {
		const i = document.createElement('div');
		i.classList.add('item', ...item.template.split(' '));

		if (item.id) i.dataset.id = item.id;

		if (item.draggable) {
			i.draggable = true;
			i.addEventListener('dragstart', e => item.setDraggableData(e.dataTransfer));
		}

		//item.render(i);

		return i;
	}

	static clearSelection(e) {
		const selected = e.querySelectorAll('.item[selected]');
		for (const i of selected) i.removeAttribute('selected');

	}

	static createMixin(container, elementTag='div') {

		return {
			area: container,
			elementTag
			, ...ListMixin
		}
	}

	static createPageMixin(container, elementTag='div') {

		return {
			container,
			area: container,
			elementTag,
			...PageMixin,
			...ListMixin
		}

	}

	static createGroup(container, opt, top=false) {
		const o = Object.assign({
			template: 'list-group',
			item: 'list-base-item',
			badge: false,
			collapse: true,
			hide: false,
			empty: false,
			draggable: false,
			visible: -1 >>> 0
		}, opt);

		let e, content;

		if (o.template) {
			e = dom.renderTemplate(o.template, o);
			content = e.querySelector('.content');
		}
		else {
			e = dom.createElement('div', 'list');
			content = e;
		}

		if (o.classes) 
			e.classList.add(...(Array.isArray(o.classes) ? o.classes : o.classes.split(' ')));

		if (o.badge)
			e.classList.add('badge');

		if (o.name)
			e.setAttribute('name', o.name);

		if (o.id)
			e.dataset.id = o.id;

		if (top) {
			container.insertBefore(e, container.firstElementChild);
		}
		else {
			container.appendChild(e);
		}

		if (o.help) {
			const c = dom.renderTemplate(o.help);

			content.classList.add('help');
			content.appendChild(c);
		}

		return createGroup(content, o);
	}

	static wrapGroup(e, template) {

		const g = List.createMixin(e);
		const t = template || e.getAttribute('template') || 'list-base-item';
		const n = parseInt(e.getAttribute('visible') || 5);

		if (!e.dataset.count)
			e.dataset.count = n;

		g.add = function(info, top=false, ...params) {
			const item = this.addItemTemplate(t, info, top, ...params);
			const count = this.childCount();
			const visible = parseInt(e.dataset.count);

			if (count > visible) {

				if (top) {
					// todo
				}
				else {
					dom.hideElement(item);

					const g = e.closest('.group');
					if (g) {
						const more = g.querySelector('[name="_more"]');
						if (more) dom.showElement(more);

						// if (count > n) {
						// 	const less = g.querySelector('[name="_less"]');
						// 	if (less) dom.showElement(less);
						// }
					}
				}
			}
				

			// const n = parseInt(e.dataset.count);
			// e.dataset.count = n + 1;
			
			// todo: hide if needed
			return item;
		}

		g.get = function(id) {
			return this.getItem(id);
		}

		g.load = async function(ds) {
			const data = await ds.ls();
			for (const i of data)
				this.add(i);
		}

		g.push = function(...items) {
			for (const i of items)
				this.add(i);
		}

		return g;
	}

	static async loadGroup(e) {

		const g = List.wrapGroup(e);
		const ds = app.ds(e.getAttribute('ds'));

		let m, more, group;

		g.toggleLoading();

		m = await delayResolve(ds.load(g), 1200);
		
		g.toggleLoading();

		group = e.closest('.group');
		if (group) {

			more = group.querySelector('[name="_more"]');
			if (more) {

				if (m) dom.showElement(more);
				else dom.hideElement(more);
			}

		}
	}

	static handleClick(e, target) {

		if (e.tagName == 'BUTTON') {


			switch (e.name) {

				case '_less': {
					const header = e.parentElement;
					const content = header.nextElementSibling;
					const visible = parseInt(content.getAttribute('visible'));
		
					const items = queryVisible(content).reverse();
					const count = items.length - visible >= visible ? visible : items.length - visible;
		
					for (let i = 0; i < count; ++i)
						dom.hideElement(items[i]);
		
					content.classList.add('more');
		
					if (items.length - count <= visible)
						//dom.hideElement(e);
						content.parentElement.classList.remove('less');
				}
				return true;
		
				case '_up': {

					const g = e.closest('.group');
					if (g) {

						let e;

						while (true) {

							e = g.previousElementSibling;

							if (e && e.classList.contains('group')) {

								dom.moveUp(g);

								if (!dom.isElementVisible(e))
									continue;
							}

							break;
						}
					}
				}
				return true;

				case 'rm': {
					const item = e.closest('.item');
					if (item) {

						// const g = item.closest('[group]');
						// if (g) {
						// 	let n = e.dataset.count;
						// }



						const g = item.closest('[group]');
						if (g) {

							const next = g.querySelector(':scope > .item.hidden');
							if (next) {
								dom.showElement(next);

								// todo: hide more
							}

							const group = g.closest('.group');
							if (group) {

							}

						}

						dom.removeElement(item);
					}
				}
				break;
			}

		}

		else if (e.tagName == 'A') {
			switch (e.name) {
				case '_more': {
					const group = e.closest('.group');
					if (group) {

						const g = group.querySelector('[group]');
						if (g) {

							const n = parseInt(g.getAttribute('visible') || 5);
							const count = parseInt(g.dataset.count || n);

							g.dataset.count = count + n;

							const hidden = queryVisible(g, false).slice(0, n);
							for (const i of hidden)
								dom.showElement(i);

							if (hidden.length < n) {

								dom.hideElement(e);

								if (g.hasAttribute('ds')) {
									List.loadGroup(g);
								}
							}

						}

						const less = group.querySelector('[name="_less"]');
						if (less) dom.showElement(less);
					}
				}
				return true;

				case '_less': {
					const group = e.closest('.group');
					if (group) {

						const g = group.querySelector('[group]');
						if (g) {

							const n = parseInt(g.getAttribute('visible') || 5);
							const count = parseInt(g.dataset.count || n);
							const c = count - n;

							g.dataset.count = c;
							

							const items = queryVisible(g);
							const k = n - (count - items.length);

							for (const i of items.reverse().slice(0, k))
								dom.hideElement(i);

							if (c == n)
								dom.hideElement(e);
						}

						const more = group.querySelector('[name="_more"]');
						if (more) dom.showElement(more);
					}
				}
				return true;
			}
		}
		else {

			if (e.hasAttribute('grouphdr')) {
				e.parentElement.classList.toggle('collapsed');
				return true;
			}

			if (e.hasAttribute('group') && e.classList.contains('more')) {
				const visible = parseInt(e.getAttribute('visible'));
				const items = e.querySelectorAll(':scope > .item.hidden');
	
				const count = Math.min(items.length, visible);
				for (let i = 0; i < count; ++i)
					dom.showElement(items[i]);
	
				if (items.length <= visible)
					e.classList.remove('more');
	
				// const header = e.previousElementSibling;
				// const less = header.querySelector('button[name="less"]');
	
				// dom.showElement(less);
	
				const group = e.parentElement;
				group.classList.add('less');
	
				return true;
			}


		}

		if (target) {

			const isItem = e.classList.contains('item');

			if (isItem) {
				const id = e.dataset.id;

				target.onClick(id, e);
			}

		}
		
	}


}

Object.assign(List.prototype, ListMixin);

class ListItem {

	constructor(info) {
		this.info = info;
	}

	get template() { return 'column'; }
	get id() { return this.info.id; }
	//get id() { return undefined; }
	get draggable() { return false; }

	create() { return List.createItemElement(this); };
	render() {}
}

export {
	ListMixin
	, List
	, ListItem
}

function createGroup(content, o) {
	if (o.hide)
		content.classList.add('hidable');

	if (o.empty)
		content.classList.add('show-empty');

	if (o.count)
		content.classList.add('count');

	if (o.hideFirst)
		content.classList.add('hide-first');

	if (o.cmd)
		content.setAttribute('cmd', o.cmd);

	if (o.ds) 
		content.setAttribute('ds', o.ds);

	if (o.item)
		content.setAttribute('template', o.item);

	return {
		count: 0,
		...List.createMixin(content)

		, addTemplate(template, info, top=false, templates=[], ...styles) {

			let hide = false;

			if (o.visible) {
				const visible = o.visible;
				
				hide = !top;

				if (this.count > visible)
					content.classList.add('more')					
				else if (this.count < visible)
					hide = false;
			}

			++this.count;

			const e = this.addItemTemplate(template, info, top, templates, ...styles);
			
			if (o.draggable)
				e.draggable = true;
			
			if (hide)
				dom.hideElement(e);

			return e;
		}

		, add(...args) { 
			return this.addTemplate(o.item, ...args); 
		}

		, get(id) {
			return this.getItem(id);
		}

		, async load(ds, sort) {
			const data = await ds.ls();

			if (sort)
				data.sort(sort);

			for (const i of data)
				this.add(i);
		}

		, push(...items) {
			for (const i of items)
				this.add(i);
		}

	};
}

function queryVisible(container, visible=true) {
	const selector = visible ? ':not(.hidden)' : '.hidden';
	return Array.from(container.querySelectorAll(':scope > .item' + selector));
}

/*

DocumentFragments allow developers to place child elements onto an arbitrary node-like parent, allowing for node-like interactions without a true root node. Doing so allows developers to produce structure without doing so within the visible DOM

var documentFragment = document.createDocumentFragment();

*/
