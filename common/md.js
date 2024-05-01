

function getSearchInfo(md) {

	const matches = [], r = {};
	const re = /^#{1,3}\s+(.*?)$/mg;

	let m, t;

	md = md.trim(); 

	// console.debug('Parsing:', md);

	while ((m = re.exec(md)) !== null) {

		if (t) {

			t.p = m.input.slice(t.i, m.index).trim();
			delete t.i;
		}

		//console.debug(m);

		t = {
			h: m[1].replace(/(\$fa-[a-z0-9-]+)(;[a-z]+)?/g, ''),
			i: m.index + m[0].length,
		};

		t.p = m.input.slice(t.i).trim();

		matches.push(t);
	}

	// if (t)
	// 	delete t.i;

	//r.title = matches.shift();

	// matches.map(i => console.log('=>', i));

	if (matches.length > 0) {

		const { h, p } = matches.shift();

		r.title = h;
		r.short = p;
		r.head = matches.map(i => i.h).join(' ');
	}

	return r;
}

module.exports = {
	getSearchInfo
}