'use strict';
module.exports = {
	async up(queryInterface) {

		const sequelize = queryInterface.sequelize;

		await sequelize.query("create view room_uri as select id,name,domain,info,'sip:' || name || '@' || room.domain as uri from room");


		await sequelize.query("create view member_room as select member.id,username,member.domain,room,room_uri.id as rid from member inner join room_uri on room=room_uri.uri");


		const dialect = sequelize.options.dialect;
		let q;

		switch (dialect) {
		
			case 'sqlite':
			q = "create view room_members as select id,name,domain,info,uri,(select json_group_array(username) from member where room=uri) as members from room_uri";
			break;

			case 'pg':
			case 'postgres':
			q = "create view room_members as select id,name,domain,info,uri,(select json_agg(member.username) from member where room=uri) as members from room_uri";
			break;
		}

		await sequelize.query(q);
		
	},
	async down(queryInterface) {
		const sequelize = queryInterface.sequelize;

		await sequelize.query('drop view room_members');
		await sequelize.query('drop view member_room');
		await sequelize.query('drop view room_uri');
	}
};
