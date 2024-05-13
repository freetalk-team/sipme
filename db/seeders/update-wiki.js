'use strict';

const pako = require('pako')
	, fs = require('fs/promises')
	, { join, parse } = require('path')
	;

const { getSearchInfo } = require('../../common/md');

module.exports = {
	async up (queryInterface, Sequelize) {

		const filter = ['.md'];
		const root = join(__dirname, '../..', 'doc/wiki');
		const docs = await fs.readdir(root);

		let path, id, md, data, content;

		const all = [];

		for (const file of docs) {

			const { name, ext } =  parse(file);

			if (!filter.includes(ext)) {
				console.log('Skipping file:', file);
				continue
			}

			id = parse(file).name;

			console.debug('ADDING:', id);

			path = join(root, file);
			md = await fs.readFile(path, 'utf8');

			data = getSearchInfo(md);
			data.id = id;
			data.content = Buffer.from(pako.deflate(md));

			// console.debug(data);

			all.push(data);

			//all.push({ id, content });

		}

		await queryInterface.bulkInsert('wiki', all, { ignoreDuplicates: true });

		//console.debug(all);

		//return queryInterface.bulkUpdte('game', all);
	},

	down (queryInterface, Sequelize) {
	}
};