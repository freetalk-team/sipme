import { Fields as CommonFields } from '../settings/fields.js';
import { DataSourceRestAdmin, DataSourceBackend, DataSourceDatabase } from '../../app/ds.js';

const kTicketApi = '/api/ticket/'
	, kSeverity = ['medium','low','high','critical']
	, kPriority = ['minor','major','blocker','critical','trivial']
	, kStatus = ['new','assigned','closed']
	, kType = ['issue', 'task', 'improvement', 'feature']
	;

const kPullCount = 5;
const kUpdateInterval = Config.task.update * 60;

const ds = new DataSourceBackend('task', new DataSourceRestAdmin('ticket'));

export class Task {

	#loaded = false;

	#tasks = [];
	#milestones;
	#components;

	#latest;
	#updater;


	get components() { return this.#components; }
	get milestones() { return this.#milestones; }
	get severity() { return kSeverity; }
	get priority() { return kPriority; }
	get status() { return kStatus; }

	constructor() {

		app.addDS(new TaskOwnDataSource);
		app.addDS(new TaskReportedDataSource);
		app.addDS(this, 'task');
	}

	async init() {

		const db = app.db;

		let e;

		e = await db.get('enum', 'component');
		this.#components = e.value;

		e = await db.get('enum', 'milestone');
		this.#milestones = e.value;

		const now = new Date().toJSON();
		const end = [app.email, now];
		const start = [app.email, '1985-05-03T00:00:00.000Z'];
		const own = await app.db.lsByRange('task', 'ownu', start, end , true, 30);
		const reported = await app.db.lsByRange('task', 'reportedu', start, end, true, 30);

		const tickets = new Set([ 
			...own.map(i => i.id.toString()), 
			...reported.map(i => i.id.toString())
		]);

		let time;

		if (own.length > 0)
			time = own[0].changetime;

		if (reported.length > 0) {

			if (!time || time < reported[0].changetime) 
				time = reported[0].changetime;
		}

		if (time) {
			const r = await ds.remote.query('updates', { time });

			console.debug('TASK updates', r.length);

			if (r.length > 0) {
				const groups = Object.groupBy(r, ({ ticket }) => ticket.toString());

				console.debug('###', groups);

				let changes, changetime, id;

				for (const [ticket, updates] of Object.entries(groups)) {

					id = parseInt(ticket);
					changes = updates.map(({ ticket, ...rest}) => rest);
					changetime = changes[changes.length - 1].time;
					
					await app.db.pushValue('task', id, 'change', changes);

					const u = { changetime };

					for (const i of changes) {

						if (i.field != 'comment') 
							u[i.field] = i.newvalue;

					}

					// todo: check exits

					await app.db.update('task', id, u);

				}
			}
		}




		// if (latest.length > 0)
		// 	this.#latest = latest[0]; 

	}


	async load(group=Dummy) {
		let  data, user;


		let last = localStorage.getItem('task_update');

		try {
			
			//ds = app.ds('task');
			data = await ds.local.ls();
			data.sort((a, b) => String.sort(b.time, a.time));

			if (!last && data.length > 0)
				last = data[0].time;

			console.debug('TASK loaded:', data);

			let e;

			for (const i of data.uniqueId()) {

				await loadTask(i);

				e = group.add(i);

			}
		}
		catch (e) {
			console.error('Failed to load tasks', e);
		}

		this.#tasks.push(group);

		app.runner.setTimeout(kUpdateInterval, async () => {

			console.debug('TASK updater', last);

			try {

				const r = await ds.remote.ls(0, 20, last);

				if (r.length > 0) {

					await ds.local.put(r);

					last = r[r.length - 1].time;
					localStorage.setItem('task_update', last);

					let e;

					for (const i of r) {

						await loadTask(i);

						e = group.add(i, true);

						e.classList.add('new');
						dom.highlightElement(e);
					}

					let msg = `### ${r.length} new tickets` + '\n';

					for (const i of r) {
						msg += `+ ${i.summary} (**${i.type}**)` + '\n';
					}

					app.showNotification('editor', msg, 'info', 10000);
				}

			}
			catch (e) {
				console.error('TASK failed to pull from remote');
			}
			
		}, true, 300);

		return data;
	}

	wrap(container, template='editor-taskboard-edit-task') {
		addListeners(container);
		return new TaskWrapper(container, template);
	}

	async update({ id, data }) {

		const ds = app.ds('email');
		const tasks = document.querySelectorAll(`[task][data-id="${id}"]`);

		data.author = await ds.get(data.author);

		for (const e of tasks) {
			await updateTicket(e, data);

			e.classList.add('new');

			dom.moveTop(e);
			dom.highlightElement(e);
		}

	}

	async updateOld({ id, data }) {

		let e;

		for (const g of this.#tasks) {

			e = g.get(id);

			if (e) {
				await updateTicket(e, data.field, data.newvalue, data.author);

				if (g.handleUpdate) 
					e = g.handleUpdate(id, data) || e;
				
			}
			else {
				await addChange(id, data);

				const ds = app.ds('task');
				const ticket = await ds.get(id);

				e = g.add(ticket);
			}

			if (e) {
				e.classList.add('new');

				dom.moveTop(e);
				dom.highlightElement(e);
			}

		}
	}

	perm(op, ticket) {
		if (app.sudo || app.isme(ticket.reporter)) 
			return true;

		if (op == 'rm') 
			return false;

		switch (op) {

			case 'comment':
			return true;
		}

		return false;
	}
}

class TaskDataSource {

	#time;
	#last;
	#index;
	#field;

	get name() { return 'taskown'; }

	constructor(index, field) {
		this.#index = index;
		this.#field = field;
	}

	async load(group) {

		if (!this.#time)
			this.#time = new Date;

		let data, more = true;

		const count = group.childCount();
		const local = ds.local;
		const remote = ds.remote;
		const user = app.email;


		try {

			data = await local.lsByIndex(this.#index, [user, this.#time], true, count, kPullCount);

			if (data.length > 0)
				this.#last = data[data.length - 1].time;

			if (data.length < kPullCount) {

				const q = {
					limit: kPullCount,
					user: this.#field
				};

				if (this.#last)
					q.time = this.#last;

				more = false;

				const r = await remote.query(null, q);

				if (r.length > 0) {

					console.debug('GOT results', r);

					await local.put(r);

					data.push(...r);

					more = r.length >= kPullCount;

					this.#last = r[r.length - 1].time;
				}

				let e;

				for (const i of data) {

					await loadTask(i);

					e = group.add(i);

					addListeners(e);
				}

			}

		}
		catch (e) {
			console.error('Failed to load own tasks:', e);
		}

		return more;

	}
}

class TaskOwnDataSource extends TaskDataSource {

	get name() { return 'taskown'; }

	constructor() {
		super('own', 'owner');
	}
}

class TaskReportedDataSource extends TaskDataSource {

	get name() { return 'taskreported'; }

	constructor() {
		super('reported', 'reporter');
	}
}

const Dummy = { 
	add() {},
	get() {}
}

class TaskWrapper {

	#container;
	#template;

	constructor(container, template) {
		this.#container = container;
		this.#template = template;
	}

	async open(id) {
		//const ds = app.ds('task');

		let data, e;

		try {

			if (typeof id == 'object')
				data = id;
			else
				data = await ds.get(id);

			const me = app.email;
			const update = data.reporter != me && data.owner != me;

			if (update) {
				const time = data.time;

				const updates = await ds.remote.query(data.id, { time });
				if (updates && updates.length > 0) {
					// updates.sort((a, b) => a.time - b.time);

					await app.db.pushValue('task', id, 'change', updates);

					if (!data.change) data.change = [];

					data.change.push(...updates);
					//for (const i of )
				}
			}

			await loadTask(data);

			this.#container.innerHTML = '';

			e = dom.renderTemplate(this.#template, data);

			this.#container.appendChild(e);

		}

		catch (e) {
			console.error('Failed to load task', e);
		}

		return data;
	}

}

async function loadTask(i) {
	const ds = app.ds('email');

	let user = await ds.get(i.reporter);

	if (user)
		i.reporter = user;

	if (i.owner) {
		user = await ds.get(i.owner);
		if (user)
			i.owner = user;
	}

	if (i.change) {
		// i.updates.map(i => i.label = getLabel(i.type));

		for (const j of i.change) {
			[j.label, j.text] = getLabel(j.field, j.newvalue || j.value);
			j.author = await ds.get(j.author);
		}
	}
}

function addListeners(e) {
	e.onclick = (event) => {

		const target = event.target;

		let handled = false;

		switch (target.tagName) {

			case 'BUTTON':
			handled = handleAction(target);
			break;

			case 'A':
			handled = handleCommand(target);
			break;

		}

		if (handled)
			event.stopPropagation();
	}

	e.onchange = (event) => {

		const target = event.target;

		let handled = false;

		switch (target.tagName) {

			case 'SELECT':
			handleChange(target);

			case 'TEXTAREA': // hidden textarea for MD
			handled = true;
			break;
		}

		if (handled)
			event.stopPropagation();

	}
}

function handleChange(target) {

	const field = target.name;
	const value = target.value;

	let e = target.closest('[data-id]');

	updateTicket(e, { field, value, time: new Date, author: app.user });
}

function handleAction(target) {
	let handled = true;

	const e = target.closest('[data-id]');
	const action = target.name;

	switch (action) {


		case 'comment': {

			const text = getComment(target);

			if (text)
				addComment(e, text);
		}
		break;

		case 'edit': {

			const parent = target.parentElement;
			const element = parent.querySelector('textarea');
			const submit = e.querySelector('button[name="submit"]');

			parent.setAttribute('edit', '');

			const mde = MDE.wrap(element);
			mde.codemirror.on("update", (v) => submit.disabled = false);

			element.mde = mde;
		}
		break;

		case 'submit':
		updateTicketDescription(e, true);
		break;

		case 'cancel': 
		updateTicketDescription(e, false);
		break;

		default:
		handled = false;
		break;
	}

	return handled;
}

function handleCommand(target) {

	const cmd = target.getAttribute('name');
	const e = target.closest('[data-id]');

	switch (cmd) {

		case 'assign':
		updateTicket(e, 'owner', app.email);
		updateTicket(e, 'status', 'assigned');
		break;

		case 'unassign':
		updateTicket(e, 'status', 'new');
		break;

		case 'close':
		updateTicket(e, 'status', 'closed');
		break;


		default:
		return false;
	}

	return true;
}

function updateTicketDescription(e, update=true) {
	const parent = e.querySelector('[edit]');

	if (parent) {

		parent.removeAttribute('edit');

		const textarea = parent.querySelector('textarea');

		if (textarea.mde) {
			textarea.mde.toTextArea();
			delete textarea.mde;

			if (update) {
				const text = textarea.value;
				console.debug('Description update:', text);

				updateTicket(e, 'description', text);
			}

		}


	}

	const submit = e.querySelector('button[name="submit"]');
	submit.disabled = true;
}

function getLabel(type, value) {

	if (type == 'comment')
		return ['commented', value];


	return ['updated ' + type ];
}

function getComment(button) {
	const container = button.parentElement;
	const input = container.firstElementChild;
	const text = input.innerText.trim();

	input.innerText = '';

	return text;
}

async function addComment(e, text) {

	const id = e.dataset.id;

	console.debug('Adding ticket comment', id, text);

	const data = {
		author: app.user,
		value: text,
		field: 'comment',
		time: new Date
	};

	try {
		// todo: use data source

		await updateTicket(e, data);


	}
	catch (e) {
		console.error('Failed to add comment', e);
	}
}

async function addChange(id, data) {

	data.author = app.email;

	await app.db.pushValue('task', id, 'change', data);

	const u = {};

	u[data.field] = data.newvalue;
	u.changetime = data.time || Date.now();

	await app.db.update('task', id, u);

	app.emit('taskupdate', { id, data });
}

async function updateTicket(e, data) {

	const { field, value } = data;

	const id = e.dataset.id;

	await updateField(id, data);

	updateFieldItem(e, field, value);

	const container = e.querySelector('[role="updates"]');
	if (container) {

		const updates = UX.List.wrapGroup(container);

		[ data.label, data.text ] = getLabel(field, value);

		updates.add(data);
	}
}

async function updateField(id, { field, value, author, time }) {
	console.debug('Update ticket field', id, field, value);

	if (typeof author == 'object')
		author = author.id;

	const update = {
		value,
		field,
		time
	};

	try {

		if (!isNaN(id))
			id = parseInt(id);
		// todo: use data source

		// todo: improve
		if (app.isme(author)) {
			const r = await ajax.post(kTicketApi + `update/${id}`, update);

			update.time = r.time;
		}

		update.newvalue = value;
		delete update.value;

		await addChange(id, update);
	}
	catch (e) {
		console.error('Failed to add comment', e);
	}

	return update;
}

function updateFieldItem(item, field, value) {

	switch (field) {

		case 'description':
		updateDescription(item, value);
		break;

		case 'owner':
		updateOwner(item, value);
		break;

		case 'comment':
		break;

		default:
		updateTicketField(item, field, value);
		break;
	}

	
}

function updateDescription(parent, text) {
	const md = parent.querySelector('.md');
	md.innerHTML = dom.markdown(text);

	const now = Date.now();
	const tm = parent.querySelector('time');

	tm.dataset.time = Date.seconds();
	tm.innerText = 'now';

	// 	renderUpdate(e, app.user, 'updated description');
}

async function updateOwner(parent, user) {

	if (typeof user == 'string') {

		const ds = app.ds(user.isEmail() ? 'email' : 'contact');

		user = await ds.get(user);
	}

	updateTicketField(parent, 'owner', user || '');
}

function updateTicketField(parent, field, value) {

	let e;

	e = parent.querySelector(`[role="${field}"]`);
	if (!e) return;

	if (['owner'].includes(field)) {
		e.innerHTML = '';
		e.appendChild(dom.renderTemplate(`task-${field}`, value));
	}
	else {
		switch (e.tagName) {

			case 'SELECT':
			e.value = value;
			break;

			default:
			e.innerText = value;
			break;

		}
	}
}

class DataSourceTicket extends DataSourceRestAdmin {

	constructor() {
		super('ticket');
	}

	async ls(...params) {
		const data = await super.ls(...params);

		for (const i of data) {
			if (typeof i.time == 'string') i.time = new Date(i.time).getTime();
			if (typeof i.changetime == 'string') i.changetime = new Date(i.changetime).getTime();
		}

		return data;
	}
}

const kNewTask = [
	CommonFields.string({ name: 'summary', title: 'Title' }),
	CommonFields.option({ name: 'type', options: kType }),
	CommonFields.option({ name: 'component', options: function() { return app.task.components } }),
	CommonFields.option({ name: 'milestone', options: function() { return app.task.milestones } }),
	CommonFields.option({ name: 'severity', options: kSeverity }),
	CommonFields.option({ name: 'priority', options: kPriority }),
	// CommonFields.option({ name: 'status', options: ['new', 'doing', 'testing', 'done']}),
	CommonFields.text({ name: 'description', md: true })
];

AddEditor.register('task', kNewTask, async (data) => {

	console.debug('On add new task', data);

	//const ds = app.ds('task');

	try {

		data.description = data.description || '**todo**: *add description*';
		data.status = 'new';

		await ds.put(data);

		data.time = data.changetime = Date.now();

		// console.debug('New task added', data);

		app.openEditor('task', 'ticket', data);
		app.emit('taskadd', data);

	}
	catch (e) {
		console.error('Failed to add new task', e);
	}

});

// App.Commands.register('task-ticket-assign', (id) => {
// 	updateField(id, 'owner', app.email);
// 	updateField(id, 'status', 'assigned');
// })
// ;
// App.Commands.register('task-ticket-unassign', (id) => {
// 	updateField(id, 'owner');
// 	updateField(id, 'status', 'new');
// });

// App.Commands.register('task-ticket-close', (id) => {
// 	updateField(id, 'status', 'closed');
// });