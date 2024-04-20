
import { Header } from '../common.js';

export class FindEditor extends UX.ListPage {

	static id = 'find';

	static kAttributes = {};
	static register(id, attributes) { this.kAttributes[id] = attributes; }

	#params;
	#locals;
	#search = '';
	#searchb;
	#lastSelected = new Set;

	get excludeFromStack() { return true; }

	constructor(container) {

		if (!container) {
			container = dom.renderTemplate('editor-base', {}, 'div', ['editor-header-grid', 'editor-find-toolbar'], 'editor-find-base');
			container.id = 'find-editor';
			dom.hideElement(container);
		}

		super(container);

		this.area.classList.add('cc', 'm2', 'results', 'list');
		this.#searchb = this.editorElement.querySelector('button[name="search"]');
	}

	set search(disabled) {
		this.#searchb.disabled = disabled;
	}

	onAction(action, e, btn) {
		this.#handleAction(action, btn);
	}

	onEditorAction(action, e, btn) {

		switch (action) {

			case 'search':
			btn.disabled = true;
			this.#doSearch();
			break;

			default: {

				const id = e.dataset.id;
				const data = this.#locals.get(id);

				if (this.#params.onaction)
					this.#params.onaction(action, data);

				e.classList.add('local');
				// dom.removeElement(btn);
			}
			
			break;
		}

		
	}

	onClick(id, e) {
		const data = e.dataset;

		console.log('Find editor click', id);

		if (this.#params.type == 'select') {
			data.selected = data.selected == 'false' ? true : false;
			return;
		}

		const onClick = this.#params.onclick;

		if (onClick) {
			onClick(e.dataset);
		}
	}

	onInput(e, key) {

		const t = e.target;

		const v = e.value;
		const valid = v.length >= 3;


		const search = e.nextElementSibling;
		search.disabled = !valid;

		if (v.length != 1) {
			this.filter(v);
		}

		this.#search = valid ? v : '';
	}

	onKeyPress(e, key) {
		if (key == 'Enter') { 

			if (this.#search.length > 0)
				this.#doSearch();
		}
	}


	open(action, params={ ds: action, mode:'ls' }) {
		console.log('Opening FIND:', action);

		if (this.action == action && !params.force) {

			if (this.#params && 
				params.mode == this.#params.mode && 
				params.type == this.#params.type)
				return;
		}

		if (!params.ds) params.ds = action;
		if (!params.mode) params.mode = 'ls';

		this.action = action;

		const header = new Header(this.headerElement);

		header.title = params.title || `Find ${action}`;
		header.desc = params.desc || `Search database for ${action}`;
		header.icon.name = action;

		const mode = params.type || 'find';
		this.#setMode(mode, header, !!params.add);

		const add = header.button('new');
		params.add ? dom.showElement(add) : dom.hideElement(add);

		// const submit = header.querySelector('button[name="submit"]');
		// params.type == 'select' ? dom.showElement(submit) : dom.hideElement(submit);

		this.clear();

		this.#load(params);
	}

	async #load(params) {

		const { local, remote, ds, cmd } = params;

		if (!params.result && ds)
			params.result = `find-${ds}-item`;

		if (cmd) {
			this.area.setAttribute('group', ds || local);
			this.area.setAttribute('cmd', cmd);
		}
		else {
			this.area.removeAttribute('group');
			this.area.removeAttribute('cmd');
		}

		this.#locals = null;
		this.#params = params;

		if (ds) 
			return this.#loadFromDS(params);

		this.search = !remote;

		if (!local) {
			return;
		}

		const items = await app.db.ls(local);
		if (items.length == 0) return;

		sort(items, this.#lastSelected);

		const locals = new Map; 

		for (const i of items) {

			locals.set(i.id, i);
			this.#addItem(i);

			// const { add, rm } = this.#addItem(i);

			// // const add = e.querySelector('button[name="add"]');
			// // if (add) {
			// // 	//dom.showElement(add);
			// // }

			// if (i.type == 'remote') {
			// 	if (add) dom.showElement(add);
			// }
			// else {
			// 	if (rm) dom.showElement(rm);
			// }
		}

		this.#locals = locals;
	}

	async #loadFromDS({ ds, result, results, mode, type }) {

		this.search = false;

		if (typeof ds == 'string')
			ds = app.ds(ds);

		switch (mode) {

			case 'ls': {

				const data = await ds.ls();

				// todo: sort
				sort(data, this.#lastSelected);

				let template, name;

				for (const i of data) {
					name = i.ds || ds.name;
					template = results ? results[name] || result : result;
					this.#addItem(i, template);
				}

				this.#locals = new Map(data.map(i => [i.id.toString(), i]));
			}
			break;

		}

	}

	async #doSearch() {

		const s = this.#search;
		console.log('Do search:', s);

		let { remote, index, local, table, ds } = this.#params;
		// if (!remote && !table) return;

		this.toggleLoading();

		let r;

		if (ds) {
			if (typeof ds == 'string')
				ds = app.ds(ds);

			const attrs = FindEditor.kAttributes[ds.name] || [];
			r = await delayResolve(ds.search(this.#search, attrs, index));

			if (local)
				local = ds; 
		}
		else {

			r = await delayResolve(table 
				? this.#queryDatabase(table, null, this.#search) 
				: this.#queryFirebase(remote, index || 'name', s.toLowerCase()) );
		}

		if (r) {

			if (!this.#locals) 
				this.#locals = new Map;
			
			const locals = this.#locals;
			const items = [];

			let id;

			for (const i of r) {

				id = i.id.toString();

				if (locals.has(id)) {
					const e = this.getItem(id);
					if (e)
						dom.showElement(e);

					continue;
				}

				if (i.user) {
					i.user = await app.loadContact(i.user);
				}

				i.remote = true;

				items.push(i);
				locals.set(id, i);

				this.#addItem(i, null, true);

				// const { add } = this.#addItem(i);

				// if (add) dom.showElement(add);
			}

			if (local && items.length > 0) {
				console.log('# Adding remote results', items);

				try {

					typeof local == 'string'
						? await app.db.add(local, items, 'add')
						: await local.put(items)
						;
				}
				catch (e) {
					console.error('Failed to add results into local db', e);
				}
			}
		}

		this.toggleLoading();
	}

	async #queryFirebase(table, index, search) {
		const r = search ? await app.firebase.search(table, index, search) : await app.firebase.ls(table);
		return r ? Object.toArray(r) : [];
	}

	async #queryDatabase(table, index, search) {
		let r;

		try {
			//r = ajax.get(`/admin/ls/${table}`);

			let q = `/api/search/${table}`;
			if (search) {
				const params = new URLSearchParams({ what: search });
				q += '?' + params.toString();
			} 

			r = await ajax.get(q);
		}
		catch (e) {
			console.error('Failed to query database');
		}

		return r;
	}

	#addItem(data, template, top=false) {
		const { result, type, isselected, purge } = this.#params;

		const id = data.id;
		// const name = local || remote;

		template = template || result;

		const e = this.addItemTemplate(template, data, top);

		e.dataset.name = data.display || data.name;

		if (!data.remote)
			e.classList.add('local');

		if (type == 'select') {

			const check = dom.createElement('i', 'fa', 'check', 'fa-circle', 'stroke', 'w3-text-blue');
			// const check = dom.createElement('i', 'fa', 'check', 'stroke', 'w3-text-green');

			e.dataset.selected = !!isselected && isselected(data);
			e.removeAttribute('cmd');
			e.appendChild(check);
		}

		else if (type == 'cmd') {

		}

		else if (type == 'rm') {
			const b = dom.createElement('button', 'icon', 'fa', 'display-hover');
			b.name = 'remove';
			b.title = 'Remove';

			const target = this.#params.ds;
			const cmd = purge ? 'purge' : 'rm';

			b.setAttribute('cmd', cmd + '-' + target);

			e.appendChild(b);
		}

		else {
			const add = dom.createElement('button', 'icon', 'fa', 'display-hover');
			add.name = 'add';
			add.title = 'Add';

			e.appendChild(add);

			if (!data.remote)
				e.classList.add('local');
		}

		// if (typeof postRender == 'function')
		// 	postRender(info, e);


		// const rm = e.querySelector('button[name="remove"]');
		// const add = e.querySelector('button[name="add"]');

		// if (rm) rm.onclick = () => {
		// 	dom.removeElement(e);
		// }

		// if (add) add.onclick = () => {
		// 	if (rm) dom.showElement(rm);

		// 	dom.hideElement(add);
		// 	app.add(name, this.#locals.get(id), 'update');
		// }

		// return { add, rm };
	}

	#setMode(mode, header, canadd=false) {

		const add = header.button('new');
		dom.showElement(add, canadd); 

		const done = header.button('submit');
		dom.showElement(done, mode == 'select');
	}

	#handleAction(action, button) {

		switch (action) {

			case 'new':
			case 'add':
			app.executeCommand('add', 'new', this.action);
			return;

			case 'submit': {
				if (this.#params.ondone) {

					const items = Array.from(this.getItems('selected', 'true'));
					const ids = items.map(i => i.dataset.id);
					const selected = ids.map(i => this.#locals.get(i));

					this.#params.ondone(selected);

					for (const i of ids)
						this.#lastSelected.add(i);
				}
			}
			break;

			case 'select':
			// same editor
			return;

		}

		app.cancelEditor();

	}

}

function sort(data, ids) {
	data.sort((a, b) => ids.has(a.id) ? -1 : (ids.has(b) ? 1 : 0));
}

window.FindEditor = FindEditor;
