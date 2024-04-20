
const kDefaultWidth = 250;

class Sidebar extends UX.List {

	#width;
	#parent;
	#sash;
	#tabbar;
	#navbar;
	#collapsed = false;

	pages = new Map;

	get collapsed() { return this.#collapsed; }
	// get container() { return this.area; }

	constructor(container, id, tabs=[]) {

		let sash;

		if (!container) {
			sash = dom.createElement('div', 'v-sash', 'reverse');
			container = dom.renderTemplate('editor-sidebar', tabs);

			parent.appendChild(container);
			parent.appendChild(sash);

		}
		else {
			sash = container.nextElementSibling;
		}

		const scrollable = container.querySelector('.scrollable');
		super(scrollable);

		this.container = container;

		//this.registerEvents();
		//this.registerClickHandlers();

		this.#sash = sash;
		this.#tabbar = container.querySelector('.tabbar');
		this.#navbar = container.querySelector('.navbar');

		let width = kDefaultWidth;
		let collapsed = false;

		if (id) {
			container.id = id;

			const ui = app.ui[id];
			if (ui) {
				collapsed = !!ui.collapsed;
				width = ui.width || width;
			}
		}

		container.style.width = `${width}px`;

		if (collapsed)
			this.toggle();
	}

	// called by upper layer
	onAction(action, e, target) {

		switch (action) {
			case 'collapse':
			case 'expand':
			this.toggle();
			break;

			default:
			this.handleAction(action, e, target);
			break;
		}

	}

	onElementClick() {}

	handleAction() {}

	toggle() {

		const collapsed = this.container.classList.toggle('collapsed');
		let show;

		if (collapsed) {
			if (this.#sash) dom.hideElement(this.#sash);

			this.#width = this.container.style.width;
			this.container.style.width = null;

			show = false;
		}
		else {
			if (this.#sash) dom.showElement(this.#sash);

			this.container.style.width = this.#width;

			show = true;
		}

		this.#collapsed = !show;

		const container = this.container.closest('.sidebar');
		const id = container.id;

		if (id) {
			app.updateSetting(id, { collapsed });
		}

		return show;
	}

	show() {
		this.#collapsed = false;

		dom.showElement(this.container);
		this.container.style.width = this.#width;

		if (this.#sash) dom.showElement(this.#sash);
	}

	hide() {
		this.#collapsed = true;

		dom.hideElement(this.container);
		
		if (this.#sash) 
			dom.hideElement(this.#sash);
	}

	load(id, type=id) {


	}

	loadTabs(active=0) {

		const tabs = this.tabs;

		console.log('Editor sidebar tabs:', tabs);

		for (const i of tabs) 
			this.#addPage(new TabPage(i, true));

		this.switchTo(tabs[active]);

	}

	onTabChange(tab, last) {
		this.switchTo(tab);
	}

	add(page, active=false) {

		const e = page.renderTab();

		this.#tabbar.insertBefore(e, this.#tabbar.lastElementChild);
		this.#addPage(page);

		if (active) {
			e.classList.add('active');
			this.switchTo(page.name);
		}
	}

	onClick() {}

	#addPage(page) {
		this.area.appendChild(page.container);
		this.addPage(page.id, page);
	}

	#switchTo(current) {

		const active = this.#tabbar.querySelector('.active');
		active.classList.remove('active');

		current.classList.add('active');

		const name = current.dataset.tab;
		this.switchTo(name);
	}

	

	updateTimes() {
		this.getCurrentPage().updateTimes();
	}
}

Object.assign(Sidebar.prototype, UX.PageControllerMixin);

class TabPage extends UX.Page {

	#name;

	constructor(name, showEmpty=false) {
		const e = dom.createElement('div', 'column', 'fit', 'hidden');

		if (showEmpty)
			e.classList.add('show-empty');

		super(e);

		if (this.reverse) e.classList.add('reverse');

		this.#name = name;
	}

	get id() { return this.#name; }
	get area() { return this.container; }
	get name() { return this.#name; }

	renderTab() {
		const e = dom.createElement('span', 'tab', 'text-center', 'fit');

		if (this.icon) {
			const i = dom.createElement('i', 'fa', ...this.icon.split(' '));
			// i.innerHTML = `&#x${this.icon};`;

			e.classList.add('icon');
			e.appendChild(i);
		}

		return e;
	}

	updateTimes() {
		
		const now = Date.now();

		const elements = this.container.querySelectorAll('time[data-time]');
		for (const i of elements) {

			const ts = Number(i.dataset.time) * 1000;
			const d = new Date(ts);

			i.innerText = d.offsetFrom(now);
		}
	}

	createList() { return UX.List.createMixin(this.container); }
}

Object.assign(TabPage.prototype, UX.ListMixin);

export {
	Sidebar,
	TabPage
}

/*

Operator override 

Vector2.prototype["+"] = function( b )
{
  return new Vector2( this.x + b.x, this.y + b.y );
}

var a = new Vector2(1,1);
var b = new Vector2(2,2);
var c = a + b;

*/