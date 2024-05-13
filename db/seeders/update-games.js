'use strict';

const pako = require('pako')
	, fs = require('fs/promises')
	, { join } = require('path')
	, util = require('util')
	, exec = util.promisify(require('child_process').exec)
	;

module.exports = {
	async up (queryInterface, Sequelize) {

		const all = [];

		const root = join(__dirname, '../../../..', 'games');
		const games = await fs.readdir(root);

		let path, content, data;

		for (const id of games) {

			console.debug('ADDING:', id);

			path = join(root, id);

			try {
				await exec(`cd ${path} && NODE_ENV=production npx webpack`);
			}
			catch (e) {
				console.error('Failed to build bundle:', id);
				continue;
			}

			path = join(path, 'bundle.js');
			data = await fs.readFile(path);
			content = Buffer.from(pako.deflate(data));

			//all.push({ id, content });

			await queryInterface.bulkUpdate('game', { id, content });
		}

		//console.debug(all);

		//return queryInterface.bulkUpdte('game', all);
	},

	down (queryInterface, Sequelize) {
	}
};