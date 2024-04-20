
import { Header } from './common.js';


export class PageBase extends UX.ListPageController {

	#active;
	#opened = false;

	get active() { return this.#active; }
	get header() {
		const e = this.headerElement;
		return new Header(e);
	}

	get opened() { return this.#opened; }

	show() {
		this.#opened = true;
		super.show();
	}

	hide() {
		this.#opened = false;
		super.hide();
	}

	switchTo(id) {
		this.#active = super.switchTo(id);
	}

	onInput(...args) {
		if (!this.#active) return;
		this.#active.onInput(...args);
	}

	onFilter(...args) {
		if (!this.#active) return;
		this.#active.onFilter(...args);
	}

	onKeyPress(...args) {
		if (!this.#active) return;
		this.#active.onKeyPress(...args);
	}

	onClick(...args) {
		if (!this.#active) return;
		this.#active.onClick(...args);
	}

	onElementClick(e, ...args) {
		if (!this.#active) return;

		switch (e.tagName) {

			case 'A':
			case 'BUTTON':
			return this.#active.onAction(e.getAttribute('name'), null, e);
			
			// default: {
			// 	const i = e.closest('[data-id]');
			// 	if (i) {
			// 		const id = i.dataset.id;
			// 		return this.#active.onClick(id, e, ...args);
			// 	}
			// }
		}
	}

	onEditorAction(...args) {
		if (!this.#active) return;
		this.#active.onAction(...args);
	}

	onAction() {}
	onFileDrop() {}
	onScrollY() {}
	onResize() {}
}