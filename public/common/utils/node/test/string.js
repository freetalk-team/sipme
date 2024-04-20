
require('../../string');
require('../../object');


const names = [
	'status',
	'detail_code',
	'BaseItem'
];

names.map(i => console.log(i.align(20), '=>', i.display()));

