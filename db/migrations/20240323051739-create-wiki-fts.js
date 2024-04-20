'use strict';

const { createIndex, deleteIndex } = require('../common');

const searchFields = ['title', 'short'],
	tableName = 'wiki';

module.exports = {
	up (queryInterface, Sequelize) {
		
		const sequelize = queryInterface.sequelize;

		return createIndex(sequelize, tableName, searchFields);
	},

	down (queryInterface, Sequelize) {
		const sequelize = queryInterface.sequelize;

		return deleteIndex(sequelize, tableName);
	}
};
