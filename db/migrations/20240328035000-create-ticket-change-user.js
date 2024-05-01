'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;
		
		await sequelize.query("create view ticket_change_user as select ticket_change.*,users.name from ticket_change left join users on author=email");
		
	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view ticket_change_user');
	}
};
