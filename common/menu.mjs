// The following code is shared between browser and node !


function loadDisplay(text) {
	//const m = text.match(/%(.+?)%/g);
	//console.log('MATCH:', m);
	//text = text.replace('\\', '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n');

	let isexp = false;
	text = text.replace(/%(.+?)%/g, (m, k) => {
		//console.log('MATCH', m);
		isexp = true;
		return `\${vars['${k}']}`;
	});


	if (isexp) {
		return `output += \`${text}\\n\`;`;
	}

	//text = text.replace(/(\r\n|\n|\r)/gm, '');
	//text = text.replace('\\', '\\\\');
	return `output += \`${text}\\n\`;`;
}

function disableHacks(s) {
	const rx_for = /(for[ \t\n\r]*\(.+\))/g;
	const rx_while = /(while[ \t\n\r]*\(.+\))/g;

	console.log('Disable hacks:', s);

	return s.replace(rx_for, 'for (;false;)').replace(rx_while, 'while (false)');
}

function loadAssign(i) {
	if (typeof i.val == 'string') {
		const m = i.val.match(/^\$(.+)\$$/);
		if (m) {
			const exp = disableHacks(m[1]);
			return `vars['${i.var}'] = evaluate(vars, '${exp.replace(/'/g, "\\'")}');`;
		}

		return `vars['${i.var}'] = '${i.val}';`;
	}

	return `vars['${i.var}'] = ${i.val};`;
}

function toOp(op) {
	switch (op) {

		case '=':
		case 'eq':
		return '==';

		case 'ne':
		return '!=';

		case 'gt':
		return '>';
	}

	return op;
}

function toValue(v) {
	if (typeof v == 'string')
		return `'${v}'`;

	return v;
}

function loadScript(code, bodyOnly=false) {

	const body = `
with (ctx) {
${code}
}
`;

	if (bodyOnly) return body;

	const script = `
function* call(ctx) {
${body}
}
`;

	return script;
// 	const script = `
// if (stack.length > 0) { 
// 	const cb = stack.pop();
// 	cb();
// } else {
// ${code}
// }
// `;

// 	return script;
}

function hashCode(s) {
	var hash = 5381, i = s.length;
	while(i) hash = (hash * 33) ^ s.charCodeAt(--i);

	return hash >>> 0;
}

class JsBuilder {

	constructor(ident='') {
		this.ident = ident;
		this.code = '';
	}

	openScope() {
		this.code += this.ident + '{\n';
		this.ident += '\t';
	}

	closeScope() {
		this.ident = this.ident.slice(1);
		this.code += this.ident + '}\n';
	}

	add(js) {
		this.code += this.ident + js + '\n';
	}

	push() {
		this.code += this.ident + 'stack.push(function() {\n';
		this.ident += '\t';
	}

	pop() {
		this.ident = this.ident.slice(1);
		this.code += this.ident + '});\n';
	}
}

class Menu {
	constructor() {
		this.builder = new JsBuilder('\t');
		this.components = [];
		this.menus = [];

		this.builtin = new Set(['back','exit','root','invalid_option']);
	}

	get info() {
		return {
			script: this.script
			, components: this.components
			, menus: this.menus
		};
	}

	load(data) {
		if (typeof data == 'string') {
			data = JSON.parse(data);
		}

		//Object.assign(this, data.meta);

		console.log('MENU', data);

		if (data.meta) {
			this.ns = data.meta.ns;
		}

		console.log('MENU: Loading menu in: ', this.ns);

		this.loadMenu(data.menu);

		// remove duplicates
		this.components = this.components.filter((v, i, a) => a.indexOf(v) === i);
		this.menus = this.menus.filter((v, i, a) => a.indexOf(v) === i);

		this.script = loadScript(this.builder.code, true);
	}

