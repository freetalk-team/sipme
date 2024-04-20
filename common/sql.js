
const Sequelize = require('sequelize')
	, pako = require('pako')
	// , jsonlint = require("jsonlint")
	;

const Op = Sequelize.Op;



class SqlConnectionBase {

	constructor(db) {
		this.db = db;
		this.tables = {};
	}

	get today() {
		const d = new Date;
		d.setUTCHours(0, 0, 0, 0);
		return d;
	}

	get gte() { return Op.gte; }

	//get date() { return Sequelize.DATE; }

	//set created(b) { this.created = !!b; }
	//set updated(b) { this.created = !!b; }

	//set index(i) { this.index = i; }

	date(n=0) {
		const d = new Date;
		d.setDate(d.getDate() + n);
		d.setUTCHours(0, 0, 0, 0);
		return d;
	}

	defineTable(name, schema, opt={}) {

		const o = {
			// don't add the timestamp attributes (updatedAt, createdAt)
			// timestamps: false,

			// If don't want createdAt
			createdAt: true,

			// If don't want updatedAt
  			updatedAt: false,
		};

		Object.assign(o, opt);

		const table = this.db.define(name, schema, o);

		this.tables[name] = table;
	}


}


class SqlConnectionRead extends SqlConnectionBase {

	init() { }

	async get(table, id) {
		const model = this.tables[table];
		const r = await model.findByPk(id);
	
		let res;
	
		if (r) {
			res = r.dataValues;

			if (res.data && typeof res.data == 'string') {
				res.data = JSON.parse(res.data);
			}
		}
	
		//console.log('Storage get:', res);
	
		return res;
	}

	async tail(table, where, limit=1) {
		const model = this.tables[table];
		const r = await model.findAll({ limit, order: [['createdAt', 'DESC']], where});
	
		let res;
	
		if (r) {
			res = limit == 1 && Array.isArray(r) ? r[0].dataValues : r.map(i => i.dataValues);
		}
	
		// console.log('Storage tail:', table, r, where);
	
		return res;
	}
	
	async find(table, params) {
		const model = this.tables[table];
		//console.debug('DB:', table, model, params);
	
		const r = await model.findOne(params);
		//console.debug('DB:', r);
	
		// return r;
		return r ? r.dataValues : null;
	}
	
	async ls(table, attributes) {
		const model = this.tables[table];

		const params = attributes ? (Array.isArray(attributes) ? { attributes } : attributes) : {};
		const r = await model.findAll(params);
	
		return r.map(i => i.dataValues);
	}
}

class SqlConnection extends SqlConnectionRead {


	init() { return this.db.sync(); }

	create(table, params) {
		const model = this.tables[table];
		// console.debug('SQL insert:', params);
		return model.create(params);
	}
	
	async rm(table, id) {
		const model = this.tables[table];
		return model.destroy({ where: { id }});
	}
	
	createOrUpdate(table, params, ...attr) {

		const model = this.tables[table];

		if (Array.isArray(params)) {
			return model.bulkCreate(params.map(i => buildParams(i, ...attr)), { updateOnDuplicate: ['id'] });
		}

		return model.upsert(buildParams(params, ...attr));
	}
	
}

function buildParams(params, ...attr) {
		if (attr.length == 0) return params;

		const r = {};
		const data = {};

		for (const [k, v] of Object.entries(params)) {
			if (attr.includes(k)) r[k] = v;
			else data[k] = v;
		}

		r.data = data;

		return r;
	}

class SqlStorage {

	static Field = {
		string: function(o={}) { return { type: Sequelize.STRING, ...o }; }
		, integer: function(o={}) { return { type: Sequelize.INTEGER, ...o }; }
		, json: function(o={}) { return { type: Sequelize.JSON, ...o }; }
		, enum: function([values], o={}) { return { type: Sequelize.ENUM, values, ...o }; }
		, blob: function(o={}) { return { type: Sequelize.BLOB('tiny'), ...o }; }
		, boolean(o={}) { return { type: Sequelize.BOOLEAN, ...o }; } 
		, zip() { 
			return { 
				type: Sequelize.BLOB
				, get() {
					console.log('####', this);
					throw new Error('Getter called');
				} 
			}; 
		}
	};

