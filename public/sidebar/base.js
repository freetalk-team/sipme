// TODO: Remove all that stuff!! Replace it with the new functionality

class SidebarPage extends UX.Page {

	#type;

	get type() { return this.#type; }
	get area() { return this.container; }

	get showFilter() { return true; }
	get filter() {}
	set filter(v) {}

	constructor (type, container) {
		super(container);

		this.#type = type;

		// this.#observer = new MutationObserver(e => this.#handleMutation(e), { subtree: true, childList: true });
		// this.#observer.observe(this.container);
	}


	// virtual
	onDragStart() {}
	getIconId() {}

	static registerOptions(id, opt) {
		AddEditor.register(id, opt.items);
	}

}

const SidebarListMixin = {

	clearSelection() {
		const e = document.querySelector('#sidebar .list2');
		UX.List.clearSelection(e);
	}

	, add(info, top=false) {

		if (typeof info == 'string')
			info = { id: info };
		else {

			if (!info.id) info.id = info.name;
			// if (!info.type) info.type = info.name;
		}

		const i = this.addTemplate(this.template_, info, top);
		
		return i;
	}

	// used for draggable
	, getDataType() { return this.opt.dataType; }

	// override
	, onAdd() {}
}

Object.assign(SidebarPage.prototype, UX.ListMixin, SidebarListMixin);

export {
	SidebarPage
	, SidebarListMixin
}