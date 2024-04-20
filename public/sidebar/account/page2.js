import { SidebarPage } from '../base.js';

export default class AccountPage extends SidebarPage {

	static id = 'account';

	constructor(container) {
		super('account', container);
	}

	get showFilter() { return false; }

	load(settings) {

		let opt, g;
		
		opt = { 
			name: 'info', 
			icon: 'fa-info-circle stroke', 
			badge: true, 
			item: 'sidebar-base-item',
			actions: []
		};

		g = this.addGroup(opt);

		g.add({ id: 'profile', icon: 'fa-fw fa-xs profile wm6', cmd: 'edit-profile' });
	}

}

