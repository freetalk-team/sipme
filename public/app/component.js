

import { DataList } from '../datalist.js';

const ComponentMixin = {
	async loadComponent(id) {

		const uid = this.uid;

		let code = localStorage.getItem(`${id}@${uid}`) || localStorage.getItem(id);

		if (!code) {
			code = await this.firebase.data('comp', id);

			localStorage.setItem(id, code);
		}

		return code;

	}

	, async loadComponentList() {
		if (this.componentList) return;

		const list = new DataList(document.getElementById('component-list'));
		const comps = await this.contacts.getComponents();

		list.load(comps);

		this.componentList = list;
	}

	, async exportComponent(id) {

		const info = await app.contacts.getComponent(id);
		const data = localStorage.getItem(id) || localStorage.getItem(`${id}*`);

		download(data, 'text/plain', `${info.name}.js`);
	}
}

export {
	ComponentMixin
}