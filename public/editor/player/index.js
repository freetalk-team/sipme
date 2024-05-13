
import { PlayerPage  } from "./page.js";
import { Fields as CommonFields } from '../../editor/settings/fields.js';

App.Editor.register(PlayerPage);

AddEditor.register('playlist', [
	CommonFields.string({ name: 'display', title: 'Name', required: true })
	, CommonFields.option({
		name: 'genre'
		, options: ['Pop', 'Rock', 'Folk', 'Classic', 'Jazz', 'Punk', 'Metal']
	}),

	CommonFields.list({
		name: 'tracks'
		// , itemClass: TrackListItem
		, template: 'editor-player-sidebar-playlist-file'
	})
]);

App.Commands.register('add-new-playlist', (recent=app.player.recent) => {

	console.log('# Creating playlist:', recent);

	const params = {
		icon: '\uf550' 
		, desc: 'Create a new playlist'
		, reload: true
		, onAdd(playlist) {
			// console.log('On new playlist', data);

			playlist.name = playlist.display.toLowerCase();
			playlist.id = playlist.name.hashCode().toString();

			const tracks = recent.filter(i => !playlist.tracks.includes(i.id));

			for (const i of tracks) {
				i.filename = i.file.name;
				i.size = i.file.size;

				delete i.file;
			}

			playlist.tracks = tracks;

			app.add('playlist', playlist, 'new');
		}
	};

	params.info = {
		tracks: recent
	};

	app.openEditor('add', 'new', 'playlist', params);
});

