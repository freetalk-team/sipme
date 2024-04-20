'use strict';

const kTable = 'game';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable(kTable, { 

			id: {
				type: Sequelize.STRING(32)
				, primaryKey: true
				// , autoIncrement: true
			},
			description: Sequelize.TEXT,
			user: Sequelize.STRING,
			content: Sequelize.STRING.BINARY,
			info: Sequelize.JSONB,
			createdAt: {
				allowNull: false,
				type: 'TIMESTAMP',
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			updatedAt: {
				allowNull: false,
				type: 'TIMESTAMP',
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			}
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable(kTable);
	}
};
