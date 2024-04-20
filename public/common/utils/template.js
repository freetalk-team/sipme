
/*
	Important: Do not use with <table>
*/


const forexp = /@foreach\{\{(.*?)\}\}(\[(.*?)\])?((?:(?:((@if\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endif)|(@foreach\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endforeach)))*?|(?:.))*?)@endforeach/sg;
const ifexp = /@if\{\{(.*?)\}\}((?:(?:((@if\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endif)|(@foreach\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endforeach)))*?|(?:.))*?)@endif/sg;
// const ifexp = /@if\{\{(.*?)\}\}((:?(@if(.*?)@endif)|.)*?)@else(.*?)@endif/sg;
// const ifexp = /@if\{\{(.*?)\}\}(.*?)(@else(.*))?@endif/sg;
// const ifexp = /@if\{\{(.*?)\}\}((?:(@if\{\{(.*?)\}\}(.*?)@endif))|(?:.)*?)@else(.*?)@endif/sg;


const foreach = new RegExp(forexp, 'sg');
const condition = new RegExp(ifexp, 'sg');

// const template = /\[\[([^\]]+)\]\]\{\{([^}]+)\}\}/sg;
// const template = /\[\[([^\]]+)\]\]\{\{([^}]+)\}\}(\(\(([^\)]+)\)\))?(\[\[([^\]]+)\]\])?/sg;
const template = /\[\[(.*?)\]\](\{\{(.*?)\}\})?(\[\[(.*?)\]\])?/sg;
const variable = /\{\{(.*)\}\}/;

function noWhiteSpace(strings, ...placeholders) {
	// Build the string as normal, combining all the strings and placeholders:
	let withSpace = strings.reduce((result, string, i) => (result + placeholders[i - 1] + string));
	let withoutSpace = withSpace.replace(/\s+/g, '');
	return withoutSpace;
  }

