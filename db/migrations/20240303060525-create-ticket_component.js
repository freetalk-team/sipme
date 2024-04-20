'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('component', { 

			name: { type: Sequelize.STRING, primaryKey: true },
			owner: Sequelize.STRING,
			description: Sequelize.STRING
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('component');
	}
};
