
import { DataSourceBase } from './base.js';


export class DataSourceRest extends DataSourceBase {

	#path;

	get path() { return `${this.#path}/${this.name}`; }

	constructor (name, path='/api') {
	 	super(name);
		this.#path = path;
	}

	async ls(offset=0, limit=50, ts=0) { 
		const params = new URLSearchParams;

		params.set('offset', offset);
		params.set('limit', limit);

		if (ts)
			params.set('ts', ts);

		const data = await ajax.get(`${this.path}?${params.toString()}`);

		// if (data) {
		// 	for (const i of data) {
		// 		if (i.info) {
		// 			Object.assign(i, i.info);
		// 			delete i.info;
		// 		}
		// 	}
		// }

		// empty string on 308
		return data || []; 
	}

	async get(idOrParams) {
		const data = await this.query(null, idOrParams); 
		if (data && Array.isArray(data))
			return data.length > 0 ? data[0] : null;

		return data;
	}

	query(path, idOrParams) { 
		
		let url = this.path;
		
		if (path)
			url += `/${path}`;

		if (typeof idOrParams == 'object') {
			const params = new URLSearchParams(Object.entries(idOrParams));
			url += `?${params.toString()}`;
		}
		else {
			url += `/${idOrParams.toString()}`;
		}
		
		return ajax.get(url); 
	}

	search(data, attr, offset=0, limit=20) {
		let url = `${this.#path}/search/${this.name}?`;

		if (typeof data == 'string')
			data = { what: data };

		const params = new URLSearchParams(data);

		if (attr && attr.length > 0) {
			attr.push('id');
			params.set('attr', attr.join(','));
		}

		params.set('offset', offset);
		params.set('limit', limit);

		url += params.toString();

		return ajax.get(url);
	}

	
}

export class DataSourceRestAdmin extends DataSourceRest {
	put(data) { 
		return ajax.post(this.path, data); 
	}

	rm(id) {
		return ajax.delete(`${this.path}/${id}`);
	}
}