	constructor(remotes) {

		/* 
		{
			app: 'sqlite:///some/path/to/db
			, wiki: 'pg://pg.hostname/db
		}
		*/

		console.log('SQL Loading remote:', remotes);

		const connections = new Map;
		const storage = new Map;

		for (const [name,config] of Object.entries(remotes)) {

			const uri = config.uri;

			const id = uri.hashCode();
			let c = connections.get(id);

			if (!c) {
				const db = new Sequelize(uri, { logging: false });
				c = config.readonly ? new SqlConnectionRead(db) : new SqlConnection(db);
				connections.set(id, c);
			}

			storage.set(name, c);

			const tables = config.tables;
			if (tables) {

				const options = config.options || {};
				for (const [name,schema] of Object.entries(tables)) {

					const opt = options[name] || {};
					const o = { updatedAt: !!opt.update };

					if (opt.index) {
						o.indexes = [ opt.index ];
					}

					// if (opt.created) {
					// 	o.createdAt = opt.created == 'date' ? Sequelize.DATE : true
					// }

					c.defineTable(name, schema, o);
				}
			}
		}

		this.db = storage;
	}

	getRemote(name) { return this.db.get(name); }

	async init() {

		for (const [name, connection] of this.db) {

			try {

				await connection.init();

			}
			catch (e) {
				console.error('SQL failed to init database', name, e);
			}
		}
	}
}


module.exports = SqlStorage;

const kField = SqlStorage.Field;

if (require.main === module) {

	require('./utils');

	(async () => {


	const schema = {
		uri: 'sqlite://:memory:'
		, tables: {
			't1': {
				channel: kField.integer({ allowNull: false })
				, text: kField.string({ defaultValue: 'null' })
			},
			't2': {
				channel: kField.integer({ allowNull: false })
				, text: kField.string({ defaultValue: 'null' })
			}
		}
		, options: {
			't1': { 
				index: { unique: true, fields: ['channel', 'createdAt'] }
			}
		}
	};


	const storage = new SqlStorage({ 'test': schema });
	await storage.init();

	const db = storage.getRemote('test');

	const t1 = new Date;
	t1.setMinutes(t1.getMinutes() - 10);

	// await db.create('t1', { channel: 1, createdAt: today });
	// await db.create('t1', { channel: 1, createdAt: t1 });
	
	await test1(db);
	// await test2(db);
	// await test3();


	})();

}

const print = async (db, table) => {

	const res = await db.ls(table);
	console.table(res);
};

const tail = async (db, table, where, n=1) => {

	const res = await db.tail(table, where, n);
	console.table(Array.isArray(res) ? res : [ res ]);
};



async function test1(db) {

	const today = db.today;
	const yesterday = db.date(-1);
	const tomorow = db.date(1);

	await db.create('t1', { channel: 1, createdAt: today });
	await db.create('t1', { channel: 1, createdAt: yesterday });
	await db.create('t1', { channel: 1, createdAt: tomorow });
	// await db.create('t1', { channel: 2, createdAt: today });

	// await print(db, 't1');
	// await tail(db, 't1', { channel: 1 }, 2);

	await db.createOrUpdate('t1', { channel: 1, createdAt: today, text: 'hi there' });
	await db.createOrUpdate('t1', { channel: 2, createdAt: today, text: 'foo' });
	await print(db, 't1');
}

async function test2(db) {
	await db.create('t2', { channel: 1, createdAt: new Date, text: 'pla' });
	await db.create('t2', { channel: 2464123941, text: 'bla' });

	await print(db, 't2');
}

async function test3() {

	const schema = {
		uri: 'sqlite:///ssd/data/sqlite/scraper.db'
		// uri: 'sqlite://:memory:'
		, tables: {
			'update': {
				channel: kField.integer({ allowNull: false })
				, content: kField.blob() 
			}
		}
	};

	const storage = new SqlStorage({ 'test': schema });
	await storage.init();

	const db = storage.getRemote('test');


	await db.create('update', { channel: 2464123941, content: Buffer.from([1,2,3]) });
}