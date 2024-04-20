'use strict';

const kRooms = [ 'notify', 'ticket'];

module.exports = {
	up (queryInterface, Sequelize) {
		const rooms = [];
		for (const i of kRooms) {

			rooms.push({ name: `chat-${i}`, domain: 'internal', flag: 0 });
		}

		return queryInterface.bulkInsert('room', rooms);
	},

	down (queryInterface, Sequelize) {
		return queryInterface.bulkDelete('room', null, {});
	}
};
