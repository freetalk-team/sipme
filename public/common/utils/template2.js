
function replace(text, data, ...args) {

	text = text.trim(); 

	const re = /@(if|else|endif|foreach|endforeach)(\{\{(.*?)\}\}(\[(.*?)\])?)?/g;
	const exp = text.matchAll(re);
	
	const root = [];

	let s, t;
	let end = 0, parent = root, scope;

	root.start = 0;

	for (const i of exp) {

		switch (i[1]) {

			case 'if':
			case 'foreach':

			t = text.slice(parent.start, i.index).trim();

			parent.push(t);

			scope = [];
			
			scope.type = i[1]; 
			scope.exp = i[3];
			scope.parent = parent;
			scope.start = i.index + i[0].length;
			scope.caps = i[5] ? i[5].split(',') : [];

			// console.log('CAP:', i[5]);

			parent.push(scope);

			parent = scope;
	
			break;

			case 'endif':
			case 'endforeach':

			s = i.index + i[0].length;
			parent.push(text.slice(parent.start, i.index).trim());

			parent = parent.parent;
			parent.start = s;
			end = s;

			break;

			case 'else': {

				s = i.index + i[0].length;
				parent.push(text.slice(parent.start, i.index).trim());

				const scope = [];

				scope.parent = parent.parent;
				scope.start = i.index + i[0].length;

				parent._else = scope;
				parent = scope;
			}
			break;
		}
	}

	root.push(text.slice(end, text.length).trim());
	
	return evaluateBlock(root, data, ...args)
		.replaceAll(/>\s+</g, '><')
		;
}

function evaluateBlock(block, data, ...params) {

	if (!block) return '';

	let html = '';

	for (const i of block) {

		if (typeof i == 'string') {
			// html += i.replace(re, (m, exp) => _eval.bind(data)(exp));
			// html += evalTemplates(i.replacex(data, ...params), data, ...params);
			html += evalTemplates(i, data, ...params).replacex(data, ...params);
		}
		else {

			switch (i.type) {

				case 'if': {
					const r = i.exp.evalx(data, ...params);
					// console.log('COND eval ', i.exp, data, r);
					html += evaluateBlock(r ? i : i._else, data, ...params);
				}
				break;

				case 'foreach': {
					const a =  i.exp.evalx(data, ...params) || [];
					const caps = i.caps.map(k => data[k]);

					for (const j of a) 
						html += evaluateBlock(i, j, a.length, ...caps);
					
				}
				break;

			}
		}
	}

	return html;
}

function evalTemplates(text, data, ...params) {

	const re = /\[\[(.*?)\]\](\{\{(.*?)\}\})?/g;
	//const templates = text.matchAll(re);

	return text.replace(re, (m, t, m1, exp) => {

		const [id, tags, ...rest] = t.split(',');

		let template = /_\d/.test(id) ? params[parseInt(id.slice(1))] : id;
		let newparams = [];

		if (Array.isArray(template)) {
			newparams = template;
			template = newparams.shift();
		}

		if (!template)
			return '';

		for (const i of rest) {
			if (/_\d/.test(i)) {
				newparams.push(params[parseInt(i.slice(1))]);
				continue;
			}

			newparams.push(i.replacex(data, ...params));
		}

		if (exp)
			data = exp.evalx(data, ...params);

		const [text, classes, attrs] = load(template, data, ...newparams);
		// const text =  kTemplates[template];

		// console.log('$$', id, template);

		const body = replace(text, data, ...newparams);

		let tag = 'div';
		let styles = [];

		if (tags) {
			[tag, ...styles] = tags.split(' ');
			classes.push(...styles);
		}

		const cl = classes.length > 0 ? ' class="' + classes.join(' ') + '"' : '';
		const a = `${Object.entries(attrs).map(([name,value]) => `${name}="${value.replacex(data)}"`).join(' ')}`;

		return `<${tag}${cl} ${a}>${body}</${tag}>`;

	});

}

function renderHtml(template, data, tag='div', classes=[], ...caps) {
	// console.log('DOM template render:', data);
	const html = replace(template, data, ...caps);

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

function renderContainer(container, id, data, tag, ...styles) {
	const [text, classes] = load(id, data);

	data = Array.isArray(data) ? data : [ data ];

	for (const i of data) {
		const e = renderHtml(id, data, tag, classes, ...styles);
		container.appendChild(e);
	}
}

export {
	render,
	renderHtml,
	renderContainer,
	replace as renderText
}