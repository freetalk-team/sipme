//const { expandText, replaceVariables } = require('../server/ins/textUtil.js');

function display(ctx, msg) {
	const menu = ctx._menu;
	const text = typeof msg == 'object' ?  msg[menu.lang] : msg;
	//ctx._menu.output += expandText(ctx, text) + '\n'; // we can do that directly inside componet's code
	menu.output += text + '\n';
}

function item(ctx, selector, msg) {
	const menu = ctx._menu;

	//console.log('### ADDING ITEM', selector, msg);
	menu.selectors.push(String(selector));

	const text = typeof msg == 'object' ?  msg[menu.lang] : msg;
	//ctx._menu.output += `${selector}. ${replaceVariables(ctx, text)}\n`;
	menu.output += `${selector}. ${text}\n`;
}

async function render(ctx) {
	const menu = ctx._menu;
	//menu.output = '';

	//const { iterator } = menu.stack[menu.stack.length - 1];
	const iterator = menu.iterator;
	const { done } = await iterator.next();

	// Why do we have 3 diff vars for the same thing !!!
	// ctx.waiting = !done;
	//ctx.userResponse = !done;
	ctx.done = done;
	//ctx.respond = !done;

	// vars.response = menu.output;
	ctx.output = menu.output;

	//console.log('$$$$ Rendering DONE');
}

function respond(ctx, msg) {
	const menu = ctx._menu;

	if (msg) {
		ctx.userResponse = true;
		ctx.done = false;
		ctx.respond = true;

		menu.output = msg;

		//console.log('Preparing the response', msg);
	}
	else {

		//console.log('### RETURNING FINAL response');

		ctx.userResponse = false;
		ctx.done = true;
		ctx.respond = false;
		ctx.input = '';

		menu.output = '';
		menu.action = 'end';
	}
}

function* answer(ctx) {


	const menu = ctx._menu;
	const out = menu.output;

	//console.log('###### ANSWER CALLL:');

	while (true) {

		//console.log('## ANSWERING TO:', menu);

		yield;

		const selectors = menu.selectors;
		//console.log('### SELECTORS', selectors, ctx.input);

		if (selectors.length > 0 && !selectors.includes(ctx.input)) {

			//menu.stack.push(menu.output);

			menu.output = '';

			//console.log('### INVALID OPTION', ctx.input);

			display(ctx, { 
				eng: 'You have selected an invalid option',
				fra: 'Vous avez sélectionné une option invalide'
			});

			item(ctx, 1, { eng: 'Retry', fra: 'Réessayez'});
			item(ctx, 2, { eng: 'Exit', fra: 'Sortir '});

			yield;

			//ctx._menu.action = ctx.input == '1' ? 'back' : 'end';

			if (ctx.input == '1') {
				respond(ctx, out);
				continue;
			}

			//console.log('##EXITTTTTT');
			respond(ctx);	

			return;
		}

		//console.log('GOT VALID ANSWER!!!!!!');

		menu.output = '';

		selectors.splice(0, selectors.length);
		//menu.selectors = [];
		break;
	}
}

async function execute(vars, ctx, generator) {

	if (!ctx._menu) {

		const iterator = generator(vars, ctx);
		ctx._menu = { iterator, stack: [generator], lang: vars.language ? vars.language.toLowerCase() : 'eng', selectors: [], output: '' };

	}
	// if (ctx._menu.action == 'end') {
	// 	console.log('Terminating Dyamic menu');
	// 	return;
	// }
	// console.log('DMENU: Execute', ctx);

	const menu = ctx._menu;

	render: while (true) {

		await render(ctx);

		if (menu.action) {

			const action = menu.action;
			delete menu.action;

			switch (action) {

				// case 'end': {
				// 	console.log('## END:', ctx);
				// }
				// break;

				case 'back':
				case 'call': 
				continue render;
			}
		}

		break;
	}

	// console.log('## CTX', ctx);
}

async function* call(vars, ctx, iterator) {

	const menu = ctx._menu;

	menu.stack.push(iterator);
	menu.output = '';

	// yield * await iterator(vars, ctx);
	return iterator(vars, ctx);
}

function back(ctx) {
	const menu = ctx._menu;

	if (menu.stack.length > 1) {
		//console.log('MENU STACK', menu.stack);
		menu.stack.pop();
	}
	
	menu.iterator = menu.stack[menu.stack.length - 1](ctx.variables, ctx);
	menu.action = 'back';
}

export {
	display,
	item,
	answer,
	execute,
	call,
	back,
}
