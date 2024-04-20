'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('ticket', { 

			id: {
				type: Sequelize.INTEGER
				, primaryKey: true
				, autoIncrement: true
			},

			type: { type: Sequelize.ENUM('issue', 'task', 'enhancement', 'feature'), defaultValue: 'issue' },
			component: Sequelize.STRING(64),
			severity: { type: Sequelize.ENUM('medium', 'low', 'high', 'critical'), defaultValue: 'medium' },
			priority: Sequelize.STRING(32),
			owner: Sequelize.STRING,
			reporter: Sequelize.STRING,
			cc: Sequelize.STRING,
			version: Sequelize.STRING(32),
			milestone: Sequelize.STRING(32),
			status: { type: Sequelize.ENUM('new', 'assigned', 'closed'), defaultValue: 'new' },
			resolution: Sequelize.STRING,
			summary: Sequelize.STRING,
			description: Sequelize.STRING,
			keywords: Sequelize.STRING,

			time: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},

			changetime: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
		}, { 
			//initialAutoIncrement: 12345 // Doesn't work on Postgres
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('ticket');
	}
};
