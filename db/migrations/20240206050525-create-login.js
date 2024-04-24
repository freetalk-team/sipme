'use strict';

module.exports = {

	up (queryInterface, Sequelize) {
		return queryInterface.createTable('login', { 

			id: {
				type: Sequelize.STRING(32)
				, primaryKey: true
				// , autoIncrement: true
			},

			name: Sequelize.STRING,
			email: { type: Sequelize.STRING, unique: true, allowNull: false },
			password: { type: Sequelize.STRING(64), allowNull: false },

			login: { type: Sequelize.INTEGER, defaultValue: 0 },
			state: { type: Sequelize.ENUM('initial', 'complete', 'gmail'), defaultValue: 'initial'},

			data: Sequelize.JSONB,
			perm: Sequelize.JSONB,
			token: Sequelize.STRING,

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
		}, { 
			//initialAutoIncrement: 12345 // Doesn't work on Postgres
		});
	},

	down (queryInterface, Sequelize) {
		return queryInterface.dropTable('login');
	}
};
