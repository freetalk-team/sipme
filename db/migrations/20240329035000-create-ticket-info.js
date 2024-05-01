'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;
		const dialect = sequelize.options.dialect;
		
		let q;

		switch (dialect) {
		
			case 'sqlite':
			q = "create view ticket_info as select ticket.*,(select json_group_array(json_object('field',ticket_change.field,'author',ticket_change.author,'time',ticket_change.time,'oldvalue',ticket_change.oldvalue,'newvalue',ticket_change.newvalue)) from ticket_change where id=ticket) as change from ticket left join ticket_change on id=ticket_change.ticket group by id";
			break;

			case 'pg':
			case 'postgres':
			q = "create view ticket_info as select ticket.*,coalesce(nullif(json_agg(to_jsonb(ticket_change_user) - 'ticket')::text, '[null]'), '[]')::json as change from ticket left join ticket_change_user on id=ticket_change_user.ticket group by id";
			break;
		}
		
		await sequelize.query(q);
		
	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view ticket_info');
	}
};
