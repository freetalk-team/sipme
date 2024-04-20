'use strict';

module.exports = {

	async up (queryInterface, Sequelize) {
		const sequelize = queryInterface.sequelize;

		let fields = ['id','name','email','data','perm'];

		const dialect = sequelize.options.dialect;
		if (dialect == 'sqlite')
			fields.unshift('rowid');

		// 'user' is reserved word in PG

		await sequelize.query(`create view users as select ${fields.join(',')} from login where state='complete' order by created desc`);
	},

	async down (queryInterface, Sequelize) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view user');
	}
};
