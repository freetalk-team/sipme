'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('ticket_change', { 

			ticket: Sequelize.INTEGER,
			
			author: Sequelize.STRING,
			field: Sequelize.STRING,
			
			time: {
				allowNull: false,
				type: 'TIMESTAMP',
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},

			oldvalue: Sequelize.STRING,
			newvalue: Sequelize.STRING,
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('ticket_change');
	}
};
