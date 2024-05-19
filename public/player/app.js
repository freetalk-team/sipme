
import { CommandMixin } from '../app/command.js';
import { RecentMixin } from '../app/recent.js';

import { Database as DatabaseBase } from '../database.js';

import '../editor/player/index.js';

import PlayerPage from '../sidebar/player/page.js';



export class PlayerApp extends App {

	constructor() {
		const container = document.getElementById('app-page');

		super(container);
	}

	createDatabase() {
		return new Database;
	}

	setupDatabase(db) {
	}

	async load() {
		console.log('APP: on load');

		this.initDataSource();
		this.startLifecycle();

		await super.load();

		this.sidebar.open('player', 'files');
		this.openEditor('player', 'files');
	}

	initDataSource() {
		this.addDS(new App.DataSource.Database('playlist'));
		this.addDS(new App.DataSource.Database('radio'));
	}


	async add(type, info, action='import') {

		const ds = app.ds(type);

		let id, add = false;

		if (typeof info == 'string') {
			id = info;
			info = await ds.get(id);

			if (!info) {
				console.error('Failed to', action, type, id);
				return;
			}
		}
		else {
			id = info.id;
		}


		try {
			// info.id = info.id || info.email.hashCode();


			switch (action) {

				case 'import': {

					

					let update = true;

					if (update) {

						info.remote = undefined;
						ds.update(info, action);
					}
				}
				break;

				default:
				add = true;
				break;

			}

			let update = ['update', 'edit'].includes(action);

			if (add) {
				// await this.firebase.set('user', this.uid, 'private', type, id, false);
				if (ds) {
					// update = false;
					await ds.put(info, update);
				}
			}

			console.log('APP: add', type, info);

			super.add(type, info, update);

		} catch(e) {
			console.error('APP: failed to add =>', type, e);
		}

		return info.id;
	}

}

Object.assign(App.prototype
	, CommandMixin
	, RecentMixin
);

App.Sidebar.register(PlayerPage);

class Database extends DatabaseBase {

	#first = true;

	get version() { return this.#first ? 1 : super.version; }
	get isSetup() { return false; }

	async init() {

		do {
			try {

				await super.init();

			} 
			catch (e) {
				if (this.#first) {

					console.log('Database version mismatch');

					this.#first = false;
					continue;
				}
				else {
					throw e;
				}

			}

			break;

		} while (true);
	}

	onUpgrade(db, txn, ver) {

		switch (ver) {
		
			case 0:
			this.addCommonTables(db, txn);
			break;
		}
	}

	updateHistory() { }
}