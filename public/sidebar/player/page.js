import { SidebarPage } from '../base.js';

class PlayerPage extends SidebarPage {

	static id = 'player';

	#playlist;

	get icon() { return '\uf001'; } // fa-music

	constructor(id='sidebar-player') {
		super(PlayerPage.id, id);

		app.on('playlistadd', e => this.#addPlaylist(e.detail, true));
		app.on('playlistrm', e => this.#removePlaylist(e.detail));
	}

	load(settings) {
		return this.#reload();
	}

	async #reload() {
		//console.log('SB: load contacts');

		this.#loadMainItems();
		this.#loadRadioChannels();

		const opt = {
			name: 'playlist',
			icon: 'playlist',
			visible: 100,
			badge: true,
			draggable: true,
			hide: true,
			cmd: 'open-playlist-player',
			item: 'sidebar-player-item-playlist',
		}; 
		
		const g = this.addGroup(opt);
		this.#playlist = g;

		const ds = app.ds('playlist');
		const playlists = await ds.ls();

		for (const i of playlists)
			this.#addPlaylist(i);
	}

	
	add(action, info) {

		console.log('Sidebar (contact): adding', action, info);
				
		switch (action) {
			
		}
	}

	#loadMainItems() {

		const kItems = [
			{ display: 'Local files', id: 'files', icon: 'folder', cmd: 'open-files-player' },
			// { display: 'Youtube', id: 'youtube', icon: 'fa-youtube' },
			{ display: 'Torrents', id: 'torrent', icon: 'torrent', cmd: 'open-torrent-player' }
		];

		for (const i of kItems) 
			this.addItemTemplate('sidebar-player-item', i);
	}

	async #loadRadioChannels() {

		const opt = {
			name: 'radio',
			visible: 5,
			badge: false,
			draggable: true,
			item: 'sidebar-radio-item',
			cmd: 'open-radio-player',
			actions: [ {
				name: 'add',
				icon: 'add',
				cmd: 'find-radio'
			}]
		};
		
		const g = this.addGroup(opt);

		const ds = app.ds('radio');
		const all = await ds.ls();

		console.debug('Loading radios', all);
		
		for (const i of all)
			g.add(i);
	}

	#addPlaylist(data, check=false) {

		if (check && this.#playlist.getElement(data.id))
			return;

		this.#playlist.add(data);
	}

	#removePlaylist(id) {
		this.#playlist.delete(id);
	}

	static defaultSettings() {
		return { 
			playlist: {
				visible: 10
				, order: []
			},
		};
	}	
}


export default PlayerPage;