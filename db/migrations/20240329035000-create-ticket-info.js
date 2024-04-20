'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;
		
		// todo: sqlite

		await sequelize.query("create view ticket_info as select ticket.*,coalesce(nullif(json_agg(to_jsonb(ticket_change) - 'ticket')::text, '[null]'), '[]')::json as change from ticket left join ticket_change on id=ticket_change.ticket group by id");
		
	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view ticket_info');
	}
};
