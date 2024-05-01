'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('wiki', { 

			id: {
				type: Sequelize.STRING
				, primaryKey: true
				// , autoIncrement: true
			},

			tags: {
				type: Sequelize.STRING,
				allowNull: false,
				defaultValue: ''
			},
			title: Sequelize.STRING,
			short: Sequelize.TEXT,
			head: Sequelize.TEXT,
			text: Sequelize.TEXT,
			content: Sequelize.STRING.BINARY,
			info: Sequelize.JSONB,

			created: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},

			updated: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('wiki');
	}
};
