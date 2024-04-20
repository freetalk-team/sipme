'use strict';

const kTable = 'ticket_update';

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class TicketUpdate extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

		}
	}

	// Compatible with Trac https://trac.edgewall.org
	TicketUpdate.init({
		ticket: DataTypes.INTEGER,
		author: DataTypes.STRING,
		field: DataTypes.STRING,
		time: 'TIMESTAMP',
		oldvalue: DataTypes.STRING,
		newvalue: DataTypes.STRING,
		owner: DataTypes.STRING,
		reporter: DataTypes.STRING,
	}, {
		sequelize,
		modelName: 'TicketUpdate',
		tableName: kTable,
		timestamps: false,
	});

	TicketUpdate.removeAttribute('id')

	return TicketUpdate;
};
