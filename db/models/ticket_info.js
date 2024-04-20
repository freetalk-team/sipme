'use strict';

const { search } = require('../common');

const kTable = 'ticket_info';

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class TicketInfo extends Model {
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
	TicketInfo.init({
		id: { type: DataTypes.INTEGER, primaryKey: true },
		type: DataTypes.STRING,
		component: DataTypes.STRING,
		severity: DataTypes.STRING,
		priority: DataTypes.STRING,
		owner: DataTypes.STRING,
		reporter: DataTypes.STRING,
		cc: DataTypes.STRING,
		version: DataTypes.STRING,
		milestone: DataTypes.STRING,
		status: DataTypes.STRING,
		resolution: DataTypes.STRING,
		summary: DataTypes.STRING,
		description: DataTypes.STRING,
		keywords: DataTypes.STRING,
		
		time: 'TIMESTAMP',
		changetime: 'TIMESTAMP',

		change: DataTypes.JSON
	}, {
		sequelize,
		modelName: 'TicketInfo',
		tableName: kTable,
		timestamps: true,
		updatedAt: 'changetime',
		createdAt: 'time',

		
	});
	return TicketInfo;
};
