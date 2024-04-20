
import * as dmenu from './common/dmenu.js';
import { parseMenu } from './common/menu.js';

const MenuMixin = {
	createNewMenu() {
		console.log('Create new menu request');

		this.sidebar.clearSelection();
		this.editor.openNewMenu();
	}

	, importNewMenu() {
		console.log('Import menu request');

		this.sidebar.clearSelection();
		this.editor.importNewMenu();
	}

	, onNewMenu(info) {
		console.log('New menu:', info);

		const name = info.name;

		info.display = name;
		info.name = name.toLowerCase().replace(/ +/g, '_');

		const id = `${info.ns}${info.type}${info.name}`.hashCode();

		info.id = id;
		info.dirty = true;
		info.refs = [];
		info.rev = 1;

		this.menus.push(`${info.name}@${info.ns}`);

		this.sidebar.add(info);
		this.sidebar.setDirty(id);

		const kNewMenu = { menu: [
			{ display: 'Welcome %msisdn% !' }, 
			{ 
				item: { 
					display: 'Exit'
					, selector: 9
					, body: [ { goto: 'end' } ]
				}
			}
		] };

		let menu = kNewMenu;
		if (info.menu) {
			//const yaml = await readFile(info.menu);
			menu = fromYaml(info.menu);
		}

		localStorage.setItem(`${id}*`, JSON.stringify(menu));

		this.currentObject = info;

		this.objects.set(id, info);
		this.save();

		this.sidebar.open(id);
		this.editor.openMenu(info, menu);
	}

	, createNewComponent() {
		console.log('Create new component request');
	}

	, createNewConfig() {
		console.log('Create new config request');
	}

	, createNewDeployment() {
		console.log('Create new config deployment');
	}

	, removeObject() {
		if (!this.currentObject) return;

		const id = this.currentObject.id;
		const rev = this.currentObject.rev;

		this.objects.delete(id);
		this.save();

		localStorage.removeItem(id);

		this.sidebar.delete(id);
		this.editor.switchTo('welcome');

		if (rev > 0)
			ajax.delete(`api/menu/${id}`);
	}

	, onMenuChange(code) {
		console.log('Menu change:', code);

		code.meta = {
			ns: this.currentObject.ns
			, name: this.currentObject.name
		};

		this.handleChange(JSON.stringify(code));
	}

	, onComponentChange(code) {

		// experimental. Set dirty the menus which reffers to that component
		// note: if the menu is not loaded in localStorage, the refferences won't e loaded

		if (!this.currentObject.dirty) {
			const objects = this.findReferences();
			for (const i of objects) {

				if (!i.dirty) {
					//i.dirty = true;
					this.sidebar.setWarning(i.id);
				}
			}
		}

		this.handleChange(code, false);
		this.save();
	}

	, handleChange(code, save=true) {
		//const o = this.objects.get(this.current);
		//o.dirty = true;
		const id = this.currentObject.id;

		localStorage.setItem(`${id}*`, code);

		// if (this.currentObject.type == 'comp') {
		// 	if (this.currentObject.call) {

		// 		delete this.currentObject.call;
		// 		this.loadObject(this.currentObject);
		// 	}
				
		// }

		if (!this.currentObject.dirty) {
			this.currentObject.dirty = true;
			this.sidebar.setDirty(id);
			this.editor.dirty = true;

			if (save)
				this.save();
		}


		// todo: update localStorage
	}

	, exportMenu(format='yaml') {
		const name = this.currentObject.name;
		const id = this.currentObject.id;
		//let data = getObject(this.currentObject.id);
		let data = localStorage.getItem(`${id}*`) || localStorage.getItem(id);

		if (format == 'yaml') {

			const o = JSON.parse(data);
			data = toYaml(o, {
				sortKeys: function(a, b) {
					// put 'meta' section on top
					if (b == 'meta') return 1;
					if (a == 'body') return 1;

					return -1;
				}
			});
		}
		else if (format == 'js') {

			const info = parseMenu(data);

			// console.log('Parsing menu:', info);
			// return;

			data = info.script;
		}

		download(data, 'text/plain', `${name}.${format}`);

	}

	

	, updateLocalStorage(objects) {
		//console.log('Updating local storage', objects);

		for (const i of objects)
			i.head = i.rev;

		const data = localStorage.getItem('objects');
		if (!data) {
			console.log('Local storage do not exists. Building data ...');
			//console.log(objects);

			this.objects = new Map(objects.map(i => [i.id, i]));
			this.save(true);

			return;
		}

		const locals = new Map(JSON.parse(data));
		for (const [id, i] of locals) {
			if (localStorage.getItem(`${id}*`) != null)
				i.dirty = true;

			//console.log('Checking KEY:', `${id}*`, i.dirty);
		}
		//console.log('Locals:', locals);

		const objs = new Map;

		for (const i of objects) {

			const o = locals.get(i.id);
			if (o) {
				i.rev = o.rev;
				//o.state = 'up';

				i.dirty = o.dirty;
			}

			objs.set(i.id, i);
		}

		// adding the local not pushed objects
		for (const i of locals.values()) {
			if (i.rev == 0 && !objs.has(i.id)) {
				objs.set(i.id, i);
			}
		}

		this.objects = objs;

		//console.log('Loaded objects from local storage:', objs);

		this.save(true);
	}

	, detectChanges() {
		const o = this.currentObject;
		const changes = [];

		if (o.dirty) {
			changes.push(o);
		}

		for (const i of o.refs) {
			const id = i[0];
			const o = this.objects.get(id);
			//console.log('IS DIRTY', o);
			if (o && o.dirty) {
				changes.push(o);
			}

		}

		console.debug('Changes detected:', changes);

		return changes;
	}

	// for components
	, findReferences() {

		const id = this.currentObject.id;
		const objects = [];

		for (const i of this.objects.values()) {
			if (i.type != 'menu') continue;
			if (!i.refs) continue;

			// console.log('#', i);
			for (const j of i.refs) {
				const rid = j[0];
				if (rid == id) {
					objects.push(i);
					break;
				}
			}
		}

		console.log('## FOUND refs:', objects);

		return objects;
	}

	, async push2() {
		if (!this.currentObject) return 'No menu selected';

		const o = this.currentObject;
		const id = o.id;

		if (!o.dirty) {
			return 'Menu is not changed. Nothing to push\n';
		}

		const content = localStorage.getItem(`${id}*`);

		const req = {
			id
			, display: o.display
			, name: o.name
			, ns: o.ns
			, type: o.type
			, data: JSON.stringify({ meta: { refs: []}, content})
		};

		const res = await ajax.post(`api/menu/${id}`, req, { x: userInfo.uri });

		this.sidebar.clearChanges(id);

		o.dirty = false;
		localStorage.removeItem(`${id}*`);
		localStorage.setItem(id, content);

		this.save(true);

		return `'${o.display}' pushed successfully`;
	}

	, async push() {
		if (!this.currentObject) return 'No menu selected';

		const o = this.currentObject;
		const id = o.id;
		const ls = window.localStorage;

		// const tt = parseMenu(JSON.parse(window.localStorage.getItem(id)));
		// console.log(tt);

		const changed = this.detectChanges();
		if (changed.length == 0) {
			return 'Menu is not changed. Nothing to push\n';
		}

		let out = changed.map(i => `${i.type} => ${i.name}`).join('\n') + '\n';
		out += '\nPushing objects ...\n';

		// Building the request
		const req = {
			id
			, rev: o.rev
		};

		if (o.dirty) {
			req.content = JSON.parse(ls.getItem(id));
			changed.shift();
		}

		if (o.rev == 0) {
			req.name = o.name;
			req.ns = o.ns;
		}

		//console.debug('## CHANGED COMPS', changed);

		const components = [];

		for (const i of changed) {
			//console.log('#######', i);
			components.push({ 
				id: i.id, 
				rev: i.rev, 
				content: ls.getItem(i.id) 
			});
		}

		//console.log('COMPS1:', components);

		for (const i of o.refs) {
			const id = i[0];
			const rev = i[1];
			if (!changed.find(j => j.id == id))
				components.push({ id, rev });
		}
		//console.log('COMPS2:', components);

		req.components = components;

		const res = await ajax.post(`www/menu/${id}`, req, { x: userInfo.uri });

		if (res.error) {
			const e = res.error;
			out += `Error: ${e.msg}\n`;
			
			const o = this.objects.get(e.id);
			out += `${o.type} => ${o.name}\n`;

			return out;
		}

		o.rev += 1;

		if (o.dirty) {
			delete o.dirty;
		}

		this.sidebar.update(id, o.rev);

		//console.log('Updating references', res.refs);
		for (const i of res.refs) {

			const id = i[0];
			const o = this.objects.get(id);

			if (o.dirty) {
				delete o.dirty;
				o.rev += 1;

				out += `${o.type} => ${o.name} r${o.rev}\n`;

				this.sidebar.update(id, o.rev);
			}
		}

		this.save();

		out += `menu => ${o.name} r${o.rev}\n`; 

		return out;
	}

	, async executeLocalMenu(req) {
		if (!this.currentObject) return;

		let ctx;
		if (req.response) {
			ctx = this.currentObject.ctx; 
			if (!ctx) {
				console.error('APP: Failed to execute response without context');

				return { render: 'Invalid context', respond: false };
			}

			ctx.input = req.response;

		} else {
			const menu = this.editor.build();
			//console.log(menu);

			const info = parseMenu(menu);
			console.log(info);

			const [service, input] = parseUssd(req.ussd);

			ctx = {
				output: ''
				, input: ''
				, call: null
				, invoke: null
				, evaluate
				, vars: { msisdn: req.msisdn }
				, responses: input ? input.split('*') : []
				//, request: { get: sendRequest, post: postRequest }
				, components: new Map
				, component: null
			}

			const generator = new GeneratorFunction('ctx', info.script);
			const iterator = generator(ctx);

			ctx.menu = [iterator];

			this.currentObject.ctx = ctx;
		}

		execute: do {
			ctx.output = '';

			if (ctx.component) {

				const comp = ctx.component;
				const callctx = comp.ctx;

				callctx.done = true;
				callctx.input = ctx.input;

				try {
					console.log('# Calling component VARS before:', ctx.vars);
					await comp.call(ctx.vars, callctx);

					if (callctx.output) {
						ctx.output += callctx.output;
						callctx.output = '';
					}

					ctx.done = callctx.done;

					if (!callctx.done) {

						ctx.input = ctx.responses.shift();
						if (ctx.input) continue;

						break;
					}

					delete ctx.component;
				}
				catch (e) {
					console.error('APP: Component call =>', e);
					return { render: 'Internal server error: component call', respond: false };
				}

			}

			const iterator = ctx.menu[ctx.menu.length-1];
			
			ctx.done = iterator.next().done;

			console.log('# CTX:', ctx);

			if (ctx.done) {
				ctx.menu.pop();

				if (ctx.invoke) {

					let goto = ctx.invoke;
					delete ctx.invoke;

					if (goto == 'end') {
						ctx.done = true;
						break;
					}

					if (goto == 'back') {
						console.log('APP: Calling previous menu');

						// we have to call generator functon again
						if (ctx.menu.length > 0) {
						}

						break;
					}

					const m = goto.match(/^\*?([0-9]{2,4})(\*[0-9]{1,4})*#?$/);
					if (m) {

						const route = m[1];

						goto = this.routes.get(route);
						if (!goto) throw new Error(`Invalid route: ${route}`);
					}

					console.log('APP: Call menu =>', goto);

					const menu = this.objects.get(goto);
					if (!menu) throw new Error('Cannot execute non-exisitng menu');

					const { call } = await this.loadObject(menu);

					ctx.menu.push(call(ctx));

					continue;
					
				}
			} else {

				if (ctx.call) {

					const id = ctx.call;
					ctx.call = null;

					console.log('Calling component:', id);

					const comp = this.objects.get(id);
					// if (!comp) throw new Error('Calling unknown component');
					if (!comp) {
						console.error('Unknown component call:', id, this.objects);
						return { render: 'Internal server error: Unknown component', respond: false };
					}

					if (!comp.call || comp.dirty) {

						await this.loadObject(comp);
					}

					let callctx = ctx.components.get(id);
					if (!callctx) {
						callctx = { request: ajax, dmenu, done: true };
						ctx.components.set(callctx);
					}

					console.log('### Continue call component');
					ctx.component = { call: comp.call, ctx: callctx };
					continue execute;
				}
				// else if (ctx.invoke) {

				// 	console.log('APP: Call menu =>', ctx.invoke);
				// }

			}

			ctx.input = ctx.responses.shift();

			if (!ctx.input)
				break;

		} while (true);

		return { render: ctx.output, respond: !ctx.done };
	}

	, async executeMenu(req) {

		if (!this.currentObject) return;

		const id = this.currentObject.id;
		let path = `/api/menu/exec/${id}`;

		req.refs = [];

		if (this.currentObject.dirty) {
		//const res = await postRequest(`api/exec/${id}/head`, req, { x: 'pavel@csys.dev' });

			req.menu = this.editor.build();
			req.menu.meta = { ns: this.currentObject.ns, name: this.currentObject.name }
			req.type = 'json';

			const { script, components } = parseMenu(req.menu);

			console.log('Menu is dirty. Adding all of the components', components, '\n', script);

			for (const i of components) {
				const o = this.objects.get(i);

				if (o.dirty) {
					req.refs.push([o.id, getObject(o.id)]);
				}
				else {
					req.refs.push([o.id, o.rev]);
				}
			}
			// parse the menu and check the references for changes
		}
		else {
			// const rev = req.rev || 'head';
			const rev = this.currentObject.rev;
			path += `/${rev}`;

			req.rev = rev;

			// check references for changes
			if (this.currentObject.refs) {
				for (const i of this.currentObject.refs) {
					const id = i[0];

					// pushing only dirty components
					const o = this.objects.get(id);
					if (o.dirty) {
						req.refs.push([id, getObject(id)]);
					}
					// else {
					// 	req.refs.push(i);
					// }
				}
			}
		}
		
		const res = await ajax.post(path, req, { x: userInfo.uri});
		console.log('Execute reponse', res);

		return res;

	}

	, async executeResponse(req) {
		if (!this.currentObject) return;

		const id = this.currentObject.id;
		let path = `/api/menu/exec/${id}`;

		const res = await ajax.post(path, req, { x: userInfo.uri });
		//console.log('Execute reponse', res);
		return res;
	} 

	, async openMenu(id) {
		//console.log('APP open request', id, this.currentObject.id);

		//if (this.currentObject && this.currentObject.id == id) return;

		this.sidebar.clearSelections('editor');

		console.log('Opening menu', id,);

		const { o, content } = await this.loadContent(id);

		//console.log('APP: content loaded:', content);
	
		this.currentObject = o;

		switch (o.type) {

			case 'menu':
			this.editor.openMenu(o, content);
			break;

			case 'comp':
			this.editor.openComponent(o, content);
			break;
		}

	}

	, async loadObject(o) {

		// throw new Error('From wehere it comes');

		if (typeof o == 'number')
			 o = this.objects.get(o);

		console.log('Loading object:', o.id, o.dirty);

		if (o.call && !o.dirty) return o.call;
			 
		const id = o.id;
		const ismenu = o.type == 'menu';



		// no need to check, must be there 
		// todo: add rev as part of the key ???
		// let data = localStorage.getItem(id);
		let data = o.dirty ? localStorage.getItem(`${id}*`) : localStorage.getItem(id);
		if (!data) {
			// console.log('APP: Loading from remote');

			const info = await ajax.get(`www/menu/${id}`);

			data = JSON.parse(info.data).content;

			o.dirty = false;
			localStorage.setItem(id, data);
		}

		// console.log('Data: ', data);
		// const { content } = JSON.parse(data);

		if (ismenu) {

			const { script } = parseMenu(data);

			o.call = new GeneratorFunction('ctx', script);

		}
		else {
			o.call = new AsyncFunction('vars', 'ctx', `with (ctx) { ${data} }`);
		}

		return o;
	}

}

export {
	MenuMixin
}