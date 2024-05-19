


import { Navbar } from './navbar.js';
import { SidebarPage } from './sidebar/base.js';

class Sidebar extends UX.List {

	static Page = SidebarPage;

	static #views = {};
	static register(Page, id=Page.id) { 
		Sidebar.#views[id] = Page;
	}

	#container;
	#pages = new Map;
	#current = null;
	#icon;
	#title;
	#filter;
	#add;
	#import;
	#search;
	#navbar;
	#collapsed = true;

	#filterTimeout;

	set width(n) { this.parentElement.style.width = n; }

	constructor(container='sidebar') {
		const c = typeof container == 'string' 
			? document.getElementById(container) 
			: container;

		const e = c.querySelector('.scrollable');

		super (e);

		this.#container = c;
		this.width = app.ui.sidebar.width;

		this.registerEvents();
		this.registerClickHandlers();

		const head = c.querySelector('.head');

		this.#icon = head.querySelector('i.fa.icon');
		this.#title = head.querySelector('.title');
		this.#filter = head.querySelector('input[name="filter"]');
		this.#add = head.querySelector('button[name="add"]');
		this.#import = head.querySelector('button[name="import"]');
		this.#search = head.querySelector('button[name="search"]');

		this.#add.onclick = () => this.#onAdd();
		this.#search.onclick = () => this.#onSearch();
		this.#import.onclick = () => this.onAction('import', null, this.#import);

		this.#navbar = new Navbar;
		this.#navbar.onChange = (id) => {

			console.debug('SIDEBAR on nav change:', id);

			switch (id) {

				case 'home':
				case 'task':
				app.openEditor(id);
				break;

				default:
				this.open(id);
				break;
			}
			
		}

		this.#navbar.toggle = () => this.toggle();
		// this.#navbar.addAction(WikiPage.action);

		// this.container.addEventListener('dragstart', function(e) {
		// 	console.log('#', this);

		// });

		this.#filter.oninput = e => this.#onFilter(e.target, e.data);
			
		this.area.ondragstart = (e) => {

			const dt = e.dataTransfer;
			const target = e.target;

			const id = target.dataset.id;
			const type = target.parentElement.getAttribute('group');

			console.debug('Start draging', id, type);

			dt.setData('type', type);
			// dt.setData('data', JSON.stringify(info));
			dt.setData('id', id);
		}

		app.on('timeupdate', e => this.#onTimeUpdate(e.detail));
	}

	toggle() {
		// const container = this.parentElement;
		// // const sash = container.nextElementSibling;
		// const sash = this.#container.nextElementSibling;

		// sash.classList.toggle('hidden');

		// this.#collapsed = container.classList.toggle('hidden');

		this.#collapsed = this.#container.classList.toggle('collapsed');
		
	}
	
