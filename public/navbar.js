
class Navbar {

	#current;
	#selected;
	#container;
	//#missed = new Set;

	get selected() { return this.#container.querySelector('button.selected'); }
	get active() { return this.#current; }

	constructor(container='navbar') {
		let e = document.getElementById(container);

		if (!e) 
			e = dom.createElement('div');

		e.onclick = (event) => {
			const target = event.target;
			if (target.tagName != 'BUTTON') return;

			const action = target.name;
			if (!action) return;

			// console.log('## ', action);
			this.switchTo(action, target);
		}

		this.#container = e;

		// this.current = null;
		// this.actions = actions;

		app.on('channelmsg', data => this.#onMessage('channel', data.detail));
		app.on('chatmsg', data => this.#onMessage('contact', data.detail));
		app.on('roommsg', data => this.#onMessage('contact', data.detail));
		app.on('gamemsg', data => this.#onMessage('game', data.detail));
		app.on('hangup', e => {
			const msg = e.detail;
			if (msg.missed)
				this.#onMessage('contact', data.detail)
		});


	}
e
	item(id) { 
		return this.#container.querySelector(`button[name="${id}"]`); 
	}

	addAction({ id, icon }) {
		const container = this.#container.querySelector('.actions');
		const e = dom.createElement('button', 'icon', 'item');
		e.title = id.capitalizeFirstLetter();
		e.dataset.action = id.toLowerCase();
		e.innerHTML = `<i class="fa ${icon}"></i>`;

		container.appendChild(e);
	}

	show() {
		dom.showElement(this.#container);
	}

	hide() {
		dom.hideElement(this.#container);
	}

	switchTo(id, e) {


		if (this.#current == id) {

			if (!['home', 'task'].includes(id)) {
				if (this.#selected)
					this.#selected.classList.toggle('selected');

				this.toggle();
			}

			return;
		}

		this.clearSelection();
		this.select(id, e);

		if (e) {

			const badge = e.querySelector('.badge');
			if (badge) {
				e.removeChild(badge);
			}
		}

		this.onChange(id);
	}

	clearSelection() {
		if (this.#current) {
			this.#current = null;
		}

		const selected = this.selected;
		if (selected) {
			selected.classList.remove('selected');
		}
	}

	select(id, e) {
		if (!e) 
			e = this.item(id);

		this.#current = id;
		this.#selected = e;

		if (e)
			e.classList.add('selected');
	}

	onOpenEditor(type) {

		if (this.#current != type) {

			if (this.#current == 'home')
				this.clearSelection();
			
			if (['task', 'help'].includes(type)) {
				this.clearSelection();
				this.select(type);
			}
		}

	}

	addNotification(id, data) {

		// if (this.#missed.has(data.user))
		// 	return;

		// this.#missed.add(data.user);

		const e = this.item(id)

		let badge = e.querySelector('.badge');
		let count = 0;

		if (badge) {
			const text = badge.innerText;
			if (text == '9+') return;

			count = Number(text);
		}
		else {
			badge = document.createElement('div');
			badge.classList.add('badge');

			e.appendChild(badge);
		}

		count++;

		if (count > 9) {
			badge.innerText = '9+';
		}
		else {
			badge.innerText = `${count}`;
		}
	}


	onChange() {}
	toggle() {}

	#onMessage(id, data) {

		if (this.selected && id == this.selected.name)
			return;

		if (!data.own) {
			this.addNotification(id, data);
		}
	}
}

export {
	Navbar
}
