const spawn = require('child_process')
	, fs = require('fs')
	, crypto = require('crypto')
	, requireFromString = require('require-from-string')
	, Path = require('path')
	, yaml = require('yamljs')
	;

require('./string');
require('./date');
require('./object');

const { parse } = require('./marked');

String.prototype.md5 = function() {
	return crypto.createHash('md5').update(this.valueOf()).digest("hex");
}

global.isDebugger = !!process.env.DEBUGGER;
global.isProduction = process.env.NODE_ENV == 'production';

global.isPromise = function(p) {
	if (
	  p !== null &&
	  typeof p === 'object' &&
	  typeof p.then === 'function' &&
	  typeof p.catch === 'function'
	) {
	  return true;
	}
  
	return false;
}

global.markdown = parse;

global.loadConfig = function(fname) {
	const ext = Path.extname(fname);
	const isyaml = ['.yaml', '.yml'].includes(ext);

	return  isyaml ? yaml.load(fname) : require(fname);
}

global.requirex = function(input) {
	//console.debug('REQUREX:', input, parent);

	const CFLAGS = '-DEXTRA_DEBUG';

	const path = require.resolve(input);
	const out = spawn.execSync(`cpp -P ${CFLAGS} ${path}`).toString();

	return requireFromString(out);
} 

global.cpp = function(file, opts=[]) {
	const CFLAGS = opts.map(i => `-D'${i}'`);
	const cmd = `cpp -P ${CFLAGS.join(' ')} ${file}`;
	//console.log('CMD:', cmd);
	const out = spawn.execSync(cmd).toString();

	return out;
}

global.cppFromString = function(input, opts=[]) {
	const CFLAGS = opts.map(i => `-D'${i}'`);

	//const input = fs.readFileSync(file);
	const cmd = `cpp -P ${CFLAGS.join(' ')}`;
	const out = spawn.execSync(cmd, { input }).toString();

	return out;
}

global.transactionId = function() { return String(Math.floor(Math.random() * 1000000) + 100000000); }

global._L = function() {}



global.sha1 = function(file) {
	const content = fs.readFileSync(file).toString();

	const shasum = crypto.createHash('sha1');
	shasum.update(content);

	return shasum.digest('hex');
}

global.isToday = function(someDate) {
	const today = new Date()
	return someDate.getDate() == today.getDate() &&
	  someDate.getMonth() == today.getMonth() &&
	  someDate.getFullYear() == today.getFullYear()
}

global.AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
global.GeneratorFunction = Object.getPrototypeOf(function*() {}).constructor;
global.AsyncGeneratorFunction = Object.getPrototypeOf(async function*() {}).constructor;


global.getFileExtension = function(filename) {
	return Path.extname(filename).slice(1).toLowerCase();
}

// Timestamp of last push, used to prevent local collisions if you push twice in one ms.
var lastPushTime = 0;

// We generate 72-bits of randomness which get turned into 12 characters and appended to the
// timestamp to prevent collisions with other clients.  We store the last characters we
// generated because in the event of a collision, we'll use those same characters except
// "incremented" by one.
var lastRandChars = [];

// Modeled after base64 web-safe chars, but ordered by ASCII.
const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

function generatePushID2(ts, s) {

	var hash = typeof s == 'string' ? s.hashCode() : s;
	var now = ts * 1000 + hash % 1000;
	var r = hash ^ now;

    var timeStampChars = new Array(8);
    for (var i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
      now = Math.floor(now / 64);
	}

	var id = timeStampChars.join('');

	var i = r % PUSH_CHARS.length;
	var chars = PUSH_CHARS.slice(i) + PUSH_CHARS.slice(0, i);
	
	for (var i = 7; i >= 0; i--) {
		timeStampChars[i] = chars.charAt(r % 64);
		// NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
		r = Math.floor(r / 64);
	}

	id += timeStampChars.join('');

	return id;
}

function generatePushID() {

    var now = new Date().getTime();
    var duplicateTime = (now === lastPushTime);
    lastPushTime = now;

    var timeStampChars = new Array(8);
    for (var i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
      now = Math.floor(now / 64);
    }
    if (now !== 0) throw new Error('We should have converted the entire timestamp.');

    var id = timeStampChars.join('');

    if (!duplicateTime) {
      for (i = 0; i < 12; i++) {
        lastRandChars[i] = Math.floor(Math.random() * 64);
      }
    } else {
      // If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
      for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
        lastRandChars[i] = 0;
      }
      lastRandChars[i]++;
    }
    for (i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i]);
    }
    if(id.length != 20) throw new Error('Length should be 20.');

    return id;
}

global.generatePushID = generatePushID;
global.generatePushID2 = generatePushID2;

global.createConsole = function() { return console; }


