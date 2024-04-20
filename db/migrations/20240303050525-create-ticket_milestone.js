'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('milestone', { 

			name: { type: Sequelize.STRING, primaryKey: true },
			due: 'TIMESTAMP',
			completed: { type: Sequelize.INTEGER, defaultValue: 0 },
			description: Sequelize.STRING
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('milestone');
	}
};