	show() {
		// this.#navbar.show();
		dom.showElement(this.#container);
	}

	hide() {
		// this.#navbar.hide();
		dom.hideElement(this.#container);
	}

	async open(id) {

		if (this.#collapsed)
			this.toggle();

		if (this.#current && this.#current.type == id) return;

		if (this.#navbar.active != id)
			this.#navbar.switchTo(id);




		let p = this.#pages.get(id);
		if (!p) {

			p = this.#createPage(id);

			await p.load();
		}

		if (this.#current) {
			this.#current.hide();
		}

		this.#current = p;

		const filter = p.filter;
		if (filter) {
			this.#filter.value = filter;
			this.#doFilter(filter);
		}
		else {
			this.#filter.value = '';
		}

		const title = p.title || id;

		this.#loadHead(p);
		this.#setTitle(title);

		p.show();

	}

	onClick(id, e, target) {
		console.log('SIDEBAR on click', id);

		if (target) {

			switch (target.tagName) {

				case 'A': {
					const link = target.getAttribute('link');

					if (link) {

						const [type, action, id] = link.slice(1).split('/');

						switch (action) {

							case 'add':
							app.add(type, id);
							break;
						}

						return;
					}

				}
				break;
			}
		}

		this.selectItem(id);

		e.classList.remove('missed');

		if (this.#current) {
			let group, cmd;
			
			const g = e.closest('[group]');
			if (g) {
				group = g.getAttribute('group');
				cmd = g.getAttribute('cmd');
			}

			if (!cmd) {
				cmd = e.getAttribute('cmd');
			}

			if (cmd) {
				const id = e.dataset.id;
				app.executeCommand(...cmd.split('-'), id);
			}

			this.#current.onClick(id, e, group);
		}
	}

	onAction(name, id, target) {

		const cmd = target.getAttribute('cmd');
		if (cmd) {
			const [action, ...args] = cmd.split('-');

			switch (action) {
				case 'find':
				app.find(args[0]);
				break;

				default:
				app.executeCommand(action, ...args, id);
				break;
			}

			return;
		}
		
		if (this.#current) {
			this.#current.onAction(name, id, target);
		}
	}

	onOpenEditor(type, action, id) {

		console.debug('SIDEBAR on editor open:', type, this.#current);

		this.#navbar.onOpenEditor(type);

		switch (type) {

			case 'contact':
			case 'channel':
			this.selectItem(id);
			break;

			case 'home':
			case 'task':
			if (!this.#collapsed)
				this.toggle();

			this.clearSelection();
			break;
		}
	}

	switchTo(id) { 
		return this.open(id); 
	}

	load(settings) {
		
	}

	has(id) { 
		return this.#pages.has(id); 
	}

	#createPage(id) {

		

		const Page = Sidebar.#views[id];
		if (!Page) {
			console.error('Sidebar: unknown page', id);
			throw new Error('Invalid sidebar page:', id);
		}

		const container = dom.createElement('div', `sb-${id}`, 'fit', 'fade', 'hidden');
		container.dataset.type = id;

		const p = new Page(container);

		this.append(container);
		this.#pages.set(id, p);

		return p;
	}

	#setTitle(title) {

		const i = this.#current.icon;
		if (i) 
			this.#icon.setAttribute('icon-id', i);
		else
			this.#icon.removeAttribute('icon-id');

		
		this.#title.innerText = title.toUpperCase();
	}

	#loadHead(p) {

		const filter = !!p.showFilter;
		const add = !!p.showAdd;
		const search = !!p.showSearch;

		if (filter) dom.showElement(this.#filter);
		else dom.hideElement(this.#filter);

		if (add) dom.showElement(this.#add);
		else dom.hideElement(this.#add);

		if (search) dom.showElement(this.#search);
		else dom.hideElement(this.#search);

		const imp = p.showImport;

		this.#import.title = 'Import';
		this.#import.removeAttribute('cmd');

		if (imp) {

			if (typeof imp == 'string') {
				this.#import.title = imp;
			}
			else if (typeof imp == 'object') {
				this.#import.title = imp.title;

				if (imp.cmd)
					this.#import.setAttribute('cmd', imp.cmd);
			}

			dom.showElement(this.#import);
		}
		else {
			this.#import.title = 'Import';
			this.#import.removeAttribute('cmd');

			dom.hideElement(this.#import);
		}
	}

	#onAdd() {
		if (this.#current)
			app.executeCommand('add', 'new', this.#current.type);
	}

	#onSearch() {
		if (this.#current)
			app.find(this.#current.type);
	}

	#onTimeUpdate(ts) {
		if (this.#current)
			this.#current.updateTimes(ts);

	}

	// handleEvent(e) {

	// 	switch (e.type) {
	// 		case 'dragstart':
	// 		// this.#current.onDragStart();
			
	// 		break;
	// 	}
	// }

	#onFilter(e, key) {

		if (this.#filterTimeout) return;

		this.#filterTimeout = setTimeout(() => {

			if (!this.#current) return;

			const value = this.#filter.value.trim();
			this.#doFilter(value);

			this.#filterTimeout = null;

		}, 2000);

	}

	#doFilter(value) {
		const groups = this.#current.querySelectorAll('[group]');
		// const id = this.#current.type;

		if (value)
			this.#current.filter = value;

		for (const i of groups) {
			const g = UX.List.createMixin(i);
			g.filter(value);
		}

	}

	static defaultSettings() {
		return {
			width: '260px'
		};
	}
}

// console.log('###', List.prototype);
// console.log('###', Sidebar.prototype);

// Object.assign(Sidebar.prototype, PageMixin, ListMixin);
Object.assign(Sidebar.prototype, UX.PageMixin);


export {
	Sidebar
}
