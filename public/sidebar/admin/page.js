import { SidebarPage } from '../base.js';

class AdminPage extends SidebarPage {

	static id = 'admin';

	#editors;

	constructor(id='admin') {
		super('admin', id);
	}

	get showFilter() { return false; }

	reload() {
		console.log('ADMIN: reloading');
		//this.list.update();
	}

	async load(settings) {

		let opt = { name: 'site', badge: true, item: 'sidebar-base-item',
			actions: []
		};

		const g = this.addGroup(opt);

		g.add({ id: 'user', icon: 'fa-user', add: 'invite-new-user', cmd: 'open-user-admin' });
		g.add({ id: 'room', icon: 'fa-user-friends', add: 'create-new-room', cmd: 'open-room-admin' });

	}

	add(info) {


	}

	update() {
		
	}

	onAction(action, group) {

		console.debug('SB Admin on action:', action, group);

		switch (action) {
			case 'add':
			this.#handleAdd(group);
			break;

		}
	}

	async onClick(id) {

		console.debug('Sidebar admin on click:', id);

		// todo
		// this.clearSelection();

		switch (id) {

			case 'user': 
			break;

			case 'room': 
			break;

		
			

		}
	}

	#handleAdd(group) {

		switch (group) {
		
		}
	}

	

	static defaultSettings() {
		return { 
			admin: {
				visible: 16
			},
		};
	}

	

	
}

export default AdminPage;