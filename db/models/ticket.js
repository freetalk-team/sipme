'use strict';

const { search } = require('../common');

const kTable = 'ticket';
const kSearchTable = `${kTable}_fts`;

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class Ticket extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

			Ticket.search = search(sequelize, this, kTable, kSearchTable);
		}
	}

	// Compatible with Trac https://trac.edgewall.org
	Ticket.init({
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		type: DataTypes.ENUM('issue', 'task', 'enhancement', 'feature'),
		component: DataTypes.STRING(64),
		severity: DataTypes.ENUM('medium', 'low', 'high', 'critical'),
		priority: DataTypes.STRING(32),
		owner: DataTypes.STRING,
		reporter: DataTypes.STRING,
		cc: DataTypes.STRING,
		version: DataTypes.STRING(32),
		milestone: DataTypes.STRING(32),
		status: DataTypes.ENUM('new', 'assigned', 'closed'),
		resolution: DataTypes.STRING,
		summary: DataTypes.STRING,
		description: DataTypes.STRING,
		keywords: DataTypes.STRING,
		
		time: 'TIMESTAMP',
		changetime: 'TIMESTAMP'
	}, {
		sequelize,
		modelName: 'Ticket',
		tableName: kTable,
		timestamps: true,
		updatedAt: 'changetime',
		// updatedAt: false,
		createdAt: 'time',

		
	});
	return Ticket;
};