	loadMenu(menu) {
		const components = this.components;
		const menus = this.menus;
		const builder = this.builder;
		const items = [];

		for (let j = 0; j < menu.length; ++j) {
			const i = menu[j];

			//console.log('#', i);

			if (i.display) {
				///console.log('## DISPLAY', i.display);
				builder.add(loadDisplay(i.display));
			}
			else if (i.assign) {
				//console.log('## ASSIGN');
				builder.add(loadAssign(i.assign));
			}
			else if (i.ask) {
				builder.add(loadDisplay(i.ask.display));
				//builder.push();
				builder.add('yield;');

				builder.add(`vars['${i.ask.var}'] = input;`);

				this.loadMenu(menu.slice(j + 1));
				
				//builder.pop();
				break;
			}
			else if (i.item) {
				const disp = loadDisplay(`${i.item.selector}. ${i.item.display}`);
				builder.add(i.item.cond ? `if (vars['${i.item.cond}']) ${disp}` : disp);

				items.push(i.item);
			}
			else if (i.if) {
				const c = i.if;
				const op = toOp(c.op);
				if (Array.isArray(c.rhs)) {
					const a = c.rhs.map(i => typeof i == 'string' ? `'${i}'` : i);
					switch (op) {
						case '==':
						builder.add(`if ([${a.join(',')}].includes(vars['${c.var}']))`);
						break;

						default:
						builder.add(`if (![${a.join(',')}].includes((vars['${c.var}']))`);
						break;
					}
				}
				else {
					const values = c.rhs.split(',');
					if (values.length > 0)
						builder.add(`if ([${values.map(i => toValue(i)).join(',')}].includes(vars['${c.var}']))`);
					else
						builder.add(`if (vars['${c.var}'] ${op} ${toValue(c.rhs)})`);
				}

				builder.openScope();
				this.loadMenu(c.body);

				if (c.else) {
					builder.closeScope();
					builder.add('else');
					builder.openScope();

					this.loadMenu(c.else); 
				}

				builder.closeScope();
			}
			else if (i.menu) {
				this.loadMenu(i.menu);
			}
			else if (i.component) {
				console.log('MENU component:', i.component);

				let [ name, ns ] = i.component.name.split('@');
				if (!ns) ns = this.ns;

				const fullname = `${ns}comp${name}`;
				const id = hashCode(fullname);
				//console.debug('COMP', ns, name, '=>', id);

				builder.add(`call = ${id};`);
				builder.add('yield;');
				//builder.push();
				
				console.log('Menu Builder: adding component', id, fullname);
				// here
				//components.push({ name, ns });
				components.push(id);
				this.loadMenu(menu.slice(j + 1));
				
				//builder.pop();

				break;
			}
			else if (i.goto) {
				if (this.builtin.has(i.goto)) {
					builder.add(`invoke = '${i.goto}';`);
				}
				else {
					let [ name, ns ] = i.goto.split('@');
					if (!ns) ns = this.ns;

					if (['end', 'back', 'root'].includes(name) ||
						name.match(/^\*?([0-9]{2,4})(\*[0-9]{1,4})*#?$/)) {

						builder.add(`invoke = '${name}';`);
					}
					else {
						const id = hashCode(`${ns}menu${name}`);
						builder.add(`invoke = ${id};`);

						menus.push(id);
					}

					
				}

				builder.add('return;');
			}
		}

		if (items.length > 0) {

			builder.add('yield;');
			//builder.push();

			builder.add('switch (input)');
			builder.openScope();
			//ident += '\t';

			for (const i of items) {
				builder.add(`case '${i.selector}':`);
				if (i.cond) builder.add(`if (!vars['${i.cond}']) { invoke = 'invalid_option'; break; }`);

				//console.log('###', i.body);
				if (i.body) {
					this.loadMenu(i.body);
				}

				builder.add('break;');
			}

			builder.add('default:');
			builder.add("invoke = 'invalid_option';");
			builder.add('break;');

			//ident = ident.slice(1);
			// todo: add default to invalid option
			builder.closeScope();
			//builder.pop();
		}
	}
}

function parseMenu(content) {
	//console.log('Parsing menu:', content);
	const menu = new Menu;

	menu.load(content);

	return menu.info;
}

export {
	parseMenu
}
