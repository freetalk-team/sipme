'use strict';

const { search } = require('../common');

const kTable = 'users';
const kSearchTable = `${kTable}_fts`;

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class User extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

			User.search = search(sequelize, this, 'login', kSearchTable);
		}
	}
	User.init({
		id: { type: DataTypes.STRING(32), primaryKey: true },
		name: DataTypes.STRING,
		email: DataTypes.STRING,
		data: DataTypes.JSONB
	}, {
		sequelize,
		modelName: 'Users',
		tableName: kTable,
		timestamps: false,
	
	});
	return User;
};
