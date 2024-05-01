'use strict';

const { createIndex, deleteIndex } = require('../common');

const searchFields = ['title', 'tags', 'head', 'short'],
	tableName = 'wiki';

module.exports = {
	up (queryInterface, Sequelize) {
		
		const sequelize = queryInterface.sequelize;

		return createIndex(sequelize, tableName, searchFields);
	},

	async down (queryInterface, Sequelize) {
		const sequelize = queryInterface.sequelize;

		await deleteIndex(sequelize, tableName);
	}
};
