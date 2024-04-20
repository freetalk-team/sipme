import { Scrollable, ScrollableMixin } from './scrollable2.js';
import { Page, PageControllerMixin } from './page.js';
import { ListMixin } from './list2.js';


export class ScrollablePage extends Page {

	get scrollableElement() { return this.query('.editor .scrollable'); }
	get scrollableContent() { return this.query('.editor .scrollable > .area > .content');  }

	set bottom(v) { this.area.setAttribute('bottom', ''); }

	get height() {
		const e = this.scrollableElement;
		return e.getBoundingClientRect().height;
	}

	constructor (parent, info={}) {

		let container;
		if (parent) {
			container = typeof parent == 'string' 
				? document.getElementById(parent) 
				: parent;
		}
		else {
			container = dom.renderTemplate('editor-base', info, 'div', 'editor-header-grid', 'editor-scrollable');
		}

		let header = container.querySelector('div.header');
		if (!header) {
			ScrollablePage.createHeader(container);
		}

		let editor = container.querySelector('div.editor');
		if (!editor) {
			editor = ScrollablePage.createEditor(container);
		}

		let scrollable = editor.querySelector('.scrollable');
		if (!scrollable) {
			scrollable = Scrollable.createElement(editor);
		}

		super(container);

		this.area = scrollable.querySelector('.content');
	}

	onScrollY() {}
	onResize() {}

	registerEvents() {
		// todo: remove
	}


}

Object.assign(ScrollablePage.prototype, ScrollableMixin);

class ListPageBase extends ScrollablePage {

	constructor(container) {
		super(container);

		const scrollable = this.scrollableElement;
		scrollable.classList.add('list2');
	}

}

Object.assign(ListPageBase.prototype, ListMixin);

export class ListPage extends ListPageBase {

	onFilter(value) {

		if (value.length != 1)
			this.filter(value);
	}
}

export class ListPageController extends ListPage {
	pages = new Map;

	get currentPage() {
		return this.pages.get(this.current);
	}
} 

Object.assign(ListPageController.prototype, PageControllerMixin);

// export class TabPage extends ListPage {}