
export class IndexDB {

	#setup = false;

	get name() { return 'app'; }
	get version() { return 1; }
	get isSetup() { return this.#setup; }

	// public
	async init() {
		if (!window.indexedDB) {
			console.log('Your browser doesn\'t support IndexedDB');
			throw new Error('IndexDB is not supported');
		}

		this.db = await this.#openDatabase();

		if (this.isSetup) {
			this.setup();
		}

		//app.on('datechange', () => this.updateHistory());
	}

	setup() {}

	ls(table, desc=false, offset=0, limit=100) { return this.#getAll(getTable(table), desc, offset, limit); }
	tail(table, offset=0, limit=50) { return this.#getAll(getTable(table), true, offset, limit); }
	lsByIndex(table, index, value, desc=false, limit=30, offset=0) { return this.#getAllByIndex(getTable(table), index, value, offset, limit, desc); }
	lsByRating(table, offset, limit) { return this.#getAllBy(getTable(table), 'rating', offset, limit, true); }
	lsByRange(table, index, start, end, desc=false, limit=50) { return this.#getByRange(getTable(table), index, start, end, desc, limit); }

	count(table) { return this.#count(getTable(table)); }

	// insert/update single record
	put(table, data) { return IndexDB.put(this.db, getTable(table), data); }
	update(table, ...args) { return this.#update(getTable(table), ...args); }
	updateByIndex(table, ...args) { return this.#updateByIndex(getTable(table), ...args); }
	push(table, ...args) { return this.#push(getTable(table), ...args); }

	get(table, id) { return this.#getById(getTable(table), id); }
	rm(table, id) { return this.#rm(getTable(table), id); }
	rmByIndex(table, index, id) { return this.#rmByIndex(getTable(table), index, id); }

	pushValue(table, id, key, value) { return this.#pushValue(getTable(table), id, key, value); }
	pushValueByIndex(table, index, id, key, value) { return this.#pushValueByIndex(getTable(table), index, id, key, value); }
	deleteValue(table, ...args) { return this.#deleteValue(getTable(table), ...args); }
	deleteValueByIndex(table, ...args) { return this.#deleteValueByIndex(getTable(table), ...args); }

	// add one or multiple records
	add(table, data) { return this.#add(getTable(table), data); }

	getById(id) { return this.#getById(kContact, id); }

	getByEmail(email) { return this.#getByIndex(kContact, 'email', email); } 
	getByIndex(table, index, val) { return this.#getByIndex(table, index, val); } 

	// private
	#openDatabase() {

		const name = this.name;
		const version = this.version;

		return new Promise((resolve, reject) => {
	
			// const request = upgrade ? indexedDB.open('app', kVersion) : indexedDB.open('app');
			const request = indexedDB.open(name, version);
		
			request.onerror = (event) => {
				console.error(`Database error: ${event.target.errorCode}`);
				reject(event.target.errorCode);
			};
			
			request.onsuccess = (event) => {
				const db = event.target.result;
				resolve(db);
		
				// if (!upgrade) {
		
				// 	const ver = db.version ? parseInt(db.version) : 0;
		
				// 	if (ver < kVersion) {
				// 		db.close();
				// 		// needs upgrade
						
				// 		doOpenDatabase(resolve, reject, true);
				// 		return;
				// 	}
				// 	else {
				// 		resolve(db);
				// 	}
				// }
			};
		
			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				const txn = event.target.transaction;
				const ver = event.oldVersion;

				this.onUpgrade(db, txn, ver);

				if (ver == 0) {
					this.#setup = true;
				}
		
			}
		});
	}
	
	#getAllByIndex(table, index, value, offset=0, limit=50, desc=false) {

		// console.log('Loading history:', offset);

		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			const key = value ? IDBKeyRange.only(value) : IDBKeyRange.lowerBound(0);
			const idx = store.index(index);
			const request = idx.openCursor(key, desc ? 'prev' : 'next')

			let moved = offset == 0;
			let count = 0;
			let ts;

			const r = [];

			request.onsuccess = (event) => {


				const c = event.target.result;
				//console.log(c);

				if (c) {

					//console.log('### CURSOR');

					if (!moved) {
						moved = true;
						c.advance(offset);
					}
					else {

						const i = c.value;

						r.push(i);
						count++;

						if (count < limit) {
							c.continue();
						}
						else {
							resolve(r);
						}

					}
					
				} else {
					resolve(r);
				}

				
			};

			request.onerror = e => {
				reject(e);
			}
		});
	}

	addOne(table, data) {

		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);

			// console.log('IndexDB: adding new entry =>', table, data);
			let query = store.add(data);

			// handle success case
			query.onsuccess = resolve;

			// handle the error case
			query.onerror = reject;

			// close the database once the 
			// transaction completes
			// txn.oncomplete = function () {
			// 	db.close();
			// };
		});
	}

	#rm(table, id) {

		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);

			// console.log('IndexDB: adding new entry =>', table, data);
			let query = id ? store.delete(id) : store.clear();

			// handle success case
			query.onsuccess = function (event) {
				// console.log(event);
				resolve();
			};

			// handle the error case
			query.onerror = function (event) {
				console.log(event.target.errorCode);
				reject(event.target.errorCode);
			}
		});
	}

	#rmByIndex(table, index, id) {

		return new Promise((resolve, reject) => {

			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);
			const idx = store.index(index);
			
			const cur = idx.openCursor(id);

			// cur.onerror = reject;
			cur.onerror = resolve;
			cur.onsuccess = event => {

				const cursor = event.target.result;

				if (!cursor) {
					resolve();
					return;
				}

				const req = cursor.delete();

				//req.onerror = reject;
				//req.onsuccess = resolve;

				cursor.continue();
			}

		});
	}

	#add(table, data) {
		// create a new transaction
		const txn = this.db.transaction(table, 'readwrite');

		// get the Contacts object store
		const store = txn.objectStore(table);


		if (!Array.isArray(data)) data = [ data ];

		console.log('IndexDB: adding new entries =>', table, '\n', data.map(i => i.id));

		const promises = [];
		for (const i of data) 
			promises.push(new Promise((resolve, reject) => {
			

				let query = store.add(i);

				// handle success case
				query.onsuccess = function (event) {
					// console.log(event);
					resolve();
				};

				// handle the error case
				query.onerror = reject;

				// close the database once the 
				// transaction completes
				// txn.oncomplete = function () {
				// 	db.close();
				// };
			}));

		return Promise.all(promises);
	}

	#update(table, id, data, init={}) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);

			const cursor = store.openCursor(IDBKeyRange.only(id));

			cursor.onsuccess = (event) => {
				const cursor = event.target.result;
				let query;

				if (cursor) {

					const value = Object.assign(cursor.value, data);
					Object.deleteUndefined(value);

					query = cursor.update(value);
				}
				else {
					const value = { id, ...init, ...data};
					// console.log('INDEX update new:', value);

					query = store.add(value);
				}
				
				query.onsuccess = function (event) {
					// console.log(event);
					resolve();
				};
	
				// handle the error case
				query.onerror = reject;
			}

			cursor.onerror = reject;

		});
	}

	#updateByIndex(table, index, key, data, init={}) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);

			const idx = store.index(index);
			// query by indexes
			//const query = i.get(value);

			const cursor = idx.openCursor(key);

			cursor.onsuccess = (event) => {
				const cursor = event.target.result;
				let query;

				if (cursor) {

					const value = Object.assign(cursor.value, data);
					Object.deleteUndefined(value);

					query = cursor.update(value);
				}
				else {
					const value = { ...init, ...data};

					// console.log('INDEX update new:', value);

					query = store.add(value);
				}
				
				query.onsuccess = function (event) {
					// console.log(event);
					resolve();
				};
	
				// handle the error case
				query.onerror = reject;
			}

			cursor.onerror = reject;

		});
	}