function replace(text, ...caps) {

	// console.log('RE:', text);
	// console.log('THIS:', this);
	// console.log('CAPS:', this);

	// const group = function(level=0) {


	// 	if (level == 0) return '(?:.)*?';

	// 	return noWhiteSpace`
	// 	(?:
	// 		(?:(
	// 			(
	// 				@if\{\{[^}]+\}\}
	// 					${group(level - 1)}
	// 				@endif
	// 			)
	// 			|
	// 			(
	// 				@foreach\{\{[^}]+\}\}
	// 					${group(level - 1)}
	// 				@endforeach
	// 			)
	// 		))*?
	// 		|
	// 		(?:.)
	// 	)*?
	// 	`;
	// }

	// console.log(group(1));
	// console.log(group(2));

	

	// trick
	// ^.*?(myApp)

	return text.replace(foreach, (m1, v, capture, m2, body) => {


		// const [, name] = v.split('.');
		//console.log('FOR EACH Evaluating ', v, this);
		let m = v.match(/_([0-9])/);

		const iterable = (m ? caps[parseInt(m[1])] : v.eval(this)) || [];
		if (!Array.isArray(iterable)) 
			return '';

		let text = '';

		const newcaps = [];
		if (capture) {

			for (const i of capture.slice(1, -1).split(',')) {

				let m = i.match(/_([0-9])/);
				if (m) {
					let index = parseInt(m[1]);
					newcaps.push(caps[index]);
					continue;
				}

				newcaps.push(this[i]);

			}
		}

		// console.groupCollapsed('DOM FOREACH', v, capture);
		// console.debug(iterable);
		// console.debug('CAPS:', newcaps);
		// console.log(body);
		// console.groupEnd();
		
		// console.log('FOR EACH found', this, 'caps=', caps);
		// console.log('#', body);

		// for (const i of this[name]) 


		let index = 0;
		for (const i of iterable) {
			text += replace.bind(i)(body.trim(), index++, ...newcaps);
		}

		return text;
	})
	// if statment
	.replace(condition, (m1, cond, body, m2, _else) => {
		// console.log('DOM IF:', m1);

		// console.debug('IF BODY:', body.trim());
		// console.debug('IF ELSE:', m2);
		// console.debug('IF ELSE:', _else.trim());

		const [t, f] = body.splitLast('@else');
		// const c = cond.replace(/_([0-9])/g, (m,i) => caps[parseInt(i)]);
		const c = cond.replace(/_([0-9])/g, (m,i) => `_[${i}]`||'');
		const r = c.eval(this, ...caps);
		// console.log('DOM IF:', cond, this, r);
		// console.log('TURE', t);
		// console.log('FLASE', f);
		return r 
			? replace.bind(this)(t.trim(), ...caps) 
			: (f ? replace.bind(this)(f.trim(), ...caps) : '');
	})

	// templates
	.replace(template, (m0, param, m1, v/*, m1, args*/, m2, dataset) => {

		// console.debug('DOM TEMPLATE:');


		const res = v ? v.replace(/_([0-9])/g, (m,i) => `_[${i}]`||'').eval(this, ...caps) : {};
		const [id, t, ...params] = param.split(',').map(i => i.trim());

		// console.groupCollapsed('TEMPLATE:', m0);
		// console.debug('ID:', id);
		// console.debug('TAG:', t);
		// console.debug('PARAMS', params);
		// console.groupEnd();

		let templateid = id.replacex(this);

		if (/^_[0-9]/.test(id)) {
			const i = parseInt(id[1]);
			templateid = caps[i];
		}
		else {
			// old stuff
			const m = id.match(variable);
			if (m) {
				if (/_[0-9]/.test(m[1])) {
					const i = m[1][1] - '0';
					// templateid = caps.splice(i, 1)[0];
					templateid = caps[i];
					if (!templateid)
						return '';
				}
				// else {
				// 	templateid = m[1].eval(this, ...caps);
				// }
			}
		}

		if (!templateid) return '';

		let newcaps = [];
		if (Array.isArray(templateid)) {
			newcaps = templateid.slice(1);
			templateid = templateid[0];

			if (!templateid) return '';
		}

		for (let i = 0; i < params.length; ++i) {

			const p = params[i];
			let m;

			m = p.match(/_([0-9])/);
			if (m) {
				params[i] = caps[parseInt(m[1])];
				continue;
			}

			m = p.match(/\{\{(.*?)\}\}/);
			if (m)
				params[i] = m[1].eval(this, ...caps);
		}


		const [tag, ...styles ] = t ? t.split(' ') : ['div'];
		const [template, classes, attrs] = load(templateid, res, ...newcaps, ...params);

		let data = '';
		//if (r.id) data += ` data-id="${r.id}"`;

		if (dataset) {

			for (const i of dataset.split(',')) {

				const [name, value] = i.split('=');
				if (value) {
					const v = value.eval(this, ...caps);

					//console.log('EVALUATING:', value, v);

					data += ` data-${name}="${v}"`;
				}
				else {
					data += ` data-${name}="${this[name]}"`;
				}

			}

			// console.log('RENDER:', data);
		}

		//const newcaps = args ? args.split(',') : caps;

		const c = `${[...classes, ...styles].join(' ')}`;
		const a = `${Object.entries(attrs).map(([name,value]) => `${name}="${value.replacex(res)}"`).join(' ')}`;

		// console.debug('DOM loading template id:', templateid, newcaps, params);

		const cls = c ? ` class="${c}"` : '';
		const html = `<${tag}${cls} ${a} ${data}>${replace.bind(res)(template, ...newcaps, ...params)}</${tag}>`;

		return html;
	})
	.replace(/_a-([^=]+)=\{\{(.*)\}\}/, (m, attr, val) => val.eval(this) ? attr : '')
	.replacex(this, ...caps)
	.trim()
	;
}

