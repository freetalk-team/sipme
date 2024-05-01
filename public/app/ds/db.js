
import { DataSourceBase } from './base.js';


export class DataSourceDatabase extends DataSourceBase {


	// constructor (table, cache) {
	// 	super(table);

	// }

	ls(...args) { return app.db.ls(this.name, ...args); }
	lsByIndex(...args) { return app.db.lsByIndex(this.name, ...args); }
	lsByRange(...args) { return app.db.lsByRange(this.name, ...args); }
	count() { return app.db.count(this.name); }

	async get(id) { 
		const data = await app.db.get(this.name, id); 
		if (data && data.content && typeof data.content != 'string')
			data.content = unzip(data.content);

		return data;
	}

	async getByIndex(index, value) {
		const data = await app.db.getByIndex(this.name, index, value); 
		if (data && data.content && typeof data.content != 'string')
			data.content = unzip(data.content);

		return data;
	}

	put(data) {

		const items = Array.isArray(data) ? data : [ data ];
		
		for (const i of items) {
			if (i.content)
				i.content = zip(i.content);
		}

		return app.db.put(this.name, data); 
	}

	update(id, ...args) {

		const params = [id, ...args];
		if (typeof id == 'object')
			params.unshift(id.id);

		const data = params[1];
		if (data && data.content)
			data.content = zip(data.content);

		return app.db.update(this.name, ...params); 
		//return this.put(data); 
	}

	rm(id) {
		return app.db.rm(this.name, id); 
	}
}

export class DataSourceDatabaseIndex extends DataSourceDatabase {

	#index;

	constructor(table, index) {
		super(table);

		this.#index = index;
	}

	async get(id) {
		const data = await app.db.getByIndex(this.name, this.#index, id); 
		if (data && data.content && typeof data.content != 'string')
			data.content = unzip(data.content);

		return data;
	}

}
