'use strict';

const kTable = 'ticket_enum';

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class TicketEnum extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

		}
	}

	TicketEnum.init({
		id: { type: DataTypes.STRING, primaryKey: true },
		value: DataTypes.JSON 
	}, {
		sequelize,
		modelName: 'TicketEnum',
		tableName: kTable,
		timestamps: false,

		
	});

	return TicketEnum;
};
