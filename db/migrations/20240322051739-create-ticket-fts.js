const { createIndex } = require('../common');

const searchFields = ['summary', 'description'],
	tableName = 'ticket'
	;

module.exports = {
	async up (queryInterface, Sequelize) {
		var sequelize = queryInterface.sequelize;

		return createIndex(sequelize, tableName, searchFields);
	},

	async down (queryInterface, Sequelize) {
		var sequelize = queryInterface.sequelize;
		
		//await sequelize.query('DROP table ' + searchTableName);

	}
};
