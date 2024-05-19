
import { DataSourceBase } from './ds/base.js';
import { DataSourceDatabase, DataSourceDatabaseIndex } from './ds/db.js';
import { DataSourceFirebase } from './ds/fb.js';
import { DataSourceRest, DataSourceRestAdmin } from './ds/rest.js';

export class DataSource extends DataSourceBase {

	static Base = DataSourceBase;
	static Database = DataSourceDatabase;
	static Rest = DataSourceRest;

	#local;
	#remote;

	get local() { return this.#local; }
	get remote() { return this.#remote; }

	constructor (local, remote=local) {

		const name = typeof local == 'string' ? local : local.name;
		super(name);

		this.#local = typeof local == 'string' ? new DataSourceDatabase(local) : local;
		this.#remote = typeof remote == 'string' ? new DataSourceFirebase(remote) : remote;

	}

	ls(...args) { return this.#local.ls(...args); }
	count() { return this.#local.count(); }

	async get(id) {

		let data = await this.#local.get(id);

		if (!data) {

			data = await this.#remote.get(id);

			if (data) {

				if (typeof data == 'string') {

					const r = { id, content: data };
					data = r;
				}
				else {
					data.id = id;
					data.remote = true;
				}
				//data.type = 'remote';

				await this.#local.put(data);
			}
		}

		return data;
	}

	async put(data, update=false) {

		const r = await this.#remote.put(data);

		if (r && !Array.isArray(data))
			Object.assign(data, r);

		await this.#local.put(data);
	}

	async search(...params) {
		const data = await this.#remote.search(...params);

		// if (data)
		// 	await this.#local.update(data);

		return data;
	}

	async pull(ts) {

		let data;

		data = await this.#remote.ls(0, 50, ts);

		if (data.length > 0)
			await this.#local.put(data);

		return data;
	}

	update(...args) { return this.#local.update(...args); }
	rm(id) { return this.#local.rm(id); }

	async purge(id) {
		await this.#remote.rm(id);
		return this.#local.rm(id);
	}
}

const DataSourceCacheBase = function(classname) {
	class DataSourceCache extends classname {
		#cache;
		#opt;

		get local() { return this.#cache || super.local; }

		constructor (...args) {

			const opt =  { maxCacheSize: 1000, maxCacheTime: 2 * 86400 * 1000 };

			const o = args[args.length - 1];
			if (typeof o == 'object' && o.constructor.name == 'Object') {
				args.pop();
				Object.assign(opt, o);
			}

			super (...args);

			this.#opt = opt;
		}

		async ls(...args) {

			if (!this.#cache)  {

				this.#cache = new CacheMap(this.#opt);

				let data = await super.ls(...args);
				if (data) {

					for (const i of data) {

						this.#cache.set(i.id, i);

					}
				}
			}

			return this.#cache.values();
		}

		async get(id) {

			await this.ls();

			let data = this.#cache.get(id);
			if (data) return data;

			data = await super.get(id);
			if (data) {
				data.id = data.id || id;
				this.#cache.set(id, data);
			}

			return data;
		}

		put(data) {

			if (this.#cache) {

				data = Array.isArray(data) ? data : [ data ];

				for (const i of data)
					this.#cache.set(i.id, i);
			}

			return super.put(data);
		}

		update(id, data, init={}) {
			if (this.#cache) {
				let i = this.#cache.get(id);
				if (i) {
					Object.assign(i, data);
				}
				else {
					this.#cache.set(id, Object.assign({ id }, init, data));
				}
			}

			return super.update(id, data, init);
		}
	}

	return DataSourceCache;
}

export const DataSourceCache = DataSourceCacheBase(DataSource);
export const DataSourceDatabaseCache = DataSourceCacheBase(DataSourceDatabase);
export const DataSourceDatabaseIndexCache = DataSourceCacheBase(DataSourceDatabaseIndex);

export class DataSourceBackend extends DataSource {

	get path() { return this.remote.path; }

	constructor(local, remote=local, ...args) {

		const ds = typeof remote == 'string' ? new DataSourceRest(remote, ...args) : remote;

		super (local, ds);
	}

	async ls() {
		let data = await this.local.ls();
		if (data.length == 0) {
			data = await this.remote.ls();

			if (data.length > 0)
				await this.local.put(data);
		}

		return data;
	}

	async rm(id) {
		await this.remote.rm(id);
		await this.local.rm(id);
	}
}

export class DataSourceBackendAdmin extends DataSourceBackend {
	constructor(local, remote=local, ...args) {
		const ds = typeof remote == 'string' ? new DataSourceRestAdmin(remote, ...args) : remote;
		super (local, ds);
	}
}

// export class DataSourceBackendStore extends DataSourceBackend {

// 	#locals;

// 	async search(...params) {

// 		if (!this.#locals) {
// 			const data = await this.local.ls();

// 			this.#locals = new Set(data.map(i = i.id));
// 		}

// 		const data = await this.remote.search(...params);

// 		if (data) {
// 			const added = data.filter(i => !this.#locals.has(i.id)); 

// 		 	await this.local.put(data);
// 		}

// 		return data;
// 	}
// }

export class DataSourceFirebaseBackend extends DataSourceBase {

	#rest;
	#fb;

	get fb() { return this.#fb; }

	constructor(name) {
		super(name);

		this.#rest = new DataSourceRest(name);
		this.#fb = new DataSourceFirebase(name);
	}

	ls(...args) { return this.#fb.ls(...args); }
	get(...args) { return this.#fb.get(...args); }

	put(...args) { return this.#rest.put(...args); }
	search(...args) { return this.#rest.search(...args); }

	rm(id) { return this.#rest.rm(id); }
}

export class DataSourceMulti extends DataSourceBase {

	#sources;

	constructor (...sources) {
		const names = sources.map(i => i.name);
		super(names.join('-'));

		this.#sources = [...sources];
	}

	async ls() {
		let res = [];

		for (const i of this.#sources) {
			const r = await i.ls();
			const ds = i.name;

			for (const j of r) {
				res.push({ ...j, ds });
			}
		}

		return res;
	}
}

export class DataSourceFilter {

	#ds;
	#filter;

	constructor(ds, filter = i => true) {
		this.#ds = ds;
		this.#filter = filter;
	}

	get name() { return this.#ds.name; }

	get(...args) { return this.#ds.get(...args); }
	put(...args) { return this.#ds.put(...args); }
	update(...args) { return this.#ds.update(...args); }

	async ls(...args) {
		const data = await this.#ds.ls(...args);
		return data.filter(this.#filter);
	}

	async search(...args) {
		const data = await this.#ds.search(...args);
		return data ? data.filter(this.#filter) : null;
	}
}

const UpdateDS = new DataSourceDatabase('update');

export class DataSourceUpdate extends DataSourceBackend {

	#update;
	#id;

	constructor(local, remote=local) {
		super(local, remote);

		this.#id = typeof local == 'string' ? local : local.name;
	}

	async ls(offset=0, limit=50) {

		const now = Date.now();

		let update = false, data;

		if (this.#update) {
			
			// todo: check expire 
			if (now - this.#update > 2 * 3600)
				update = true;
		}
		else {
			update = true;
		}

		if (update) {

			this.#update = now;

			const r = await UpdateDS.get(this.#id);

			if (r) {

				const ts = r.ts;

				data = await this.remote.ls(offset, limit, ts);

				if (data.length > 0) {
					await this.local.put(data);
				}

			}

			await UpdateDS.put({ id: this.#id, ts: now });
		}

		data = await super.ls();
		if (data.length == 0) {

			data = await this.remote.ls();

			if (data.length > 0)
				this.local.put(data);
		}

		return data;

	}

}

export class DataSourceCreate extends DataSourceBackend {

	#latest;
	#updated = false;
	
	async ls() {

		const local = this.local;

		let data = await local.ls();

		if (data.length == 0) {

			data = await this.remote.ls();

			await local.put(data);
		}

		return data;
	}
}

export {
	DataSourceRest,
	DataSourceRestAdmin,
	DataSourceDatabase,
	DataSourceDatabaseIndex
}
