Object.toArray = function(o, cb=function(){}) {
	const a = [];

	if (o) {
		for (const [id, i] of Object.entries(o)) {
			i.id = i.id || id;
			cb(i);
			a.push(i);
		}
	}

	return a;
}

Object.fromArray = function(a) {
	const r = {};
	for (const i of a)
		r[i.id] = i;

	return r;
}

Object.empty = function(o) {
	return Object.keys(o).length === 0 && o.constructor === Object;
}

Object.deleteUndefined = function(o) {
	Object.keys(o).forEach(i => o[i] === undefined && delete o[i]);
	return o;
}

Object.flipEntries = function(o) {
	return Object.fromEntries(Object.entries(o).map(([k,v]) => [v,k]));
}

Object.hash = function(o) {

	let n = 4294967279;

	for (const v of Object.values(o)) {

		if (typeof v == 'object') {
			n ^= Array.isArray(v) ? Array.hash(v) : Object.hash(v);
		}
		else if (typeof v == 'string') {
			n ^= v.hashCode();
		}
		else if (typeof v == 'number') {
			n ^= v;
		}
		else if (typeof v == 'boolean') {
			n ^= v ? 0x5c5c5c5c : 0xc5c5c5c5;
		}

	}

	return n >>> 0;
}

Object.normalize = function(o) {
	for (const [k, v] of Object.entries(o)) {
		if (typeof v == 'object') {
			if (Array.isArray(v)) {
				const a = v.filter(i => !!i);

				for (const i of a) 
					Object.normalize(i);

				o[k] = a;

			}
			else {
				if (Object.keys(v).length > 0)
					Object.normalize(v);
				else
					delete o[v];
			}

		}
	}
}

Object.merge = function(o, key='info') {

	const assign = (i) => {
		if (i[key]) {
			Object.assign(i, i[key]);
			delete i[key];
		}
	}

	if (Array.isArray(o)) {
		for (const i of o) 
			assign(i);
	}
	else {
		assign(o);
	}

	return o;
}

Array.hash = function(a) {

	let n = 3326489;

	for (const v of a) {
		if (typeof v == 'object') {
			n ^= Array.isArray(v) ? Array.hash(v) : Object.hash(v);
		}
		else if (typeof v == 'string') {
			n ^= v.hashCode();
		}
		else if (typeof v == 'number') {
			n ^= v;
		}
		else if (typeof v == 'boolean') {
			n ^= v ? 0x5c5c5c5c : 0xc5c5c5c5;
		}
	}

	return n >>> 0;
}

Array.prototype.unique = function() {
	return this.filter((value, index, array) => array.indexOf(value) === index);
}

Array.prototype.uniqueId = function(key='id') {
	return Array.from(new Set(this.map(i => i[key])))
		.map(id => this.find(i => i[key] == id));
}

Array.prototype.rotate = function(n) {
	n = n % this.length;
	return this.slice(n, this.length).concat(this.slice(0, n));
}

Array.prototype.sum = function() {
	return this.reduce((a,b) => a+b, 0);
}

Array.prototype.avg = function() {
	const total = this.sum();
	return total / this.length;
}

Array.prototype.avgi = function() {
	return Math.floor(this.avg());
}

Array.prototype.max = function(min=0x80000000>>0) {
	return this.reduce((a,b) => a > b ? a : b, min);
}

Array.prototype.min = function(max=0xffffffff) {
	return this.reduce((a,b) => a < b ? a : b, max);
}

Array.prototype.sortTimestamp = function() {
	this.sort((a, b) => b.ts - a.ts);
}