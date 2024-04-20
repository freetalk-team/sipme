'use strict';

require('../../../../../common/utils');

// const bcrypt = require('bcrypt');

module.exports = {
	up (queryInterface, Sequelize) {
		// const salt = bcrypt.genSaltSync(10, 'a');

		return queryInterface.bulkInsert('login', [
			{
				id: 'su',
				name: 'Admin',
				email: 'root',
				password: 'admin123'.md5(), 
			}
		]);
	},

	down (queryInterface, Sequelize) {
	}
};