	#pushValue(table, id, key, value) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);
			const cursor = store.openCursor(IDBKeyRange.only(id));

			pushValue(key, value, cursor, resolve, reject);
		});
	}

	#pushValueByIndex(table, index, id, key, value) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);
			const idx = store.index(index);
			
			const cursor = idx.openCursor(id);

			pushValue(key, value, cursor, resolve, reject);
		});
	}

	#deleteValue(table, id, key, value) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);
			const cursor = store.openCursor(IDBKeyRange.only(id));

			deleteValue(key, value, cursor, resolve, reject);

		});
	}

	#deleteValueByIndex(table, index, id, key, value) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);
			const idx = store.index(index);
			
			const cursor = idx.openCursor(id);

			deleteValue(key, value, cursor, resolve, reject);

		});
	}

	#push(table, id, child, data) {
		return new Promise((resolve, reject) => {
			// create a new transaction
			const txn = this.db.transaction(table, 'readwrite');

			// get the Contacts object store
			const store = txn.objectStore(table);

			const cursor = store.openCursor(IDBKeyRange.only(id));

			cursor.onsuccess = (event) => {
				const cursor = event.target.result;
				let query;

				if (!cursor) return reject('Appending to non-existing record');
				
				const v = cursor.value;
				if (v[child])
					v[child].push(data);
				else
					v[child] = [data];

				if (v.ts)
					v.ts = Date.seconds();

				query = cursor.update(v);

				query.onsuccess = function (event) {
					console.log(event);
					resolve();
				};
	
				// handle the error case
				query.onerror = function (event) {
					console.log(event.target.errorCode);
					reject(event.target.errorCode);
				}
			}

			cursor.onerror = reject;

		});
	}

	#getById(table, id) {
		// console.log('CONTACT: getById =>', table, id);

		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			let query = store.get(id);

			query.onsuccess = (event) => {
				if (!event.target.result) {
					console.log(`IndexDB: ${id} not found in ${table}`);
					// reject();
					resolve(null);
				} else {
					// console.table(event.target.result);
					resolve(event.target.result);
				}
			};

			query.onerror = reject;

		});
	}

	#getByIndex(table, index, value) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			// get the index from the Object Store
			const i = store.index(index);
			// query by indexes
			let query = i.get(value);

			// return the result object on success
			query.onsuccess = (event) => {
				// console.table(query.result); // result objects
				resolve(query.result);
			};

			query.onerror = reject;

			// close the database connection
			// txn.oncomplete = function () {
			// 	db.close();
			// };
		});
	}

	#getAll(table, desc, offset, limit) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, "readonly");
			const store = txn.objectStore(table);

			const res = [];
			const request = store.openCursor(null, desc ? 'prev' : 'next');

			let count = 0;

			request.onsuccess = (event) => {
				let cursor = event.target.result;
				if (cursor) {
					let i = cursor.value;
					//console.log(contact);
					res.push(i);
					// continue next record

					if (++count < limit) {
						cursor.continue();
					}
					else {
						resolve(res);
					}
				}
				else {
					// console.log('IndexDB:', table, '=>', res);
					resolve(res);
				}
			};

			request.onerror = reject;
			// close the database connection
			// txn.oncomplete = function () {
			// 	db.close();
			// };
		});
	}

	#getAllBy(table, index,  offset=0, limit=50, desc=false) {

		// console.log('DB: get by rating request', offset);

		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			const key = IDBKeyRange.lowerBound(0);

			const idx = store.index(index);
			const request = idx.openCursor(key, desc ? 'prev' : 'next');

			let moved = offset == 0;
			let count = 0;

			const r = [];

			request.onsuccess = (event) => {


				const c = event.target.result;
				//console.log(c);

				if (c) {

					//console.log('### CURSOR');

					if (!moved) {
						moved = true;
						c.advance(offset);
					}
					else {

						const i = c.value;

						r.push(i);
						count++;

						if (count < limit) {
							c.continue();
						}
						else {
							resolve(r);
						}

					}
					
				} else {
					resolve(r);
				}

				
			};

			request.onerror = reject;
		});
		
	}

	#getByRange(table, index, start, end, desc=false, limit=50) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			let key;
			if (!start)
				key = IDBKeyRange.upperBound(end, true); // < y
			else if (!end)
				key = IDBKeyRange.lowerBound(start); // >= x
			else
				key = IDBKeyRange.bound(start, end, false, true); // >= x && < y

			const idx = store.index(index);
			const request = idx.openCursor(key, desc ? 'prev' : 'next');

			const r = [];

			let count = 0;

			request.onsuccess = (event) => {

				let cursor = event.target.result;
				if (cursor) {
					let i = cursor.value;
					//console.log(contact);
					r.push(i);

					if (++count < limit) {
						// continue next record
						cursor.continue();
					}
					else {
						resolve(r);
					}
				}
				else {
					resolve(r);
				}
			};

			request.onerror = reject;
		});
	}

	#count(table) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			const request = store.count();

			request.onsuccess = (event) => {
				const c = event.target.result;
				resolve(c);
			}

			request.onerror = reject;
		});

	}

	#clear(table) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readonly');
			const store = txn.objectStore(table);

			const request = store.clear();

			request.onsuccess = () => resolve();
			request.onerror = reject;
		});
	}

	delete(table, index, start, end) {
		return new Promise((resolve, reject) => {
			const txn = this.db.transaction(table, 'readwrite');
			const store = txn.objectStore(table);

			let key, request;

			if (index) {

				if (start == end)
					key = IDBKeyRange.only(start);
				else if (!start)
					key = IDBKeyRange.upperBound(end, true); // < y
				else if (!end)
					key = IDBKeyRange.lowerBound(start); // >= x
				else
					key = IDBKeyRange.bound(start, end, false, true); // >= x && < y

				

				const idx = store.index(index);
				request = idx.openCursor(key);
			}
			else {
				request = store.openCursor();
			}

			request.onsuccess = (event) => {
				let cursor = event.target.result;
				if (cursor) {
					cursor.delete();
					cursor.continue();
				}
				else {
					resolve();
				}
			}
			
			request.onerror = reject;
		});
	}

	static put(db, table, data) {

		// create a new transaction
		const txn = db.transaction(table, 'readwrite');
	
		// get the Contacts object store
		const store = txn.objectStore(table);
	
	
		if (!Array.isArray(data)) data = [ data ];
	
		const promises = [];
		for (const i of data) 
			promises.push(new Promise((resolve, reject) => {
	
				let query = store.put(i);
	
				// handle success case
				query.onsuccess = function (event) {
					resolve();
				};
	
				// handle the error case
				query.onerror = reject;
			}));
	
		return Promise.all(promises);
	}
}

