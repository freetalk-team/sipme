
require = require('esm')(module);
module.exports = require('./runner.mjs');


if (require.main === module) {

	const r = new DailyExecutor('test', { interval: 10 });

	r.start();

}