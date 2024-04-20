import { SidebarPage } from '../base.js';

export default class WikiPage extends SidebarPage {

	static id = 'help';

	static action = {
		id: 'wiki',
		icon: 'wiki'
	}

	get title() { return 'Support'; }
	get showFilter() { return false; }

	constructor(id='sidebar-game') {
		super(WikiPage.id, id);
	}

	load(settings) {
		console.log('SB: load wiki');

		this.addItemTemplate('sidebar-base-item', { icon: 'fa-search', name: 'Search', cmd: 'open-search-wiki' });
		this.addItemTemplate('sidebar-base-item', { icon: 'tasks', name: 'Task board', cmd: 'open-task-support', add: 'add-new-task' });

		const opt = {
			// // visible: 4,
			// // badge: true,
			item: 'sidebar-base-item',
			actions: []
			
		};

		let g;


		// if (app.sudo)
		// 	opt.actions.push({ name: 'add' });

		// help group
		opt.name = 'help';
		opt.cmd = 'open-start-wiki';

		g = this.addGroup(opt);

		g.add({ id: 'wiki', icon: 'fa-wikipedia-w'});
		g.add({ id: 'contact', icon: 'fa-user-friends'});
		g.add({ id: 'about', icon: 'fa-address-card'});

		// channel group
		opt.name = 'channel';
		opt.visible = 100;
		opt.badge = true;
		opt.cmd = 'open-channel';

		g = this.addGroup(opt);

		g.add({ id: 'support', icon: 'support' });

		// for (let i = 0; i < 20; ++i)
		// 	g.add({ id: `id${i}`, name: `Test ${i}` });
	}
}
