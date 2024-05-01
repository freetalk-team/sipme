const Sequelize = require('sequelize');
const { join } = require('path');

const Op = Sequelize.Op;

class Database {

	#db;

	// get currdate() {
	// 	return sequelize.fn('currdate');
	// }

	get today() { return this.latest(); }
	get string() { return Sequelize.STRING; }
	get json() { return Sequelize.JSONB; }
	get binary() { return Sequelize.STRING.BINARY; }
	get int() { return Sequelize.INTEGER; }
	get enum() { return Sequelize.ENUM; } 
	get date() { return Sequelize.DATE; }
	get now() { return Sequelize.NOW; }
	get id() { return { type: Sequelize.INTEGER, primaryKey: true } }
	get ids() { return { type: Sequelize.STRING(32), primaryKey: true } }

	get dialect() { return this.#db.sequelize.options.dialect; }
	get dialectSupports() { return this.#db.sequelize.dialect.supports; }
	get generator() { return this.#db.sequelize.queryInterface.queryGenerator; }

	constructor(dbname) {
		if (dbname) 
			this.init(dbname);
	}

	createdAt(table) {
		const name = this.#db[table]._timestampAttributes.createdAt;
		console.debug('DB createdAt', table, name);
		return name;
	}
	
	literal(s) { return Sequelize.literal(s); }
	distinct(col) { return Sequelize.literal(`DISTINCT ${col}`); }
	coalesce(col, value='') { return Sequelize.fn('COALESCE', Sequelize.col(col), value); }
	model(table) { return this.#db[table]; }

	latest(date=Date.today()) {
		return { 
			createdAt: { 
       	 		[Op.gt]: date,
        		//[Op.lt]: NOW
			}
		}
	}


	updated(ts) {
		return { 
			updated: { 
       	 		[Op.gt]: ts,
        		//[Op.lt]: NOW
			}
		}
	}

	regexp(re) {
		return {
			[Op.regexp]: re,
		};
	}

	or(...conds) {
		return {
			[Op.or]: conds
		};
	}

	and(...conds) {
		return {
			[Op.and]: conds
		};
	}

	in(...values) {
		return {
			[Op.in]: values
		};
	}

	eq(value) {
		return {
			[Op.eq]: value
		}
	}
	 
	gt(value) {
		return {
			[Op.gt]: value
		}
	}

	ne(value) {
		return {
			[Op.ne]: value
		}
	}

	lt(value) {
		return {
			[Op.lt]: value
		}
	}

	like(value) {
		return {
			[Op.like]: value
		}
	}

	attributes(table, ...ignore) {
		const model = this.#db[table];
		const attr = model.getAttributes();
		const all = Object.keys(attr);
		const filter = new Set(ignore);

		return all.filter(i => !filter.has(i));
	}

	is(dialect) {
		
		switch (dialect) {
			case 'pg':
			dialect = 'postgres';
			break;
		}

		return this.dialect == dialect;
	}

	info(table, data, col='info', ...exclude) {
		const attr = this.attributes(table, col);
		const r = { ...data };

		attr.push(...exclude);

		for (const k of Object.keys(r)) {
			if (!r[k] || attr.includes(k))
				delete r[k];
		}

		return r;
	}

	async init(dbname, path='@db') {
		const p = join(path, dbname, 'models');
		// console.debug('DB path:', p);
		this.#db = require(p);

		if (this.dialect == 'sqlite') {
			this.dialectSupports.returnValues = { returning: true };

			this.increment = async (table, attr, id, by=1, returning=false, plain=!!returning) => {

				// Hack: SQLite supports returning but Sequelize dialect not
				if (returning) {
		
					const where = typeof id == 'object' ? id : { id };
		
					const incrementAmountsByField = {};
					incrementAmountsByField[attr] = by;
		
					const extraAttributesToBeUpdated = {};
					const updatedAtAttr = this.#db[table]._timestampAttributes.updatedAt;
		
					if (updatedAtAttr)
						extraAttributesToBeUpdated[updatedAtAttr] = new Date;

					const sql = this.generator.arithmeticQuery('+', table, where, incrementAmountsByField, extraAttributesToBeUpdated, { returning, plain
					});
		
					const r = await this.query(sql);
					// console.debug('# RES:', r);
		
					return [r, r.length];
				}
		
				return this.#increment(table, attr, id, by, returning, plain);
			}
		}
	}	

	sync(force=true) {
		return this.#db.sequelize.sync({ force });
	}

	sqlite(path, logging=false) {

		const sequelize = new Sequelize(
			"test",
			process.env.USER,
			process.env.PASSWORD,
			{
			  dialect: "sqlite",
			  // Data is stored in the file `database.sqlite` in the folder `db`.
			  // Note that if you leave your app public, this database file will be copied if
			  // someone forks your app. So don't use it to store sensitive information.
			  storage: path,
			  logging
		});

		this.#db = { Sequelize, sequelize };
	}

	addModel(name, model, timestamps=false, updated=false, created=false) {

		const params = { tableName: name };

		if (timestamps) {
		 	params.createdAt = created;
		 	params.updatedAt = updated;
		}

		const Model = this.#db.sequelize.define(name, model, params);

		if (name.startsWith('_'))
			name = name.slice(1);

		this.#db[name] = Model;

		return Model;
		// return Model.sync({ force: true });
	}

	createTrigger(...args) {
		createTrigger(this.#db.sequelize, ...args);
	}

	async get(table, id, attributes) {
		const model = this.#db[table];
		const opt = attributes ? { attributes } : null;
		const r = await model.findByPk(id, opt);

		let res;

		if (r) {
			res = r.dataValues;
			//res.data = JSON.parse(res.data);
		}

		// console.log('Storage get:', res);

		return res;
	}

	async find(table, params, attr) {
		const model = this.#db[table];
		//console.debug('DB:', table, model, params);

		if (typeof params != 'object')
			params = { where: { id: params } };

		if (attr)
			params.attributes = attr;

		const r = await model.findOne(params);
		//console.debug('DB:', r);

		return r ? r.dataValues : null;
	}

	async rm(table, id) {
		const model = this.#db[table];
		const where = typeof id == 'object' ? id : { id };

		return model.destroy({ where});
	}

	async ls(table, params={}) {
		const model = this.#db[table];
		const where = params.where;

		// if (where) {
		// 	const created = model._timestampAttributes.createdAt;

		// 	if (where[created]) {
		// 		const ts = parseInt(where[created]);
		// 		where[created] = { [Op.gt]: new Date(ts) };
		// 	}
		// }

		let r = await model.findAll(params);
		
		return r.map(i => i.dataValues);
	}

	async tail(table, where, limit=1) {
		const model = this.#db[table];

		console.debug(model);

		const params = { limit, order: [['createdAt', 'DESC']] };
		if (where)
			params.where = where;

		const r = await model.findAll(params);
	
		let res;
	
		if (r && r.length > 0) {
			res = limit == 1 ? r[0].dataValues : r.map(i => i.dataValues);
		}
	
		// console.log('Storage tail:', table, r, where);
	
		return res;
	}

	async query(sql) {
		const r = await this.#db.sequelize.query(sql);
		//console.debug('##', r);

		if (Array.isArray(r) && r.length > 0) {
			return r[0];
		}

		return [];
	}

	async findOrCreate(table, params) {
		const r = await this.#db[table].findOrCreate(params);
		return r[0].dataValues;
	}

	createOrUpdate(table, params, ...attr) {

		console.debug(params);

		const model = this.#db[table];

		let data;

		if (Array.isArray(params)) {
			data = params.map(i => buildParams(i, ...attr));
		}
		else {
			data = [ buildParams(params, ...attr) ];
		}

		const keys = Object.keys(Array.isArray(params) ? params[0] : params);

		const updateOnDuplicate = attr.length > 0 
			? [...attr] 
			: keys.filter(i => i != 'id');

		console.debug('CREATE OR UPDATE:', updateOnDuplicate);

		return model.bulkCreate(data, { updateOnDuplicate });
	}

	async upsert(table, params, fields=[]) {
		const model = this.#db[table];
		const attrs = Object.keys(model.getAttributes());
		// const [record, created]
		const [r] = await model.upsert(buildParams(params, ...attrs), { returning: true, fields });
		console.debug('DB upsert:', r);

		const data = r.dataValues;

		// not working with PG
		// const created = r.isNewRecord;
		const created = data.created.getTime() == data.updated.getTime();

		return [ data, created ];
	}

	create(table, params) {
		const model = this.#db[table];
		return model.create(params);
	}

	update(table, id, data, returning=false, plain=!!returning) {
		const model = this.#db[table];
		const where = typeof id == 'object' ? id : { id };

		return model.update(data, { where, returning, plain /*, forceTimestamps: true*/ });
	}

	async search(table, text, attr) {
		const model = this.#db[table];
		const [res, matches] = await model.search(text, attr);
		//console.log('# MATCHES', matches);
		// return matches.rows;
		return res;
	}

	async increment(table, attr, id, by=1, returning=false, plain=!!returning) {
		return this.#increment(table, attr, id, by, returning, plain);
	}

	#increment(table, attr, id, by=1, returning, plain) {

		const model = this.#db[table];
		const where = typeof id == 'object' ? id : { id };

		return model.increment(attr, { by, where, returning, plain });
	}
}

function buildParams(params, ...attr) {
	if (attr.length == 0) return params;

	const r = {};
	const data = {};

	attr.push('id');

	for (const [k, v] of Object.entries(params)) {
		if (attr.includes(k)) r[k] = v;
		else data[k] = v;
	}

	r.data = data;

	return r;
}



function createAppDatabase() {
	const db = new Database;

	db.init('app');
	return db;
}


module.exports = {
	createAppDatabase,
	Database
}

// on: lowercase 'insert', 'delete' or 'update'
async function createTrigger(sequelize, model, on, action, { after, when, nameExtra } = {}) {
	if (after === undefined) {
	  after = 'AFTER'
	}
	if (nameExtra) {
	  nameExtra = `_${nameExtra})`
	} else {
	  nameExtra = ''
	}
	const oldnew = on === 'delete' ? 'OLD' : 'NEW'
	const triggerName = `${model.tableName}_${on}${nameExtra}`
	if (when) {
	  when = `\n  WHEN (${when})`
	} else {
	  when = ''
	}
	if (sequelize.options.dialect === 'postgres') {
	  const functionName = `${triggerName}_fn`
	  await sequelize.query(`CREATE OR REPLACE FUNCTION "${functionName}"()
	RETURNS TRIGGER
	LANGUAGE PLPGSQL
	AS
  $$
  BEGIN
	${action};
	RETURN ${oldnew};
  END;
  $$
  `)
	  // CREATE OR REPLACE TRIGGER was only added on postgresql 14 so let's be a bit more portable for now:
	  // https://stackoverflow.com/questions/35927365/create-or-replace-trigger-postgres
	  await sequelize.query(`DROP TRIGGER IF EXISTS ${triggerName} ON "${model.tableName}"`)
	  await sequelize.query(`CREATE TRIGGER ${triggerName}
	${after} ${on.toUpperCase()}
	ON "${model.tableName}"
	FOR EACH ROW${when}
	EXECUTE PROCEDURE "${functionName}"();
  `)
	} else if (sequelize.options.dialect === 'sqlite') {
	  await sequelize.query(`
  CREATE TRIGGER IF NOT EXISTS ${triggerName}
	${after} ${on.toUpperCase()}
	ON "${model.tableName}"
	FOR EACH ROW${when}
	BEGIN
	  ${action};
	END;
  `)
	}
  }

/*

select article.domain,title from article inner join channel on article.domain=channel.domain where channel.id=963608382;

# remove JSON key (pg)
update scraper set info = info::jsonb - 'state';

# select JSON key (sqlite)
select updated,id,name,state,length(content),json_extract(info,'$.state') from scraper;
update scraper set info = json_remove(info, '$.state');

# update as select with rating
update _update set rating = rating + 1 where id='scraper' returning *;

# select most read
select id,rating from item where created > '2024-01-15' order by rating desc limit 10;
select id,title from channel_item where channel='-NRqIjScrSjpJmjKr01p' and created > '2024-01-15' order by rating desc limit 10;

# select by region
select id,title,rating from region_item where region='bg' and created > '2024-01-15' order by rating desc limit 10;

# select most rated channels 
select distinct channel,SUM(rating) OVER(PARTITION BY channel) as rating_total from channel_item;
select distinct channel,name,SUM(rating) OVER(PARTITION BY channel) as total from channel_item join channel as t on channel=t.id order by total desc;

# select most rated by region
select distinct region,sum(total) OVER(PARTITION BY region) as country from channel_rating;

# select for last week
select count(*) from item where created >= DATE(NOW()) - '7 days'::interval;

# select from external databse
select * from dblink('dbname=app hostaddr=127.0.0.1 user=root','SELECT id FROM scraper') as t(id text);

# insert update from external db
insert into scraper (id,name,info,tags,content) select * from dblink('dbname=app hostaddr=127.0.0.1 user=root','SELECT id,name,info,tags,content FROM scraper') as t(id varchar(32), name varchar(255), info jsonb, tags varchar(255), content bytea) on conflict (id) do update set info=excluded.info, tags=excluded.tags, content=excluded.content;

insert into channel (id,name,info) select id,name,info from dblink('dbname=app hostaddr=127.0.0.1 user=root','SELECT id,name,type,info FROM channel') as t(id varchar(32), name varchar(255), type varchar(32), info jsonb) where t.type='news' on conflict (id) do update set info=excluded.info;

# slqite substr
select substr(substr(substr(room,1, instr(room,'@') - 1), 5), 6) name, substr(room, instr(room,'@') + 1) domain from member;

create view member_room as select substr(substr(room,1, instr(room,'@') - 1), 5) name, substr(room, instr(room,'@') + 1) dom, room from member;

select * from member_room inner join room on member_room.name=room.name and member_room.dom=room.domain where dom='ftalk.eu' and member_room.name='chat-support';

select json_insert((select members from room inner join member_room on domain=dom and room.name=member_room.name where room='sip:chat-support@ftalk.eu'), '$[#]', 5);




select name,domain, 'sip:' || name || '@' || domain as uri from room;

create view room_uri as select id,'sip:' || name || '@' || room.domain as uri from room;
select id,uri,(select json_group_array(username) from member where room=uri) from room_uri;


create view member_room as select member.id,username,member.domain,room,room_uri.id as rid from member inner join room_uri on room=room_uri.uri;

delete from member where id=(select id from member_room where rid=15);
*/
