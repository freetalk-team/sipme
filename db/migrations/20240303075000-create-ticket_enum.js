'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;

		const dialect = sequelize.options.dialect;
		let q;

		switch (dialect) {
		
			case 'sqlite':
			q = "create view ticket_enum as select 'component' as id,json_group_array(name) as value from component union all select 'milestone' as id, json_group_array(name) as value from milestone";

			case 'pg':
			case 'postgres':
			q = "create view ticket_enum as select 'component' as id,json_agg(component.name) as value from component union all select 'milestone' as id, json_agg(milestone.name) as value from milestone";
			break;
		}

		await sequelize.query(q);

	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;
		await sequelize.query('drop view ticket_enum');
	}
};

/*

create view schema as select 'componets' as id,json_group_array(name) as values from component union all select 'milestone' as id, json_group_array(name) as values from milestone;

*/