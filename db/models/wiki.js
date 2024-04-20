'use strict';

const { search } = require('../common');

const kTable = 'wiki';
const kSearchTable = `${kTable}_fts`;


const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class Wiki extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

			Wiki.search = search(sequelize, this, kTable, kSearchTable);
		}
	}
	Wiki.init({
		id: { type: DataTypes.STRING, primaryKey: true },
		title: DataTypes.STRING,
		tags: DataTypes.STRING,
		short: DataTypes.TEXT,
		text: DataTypes.TEXT,
		content: DataTypes.STRING.BINARY,
		info: DataTypes.JSONB
	}, {
		sequelize,
		modelName: 'Wiki',
		tableName: kTable,
		timestamps: true,
		updatedAt: 'updated',
		createdAt: 'created',
	});
	return Wiki;
};