function renderHtml(template, data, tag='div', classes=[], ...caps) {
	// console.log('DOM template render:', data);
	const html = 
		replace.bind(data)(template, ...caps)
		.replaceAll(/>\s+</g, '><');
		;

	// const container = dom.createElement(tag, ...classes);
	const [name, ...styles] = tag.split(' ');
	const container = document.createElement(name);

	container.classList.add(...classes, ...styles);
	container.innerHTML = html;

	return container;
}

function load(id, data={}, ...params) {
	const template = document.getElementById(id);
	if (!template) 
		console.error('Failed to load template', id);

	let code = template.innerHTML;

	// console.groupCollapsed('DOM: Loading template:', id)
	// console.debug('DATA =>', data);
	// console.debug('PARAMS =>', params);
	// console.debug(code);
	// console.groupEnd();

	code = code
		.replace(/(?=<!--)([\s\S]*?)-->/sg, '') // removing comments
		.replace(/[\n\t]/, '')
		;

	// console.debug(code);

	let classes = template.getAttribute('classes') || '';
	if (classes)
		classes = classes.replacex(data, ...params);

	const clist = classes ? classes.split(' ').filter(i => i) : [];

	const special = {
		'&gt;': '>',
		'&lt;': '<',
		'&amp;': '&',
	};

	for (const [s, r] of Object.entries(special))
		code = code.replaceAll(s, r);

	const attr = {};
	for (const i of template.attributes) {

		let name = i.name;
		if (['id', 'classes'].includes(name)) 
			continue;
		

		//s.replace(/_a-([^=]+)=\{\{(.*)\}\}/, (m, attr, val) => val);

		if (name.startsWith('_a-')) {
			name = name.slice(3);
			const v = i.value.replacex(data);

			if (v)
				attr[name] = v;

			continue;
		}

		attr[name] = i.value.replacex(data, ...params);
		// attr[name] = i.value;

	}

	// console.log('Last loaded template id:', id);

	return [code, clist, attr ];
}

function render(id, data={}, tag='div', ...caps) {
	const [text, classes, attr ] = load(id, data, ...caps);
	// console.log('TEMPLATE CODE\n', code, '\n', text);
	let e;

	try {
		e = renderHtml(text, data, tag, classes, ...caps);
		// e.dataset = { ...dataset };

		for (const [name, value] of Object.entries(attr))
			// e.setAttribute(name, value.replacex(data));
			e.setAttribute(name, value);
	}
	catch (err) {
		
		console.groupCollapsed('Failed to render template', id);
		console.debug(data);
		console.debug(text);
		console.groupEnd();

		throw err;
		// e = dom.createElement('red');
		// e.innerText = 'Failed to render data';

	}

	return e;
}

// function renderAll(container, id, data=[], tag='div', ...caps) {
// 	const [text, classes, attr ] = load(id, data, ...caps);
// 	// console.log('TEMPLATE CODE\n', code, '\n', text);
// 	let e;

// 	try {
// 		e = renderHtml(text, data, tag, classes, ...caps);
// 		// e.dataset = { ...dataset };

// 		for (const [name, value] of Object.entries(attr))
// 			// e.setAttribute(name, value.replacex(data));
// 			e.setAttribute(name, value);
// 	}
// 	catch (err) {
		
// 		console.groupCollapsed('Failed to render template', id);
// 		console.debug(data);
// 		console.debug(text);
// 		console.groupEnd();

// 		throw err;
// 		// e = dom.createElement('red');
// 		// e.innerText = 'Failed to render data';

// 	}

// 	return e;
// }

function renderContainer(container, id, data, tag, ...styles) {
	const [text, classes] = load(id, data);

	data = Array.isArray(data) ? data : [ data ];

	for (const i of data) {
		const e = renderHtml(id, data, tag, classes, ...styles);
		container.appendChild(e);
	}
}

function renderText(text, data) {
	return replace.bind(data)(text);
}

export {
	render,
	renderHtml,
	renderContainer,
	renderText
}