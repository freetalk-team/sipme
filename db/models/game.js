'use strict';
const {
	Model
} = require('sequelize');

const kVector = 'search';
const kTable = 'game';
const kModel = 'Game';

module.exports = (sequelize, DataTypes) => {
	class Game extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

			Game.search = (query, attr, ...args) => {

				let offset=0, limit=20, where;

				if (args.length > 0) {

					let a = args.shift();
					if (typeof a == 'object') {
						where = a;
						a = args.shift();
					}

					offset = a || 0;
					limit = args.shift() || 20;
				}

				const attributes = attr ? `${attr ? attr.join(',') : '*'}` : '*';

				let search = `"${kVector}" @@ plainto_tsquery('english', '${query}')`;

				if (where) {

					const value = i => typeof i == "number" ? i : `'${i}'`;
					const q = Object.entries(where).map(i => `${i[0]}=${value(i[1])}`).join(' AND ');

					search = q + ' AND ' + search;
				}

				const q = `SELECT ${attributes} FROM "${kTable}" WHERE ${search} ORDER BY "${kVector}" LIMIT ${limit} OFFSET ${offset}`;

				console.log('Game search:', q);
	
				return sequelize.query(q, this);
			}
		}
	}
	Game.init({
		id: { type: DataTypes.STRING(32), primaryKey: true },
		description: DataTypes.STRING,
		user: DataTypes.STRING,
		content: DataTypes.STRING.BINARY,
		info: DataTypes.JSONB
	}, {
		sequelize,
		modelName: kModel,
		tableName: kTable,
		timestamps: true
	});
	return Game;
};
