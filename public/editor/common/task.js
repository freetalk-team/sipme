
import { Fields as CommonFields } from '../settings/fields.js';

const kTicketApi = '/api/ticket';

export const Task = {

	async load(group=Dummy) {

		let ds, data, user;

		try {

			if (!app.Task) {
				app.Task = this;

				let data;

				data = await app.db.get('enum', 'component');
				this.components = data.value;

				data  = await app.db.get('enum', 'milestone');
				this.milestones = data.value;
			}

			ds = app.ds('task');
			data = await ds.ls();

			console.debug('TASK loaded:', data);


			for (const i of data) {

				await this.loadTask(i);

				group.add(i);
			}
		}
		catch (e) {
			console.error('Failed to load tasks', e);
		}

		return data;
	}

	, async loadTask(i) {
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

	, async open(item) {
		const id = parseInt(item.dataset.id);
		const ts = parseInt(item.dataset.updated);

		const updated = new Date(ts);
		const now = new Date;

		if ((now - updated) / 60_000 > 5) {

			const params = new URLSearchParams;

			params.set('time', updated.getTime());

			try {

				const data = await ajax.get(kTicketApi + `/${id}?` + params.toString());
				// console.log('CHANGES', data);

				//const _updated = updated.getTime();
				// item.dataset.updated = _updated;

				//await app.db.update('task', id, { _updated });



				if (data.length > 0) {
					app.emit('taskupdate', { id, data });
				}

			} catch (e) {
				console.error('TASK failed to open');
			}
			
		}
	}

	, async update(item, data) {

		data = Array.isArray(data) ? data : [ data ];

		const ds = app.ds('email');
		const updates = UX.List.wrapGroup(item.querySelector('[role="updates"]'));

		for (const i of data) {

			i.author = await ds.get(i.author);
			[ i.label, i.text ] = getLabel(i.field, i.newvalue);

			updates.add(i);

			if (i.field != 'comment')
				this.updateField(item, i.field, i.newvalue);
		}
	
	}

	, handleAction(action, e, target) {

		let handled = true;

		switch (action) {


			case 'comment': {

				const text = getComment(target);
				const id = e.dataset.id;

				if (text)
					addComment(id, text);
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
		}

		return handled;
	}

	, handleCange(e, item) {

		if (!item) {
			item = e.closest('[data-id]');
		}

		updateField(item.dataset.id, e.name, e.value);

	}

	, updateField(item, field, value) {

		switch (field) {

			case 'description':
			updateDescription(item, value);
			break;

			case 'owner':
			updateOwner(item, value);
			break;

			default:
			updateTicketField(item, field, value);
			break;
		}

	}
}

const Dummy = { add() {} }


async function updateField(id, field, value) {
	console.debug('Update ticket field', id, field, value);

	const update = {
		author: app.email,
		value,
		field,
		time: Date.now()
	};

	try {

		id = parseInt(id);
		// todo: use data source

		await ajax.post(kTicketApi + `/update/${id}`, update);

		update.newvalue = value;
		delete update.value;

		await app.db.pushValue('task', id, 'change', update);

		const u = {};

		u[field] = value;
		u.changetime = update.time;

		await app.db.update('task', id, u);

		app.emit('taskupdate', { id, data: update });
	}
	catch (e) {
		console.error('Failed to add comment', e);
	}
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

				const id = e.dataset.id;

				updateField(id, 'description', text);

			}

		}


	}

	const submit = e.querySelector('button[name="submit"]');
	submit.disabled = true;
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

function getComment(button) {
	const container = button.parentElement;
	const input = container.firstElementChild;
	const text = input.innerText.trim();

	input.innerText = '';

	return text;
}

function getLabel(type, value) {

	if (type == 'comment')
		return ['commented', value];


	return ['updated ' + type ];
}

async function addComment(id, text) {
	console.debug('Adding ticket comment', id, text);

	const data = {
		author: app.email,
		value: text,
		field: 'comment',
		time: Date.now()
	};

	id = parseInt(id);

	try {
		// todo: use data source

		await ajax.post(kTicketApi + `/update/${id}`, data);

		data.newvalue = data.value;
		delete data.value;

		await app.db.pushValue('task', id, 'change', data);

		app.emit('taskupdate', { id, data });
	}
	catch (e) {
		console.error('Failed to add comment', e);
	}
}

const kNewTask = [
	CommonFields.string({ name: 'summary', title: 'Title' }),
	CommonFields.option({ name: 'module', options: ['UI', 'Backend']}),
	CommonFields.option({ name: 'type', options: ['issue', 'improvement', 'feature']}),
	CommonFields.option({ name: 'severity', options: ['medium', 'low', 'high', 'critical']}),
	CommonFields.option({ name: 'status', options: ['new', 'doing', 'testing', 'done']}),
	CommonFields.text({ name: 'description', md: true })
];

AddEditor.register('task', kNewTask, async (data) => {

	console.debug('On add new task', data);

	const ds = app.ds('task');

	try {

		data.description = data.description || '**todo**: *add description*';

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

App.Commands.register('task-ticket-assign', (id) => {
	updateField(id, 'owner', app.email);
	updateField(id, 'status', 'assigned');
})
;
App.Commands.register('task-ticket-unassign', (id) => {
	updateField(id, 'owner');
	updateField(id, 'status', 'new');
});

App.Commands.register('task-ticket-close', (id) => {
	updateField(id, 'status', 'closed');
});
