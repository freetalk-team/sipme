
import './utils/string.js';
import './utils/date.js';
import './utils/function.js';
import './utils/object.js';

import './utils/dom.js';
import './utils/ajax.js';
import './utils/validate.js';

async function delayResolve(promise, ms=1200) {

	const p = new Promise((resolve, reject) => {
		setTimeout(resolve, ms);
	});

	await Promise.all([promise, p]);

	return promise;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function size(a, K=1024) {

	let n;
	if (typeof a == 'number') n = a;
	else {
		const values = Array.isArray(a) ? a : Object.values(a);
		n = values.reduce((a,b) => a + b, 0);
	}

	if (n < K) return n;

	// const fix = (v) => v.replace('.0', '+ ');
	const fix = (v) => v.replace('.0', '');
	const M = K ** 2;

	if (n < M) return fix(`${(n/K).toFixed(1)}K`);
	return fix(`${(n/M).toFixed(1)}M`);
}

function time(ts) {
	const now = ts ? new Date(ts * 1000) : new Date;

	const hour = now.getHours();
	const min = now.getMinutes();

	return `${hour > 9 ? hour : '0' + hour}:${min > 9 ? min : '0' + min}`;
}

function clamp(num, min, max) {
	return num <= min 
	  ? min 
	  : num >= max 
		? max 
		: num;
}

function unclamp(num, max, min=-max) {

	if (num > max) return num;
	if (num < min) return num;

	return Math.sign(num) * max;
}

function percent(fraction) {
	return `${Math.floor(fraction*100)}%`;
}

function isPromise(p) {
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

function randInt(min, max) {
	return Math.floor((max - min) * Math.random()) + min;
}

function indexName(name, index, section) {

	if (typeof index == 'number') {

		name = section 
			? `${section}[${index}].${name}`
			: `${name}[${index}]`;
	}
	else if (section) {
		name = section + '.' + name;
	}

	return name;
}

function dataset(tag, val) {
	return typeof val != 'undefined' ? `data-${tag}="${val}"` : '';
}

function join(...path) {
	let r = path.join('/').replace(/\/+/g, '/');
	return r.endsWith('/') ? r.slice(0, -1) : r;

}

Object.assign(window, {
	isPromise,
	delayResolve,
	sleep,
	clamp,
	unclamp,
	size,
	time,
	percent,
	randInt,
	count(a) { return size(a, 1000) },
	indexName,
	dataset,
	//cat(a0, ...args) { return a0.concat()}
	join
});