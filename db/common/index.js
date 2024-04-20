
function createIndex(sequelize, ...args) {
	
	const dialect = sequelize.options.dialect;

	switch (dialect) {

		case 'sqlite':
		return createIndexSqlite(sequelize, ...args);

		case 'pg':
		case 'postgres':
		return createIndexPg(sequelize, ...args);
	}
}

function deleteIndex(sequelize, ...args) {
	const dialect = sequelize.options.dialect;

	switch (dialect) {

		case 'sqlite':
		return deleteIndexSqlite(sequelize, ...args);

		//case 'pg':
		//return createIndexPg(sequelize, ...args);
	}
}

function search(sequelize, Model, Table, SearchTable) {
	//console.log('Login search:', query);

	const dialect = sequelize.options.dialect;

	switch (dialect) {

		case 'sqlite':
		return function(query, attr, offset=0, limit=20) {

			const q = `select ${attr ? attr.join(',') : '*'} from ${Table} where rowid in (select rowid from ${SearchTable} where ${SearchTable} = '${query}' order by rank limit ${limit} offset ${offset})`;
	
			// console.log(q);
			return sequelize.query(q, Model);
		}

		case 'pg':
		case 'postgres':
		return function(query, attr, offset=0, limit=20) {
			const vector = 'search';

			// query = sequelize.getQueryInterface().escape(query);
			// console.log(query);

			//const q = 'SELECT * FROM "' + table + '" WHERE "' + vector + '" @@ plainto_tsquery(\'english\', \'' + query + '\')';
			const q = `SELECT ${attr ? attr.join(',') : '*'} FROM "${Table}" WHERE "${vector}" @@ plainto_tsquery('english', '${query}') ORDER BY "${vector}" LIMIT ${limit} OFFSET ${offset}`;

			// console.log(q);
			
			return sequelize.query(q, Model);
		}

	}
}

async function createIndexSqlite(sequelize, table, fields, view=table) {
	const searchTable = table + '_fts';

	await sequelize.query(`CREATE VIRTUAL TABLE ${searchTable} USING fts5(${fields.join(',')}, content=${view})`);
	await sequelize.query(`CREATE TRIGGER ${searchTable}_insert AFTER INSERT ON ${table} BEGIN INSERT INTO ${searchTable} (rowid,${fields.join(',')}) VALUES (new.rowid,${fields.map(i => 'new.' + i)}); END`);
	await sequelize.query(`CREATE TRIGGER ${searchTable}_update AFTER UPDATE ON ${table} BEGIN UPDATE ${searchTable} SET ${fields.map(i => i + '=' + 'new.' + i).join(',')} where rowid=new.rowid; END`);
}


async function deleteIndexSqlite(sequelize, table) {
	const searchTable = table + '_fts';

	await sequelize.query(`DROP TRIGGER ${searchTable}_insert`); 
	await sequelize.query(`DROP TRIGGER ${searchTable}_update`);
	
	await sequelize.query(`DROP TABLE ${searchTable}`);
}

async function createIndexPg(sequelize, table, fields, view=table) {

	const kVector = 'search';
	const kRank = ['A', 'B', 'C', 'D'];
	const kIndex = `${table}_search_idx`;
	const kTrigger = `${table}_tsvector_trigger`;
	const kQuery = fields.map((name,i) => `setweight(to_tsvector(new.${name}), '${kRank[i]}')`).join(' || ')

	await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${kVector} TSVECTOR`);
	await sequelize.query(`CREATE FUNCTION ${kTrigger}() RETURNS trigger AS $$ BEGIN new.search = ${kQuery}; return new; END $$ LANGUAGE plpgsql`);
	await sequelize.query(`CREATE TRIGGER np_vector_update BEFORE INSERT OR UPDATE ON "${table}" FOR EACH ROW EXECUTE PROCEDURE ${kTrigger}()`);
	await sequelize.query(`CREATE INDEX ${kIndex} ON "${table}" USING gin("${kVector}")`);
}

module.exports = {
	createIndex, deleteIndex,
	search
}