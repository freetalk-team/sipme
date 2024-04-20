'use strict';

const kTable = 'ticket_change';

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class TicketChange extends Model {
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
	TicketChange.init({
		ticket: DataTypes.INTEGER,
		author: DataTypes.STRING,
		field: DataTypes.STRING,
		time: 'TIMESTAMP',
		oldvalue: DataTypes.STRING,
		newvalue: DataTypes.STRING,
	}, {
		sequelize,
		modelName: 'TicketChange',
		tableName: kTable,
		timestamps: true,
		updatedAt: false,
		createdAt: 'time',

		
	});

	TicketChange.removeAttribute('id')

	return TicketChange;
};
