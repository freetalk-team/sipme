import { DataSourceRest as DataSourceBase } from './rest.js';

export class DataSourceFirebase extends DataSourceBase {


	// constructor (table, cache) {
	// 	super(table);

	// }

	async ls(offset, limit) { 
		const data = await app.firebase.ls(this.name);
		if (!data) return null;

		const res = Object.toArray(data);

		for (const i of res)
			i.user = await app.loadContact(i.user);

		return res;
	}

	get(id) { return app.firebase.get(this.name, id); }

	async search(search, attrs, index) {
		const data = await app.firebase.search(this.name, index, search.toLowerCase());
		return data ? Object.toArray(data) : null;
	}

	set(...params) {
		return app.firebase.set(...params);
	}
}