/* eslint-disable class-methods-use-this */
const log4js = require('log4js');
const path = require('path');

// log4js.addLayout('es-appender', function(config) {
// 	return function(event) {
// 		return JSON.stringify(event.data[0]);
// 	}
// });

// log4js.addLayout('es-tcp', function(config) {
// 	return function(logEvent) { 
  
// 		const body = JSON.stringify(logEvent.data[0]);
  
// 	  	return `POST /${config.index}/_doc HTTP/1.1
// content-type: application/json
// content-length: ${body.length + 1}
// connection: keep-alive

// ` + body /*+ config.separator*/;

// 	}
// });

// log4js.addLayout('csv', function(config) {
// 	return function(logEvent) {

// 		const r = [];
// 		for (const [k, v] of Object.entries(logEvent.data[0])) {

// 			switch (k) {

// 				case 'TransactionTime': 
// 				r.push(v.toISOString());
// 				break;

// 				case 'USSDResponseString':
// 				r.push(`"${v}"`);
// 				break;

// 				default:
// 				r.push(v);
// 				break;
// 			}
			
// 		}
// 		//return Object.values(logEvent.data[0]).join(',');
// 		return r;
// 	};
// });

const config = require('@config/logger.json');

log4js.configure(config);
// log4js.configure(path.join(__dirname, 'config/logger.json'));

const logger = log4js.getLogger();
//const edr = log4js.getLogger('edr');

//console.log(edr);

const kLevels = ['debug', 'info', 'warn', 'error', 'fatal'];

const stdout = console;

console.out = console.log;
console.err = console.error;
console.dbg = log4js.getLogger('DBG');

console.debug = (...args) => logger.debug(...args);
console.log = console.info = (...args) => logger.info(...args);
console.warn = (...args) => logger.warn(...args);
console.error = (...args) => logger.error(...args);
console.fatal = (...args) => logger.fatal(...args);
// console.table = (...args) => stdout.table(...args);

Object.defineProperty(console, 'level', {
	get() { return logger.level.levelStr.toLowerCase(); },
	set(l) {
		if (kLevels.includes(l.toLowerCase()))
			logger.level = l;
	}
});

//module.exports = [console, edr];
module.exports = console;