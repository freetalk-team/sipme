
import { Header } from '../common.js';

const kShowResults = 5;

const kHead = {
	board: {
		title: 'Task Board',
		desc: 'Monitor project progress',
		icon: 'tasks'
	},

	ticket: {
		title: 'Ticket',
		desc: 'Edit ticket content',
		icon: 'tasks'
	}

};

const kSearchFields = {
	task: ['title', 'module', 'state', 'type', 'user' ]
};

const kHeader = ['editor-header-grid', null, 'editor-taskboard-actions'];
const kEditor = ['editor-scrollable', 'editor-taskboard-base'];

export class TaskPage extends UX.ListPage {

	static id = 'task';

	#current;
	#submit;
	#updates;
	#error = false;
	#loaded = false;
	#mode;
	#task;

	#tasks;

	set mode(m) {
		this.#mode = m;
		this.container.setAttribute('mode', m);
	}

	get current() { return this.#mode; }

	constructor () {
		const container = dom.renderTemplate('editor-base', kHead.board, 'div', kHeader, kEditor);
		super(container);

		this.mode = 'board';
		this.area.classList.add('hide');

		let e;

		this.#tasks = new TaskGroup(this);

		const view = this.querySelector('[view="edit"]');
		this.#task = app.task.wrap(view, 'editor-taskboard-edit');

		app.on('taskadd', e => this.#onTask(e.detail));
		// app.on('taskupdate', e => this.#onTaskUpdate(e.detail));
	}

	async open(action, id, reload=false) {

		action = action || 'board';

		if (action != this.current) {
			const header = new Header(this.headerElement);

			const { title, desc, icon } = kHead[action];

			header.title = title;
			header.desc = desc;
			header.icon = icon;
		} 

		if (id) {

			this.mode = 'task';

			this.toggleLoading();

			let data;

			if (!isNaN(id))
				id = parseInt(id);

			data = await delayResolve(this.#task.open(id), 1200);

			this.toggleLoading();

			this.#current = data;

			return;
		}

		this.mode = 'board';

		if (this.#current) {
			this.#current = null;
		}

		switch (action) {

			case 'board':
			if (!this.#loaded) {
				this.#loaded = true;
				this.#loadTasks();
			}
			break;

		}

	}

	onAction(name) {

		switch (name) {

			case 'reload':
			return this.open(this.current, null, true);
		}
	}

	onInput(e) {
		console.debug('Task editor on input', e.name);

		switch (e.name) {

			case 'mode': {
				const view = this.editorElement.querySelector('[view="main"]');

				if (view) {
					view.setAttribute('mode', e.value);
				}
			}
			break;
		}
	}

	#checkTitle(e) {
		const v = e.value.trim();
		if (v.length < 5) {
			e.classList.add('error');
			this.#error = true;
			this.#submit.disabled = true;
		}
		else  {
			e.classList.remove('error');
			this.#error = false;
			this.#submit.disabled = false;
		}
	}

	#onTask(info) {

		// const group = info.type == 'feature' ? 'feature' : 'issue';
		// const g = this.wrapGroup(group);

		// g.add(info, true);

		this.#tasks.add(info, true);

	}

	#onTaskUpdate({ id, data }) {

		if (!this.#current || this.#current.id != id) return;

		let e = this.querySelector('[view="edit"]');

		if (e) {
			Task.update(e, data);
		}

	}

	#renderTask(data) {
		const container = this.querySelector('[view="edit"]');
		container.innerHTML = '';

		const e = dom.renderTemplate('editor-taskboard-edit', data);

		container.appendChild(e);

	}

	#loadTasks() {
		return app.task.load(this.#tasks, false);
	}
}

class TaskGroup {

	#main;

	#issues;
	#tasks;
	#improvements;

	#assigned;
	#closed;

	constructor(editor) {
		this.#main = editor;
		this.#issues = editor.wrapGroup('issue');
		this.#tasks = editor.wrapGroup('task');
		this.#improvements = editor.wrapGroup('enhancement');
		this.#assigned = editor.wrapGroup('assigned');
		this.#closed = editor.wrapGroup('closed');

		// app.on('taskupdate', e => this.#onUpdate(e.detail));
		
	}

	add(task, top) {
		const g = this.#getGroup(task.status, task.type);
		return g.add(task, top);
	}

	get(id) {
		return this.#main.getElement(id);
	}

	rm(id) {
		let e = this.get(id);
		return dom.removeElement(e);
	}

	#getGroup(status, type) {
		let g;

		switch (status) {

			case 'assigned':
			g = this.#assigned;
			break;

			case 'closed':
			g = this.#closed;
			break;

			default:
			
			switch (type) {

				case 'task':
				g = this.#tasks;
				break;

				case 'enhancement':
				g = this.#improvements;
				break;

				default:
				g = this.#issues;
				break;
			}

			break;
		}

		return g;
	}

	handleUpdate(id, data) {

		const { field, newvalue } = data;

		if (field == 'status') {

			const e = this.rm(id);
			if (e) {
				const g = this.#getGroup(newvalue);
				g.insertTop(e);
			}
			else {
				// todo: load ?
			}

		}

	}
}
