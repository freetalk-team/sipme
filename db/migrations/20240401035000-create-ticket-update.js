'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;
		
		await sequelize.query("create view ticket_update as select ticket,ticket_change.time,field,oldvalue,newvalue,author,reporter,owner from ticket_change left join ticket on ticket=id");
		
	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view ticket_update');
	}
};