function pushValue(key, value, cursor, resolve, reject) {

	cursor.onsuccess = (event) => {
		const cursor = event.target.result;
		let query;

		if (cursor) {

			const data = cursor.value;

			if (!data[key])
				data[key] = [];

			if (Array.isArray(value)) data[key].push(...value);
			else data[key].push(value);


			query = cursor.update(data);

			query.onsuccess = resolve;
			query.onerror = reject;
		}
		else {
			resolve();
		}
		
		
	}

	cursor.onerror = reject;
}

function deleteValue(key, value, cursor, resolve, reject) {

	cursor.onsuccess = (event) => {
		const cursor = event.target.result;
		let query;

		if (cursor) {

			const data = cursor.value;
			const item = data[key];

			if (Array.isArray(item) && value) {
				data[key] = item.filter(i => i != value);
			}
			else {
				delete data[key];
			}

			query = cursor.update(data);

			query.onsuccess = function (event) {
				// console.log(event);
				resolve();
			};

			// handle the error case
			query.onerror = reject;
		}
		else {
			resolve();
		}
		
		
	}

	cursor.onerror = reject;
}

function getTable(table) {

	switch (table) {

	 	case 'article':
	 	return 'news';
	}

	return table;
}

export function addTable(db, name, autoIncrement=false, keyPath='id') {
	const opt = { keyPath, autoIncrement };
	db.createObjectStore(name, opt);
}

export function deleteTable(db, name) {
	db.deleteObjectStore(name);
}

export function addIndex(table, index, txn, unique=false, name=index) {
	// get the Contacts object store
	const store = txn.objectStore(table);
	store.createIndex(name, index, { unique });
}

export function deleteIndex(table, index, txn) {
	// get the Contacts object store
	const store = txn.objectStore(table);
	store.deleteIndex(index);
}

/*

IDBKeyRange.bound( [2,0], [3,0], false, true);

*/