import { Fields as CommonFields } from '../../editor/settings/fields.js';
import { Sidebar as SidebarBase } from '../sidebar.js';

export class Sidebar extends SidebarBase {


	static getTabs() {
		return [{ name: 'recent', icon: 'fa-clock' }];
	}

	#current;
	#queue;
	#recent;

	get tabs() {
		return Sidebar.getTabs().map(i => i.name.toLowerCase());
	}

	constructor(container) {
		super(container, 'sidebar-player');

		this.loadTabs();

		const recent = this.getPage('recent');

		const opt = { visible: 100, badge: true, hide: true };

		opt.icon = 'fac-queue';
		opt.name = 'queue';
		opt.item = 'editor-player-sidebar-queue-item';
		opt.actions = [{ name: 'clear' }];

		this.#queue = recent.addGroup(opt);

		opt.icon = 'fac-play-recent';
		opt.name = 'recent';
		opt.item = 'editor-player-sidebar-playlist-file';
		opt.actions = [{ name: 'add', cmd: 'add-new-playlist' }, { name: 'clear' }];

		this.#recent = recent.addGroup(opt);

		app.on('trackqueued', e => this.#onTrackQueued(e.detail));
		app.on('trackchange', e => this.#onTrackChange(e.detail));
	}

	handleAction(action, container, target) {

		console.debug('Sidebar player on action:', action);

		switch (action) {

			case 'delete': {

				const group = container.getAttribute('group');

				console.log('Deleting item', id, group);

				switch (group) {

					case 'queue':
					app.player.remove(parseInt(id));
					this.#queue.remove(id);
					break;
				}

			}
			break;


			case 'clear':
			app.player.clear();
			this.#recent.clear();
			break;
		}

	}

	onClick(id, e, target) {
		console.debug('PLAYER sidebar onclick');
	}

	async #onTrackQueued(id) {
		const info = await app.db.get('audio', id);

		if (!info.title) 
			info.title = fileX.getTitleFromMeta(info);

		this.#queue.add(info);
	}

	#onTrackChange(info) {
		const id = info.id;

		this.#queue.delete(id);

		if (id != this.#current) {
			if (!info.title)
				info.title = fileX.getTitleFromMeta(info);

			const meta = info.meta;
			if (!info.album && meta.album)
				info.album = meta.year ? `${meta.album} - ${meta.year}` : meta.album;

			this.#recent.add(info, true);
		}

		this.#current = id;
	}
} 

function getInfo(info) {
	const data = { ...info };

	if (!data.title)
		data.title = fileX.getTitleFromMeta(info, false);

	if (info.duration)
		data.duration = fileX.getDuration(info.duration);

	return data;
}



