const { createIndex } = require('../common');

const searchFields = ['name', 'email'],
	tableName = 'login',
	viewName = 'user'
	;

module.exports = {
	async up (queryInterface, Sequelize) {
		var sequelize = queryInterface.sequelize;

		return createIndex(sequelize, tableName, searchFields, viewName);
	},

	async down (queryInterface, Sequelize) {
		var sequelize = queryInterface.sequelize;
		
		//await sequelize.query('DROP table ' + searchTableName);

	}
};
