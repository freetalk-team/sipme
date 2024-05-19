
import { PlayerPage  } from "./page.js";

App.Editor.register(PlayerPage);

App.Commands.register('add-new-playlist', (recent=app.player.recent,album=null) => {

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

	if (album)
		params.display = album;

	app.openEditor('add', 'new', 'playlist', params);
});

App.Commands.register('player-import-files', async () => {

	try {

		const files = await showOpenFilePicker({
			id: 'media',
			multiple: true,
			startIn: 'music',
			excludeAcceptAllOption: true,
			types: [
				{
				description: "Media files",
				accept: {
					"audio/*": ['.mp3', ".ogg", ".flac"],
					'video/*': [".webm", '.mkv', '.avi']
				},
				},
			],
		});

		app.editor.onImport(files);
	}
	catch (e) {
		console.error('Failed to import files');
	}

});

App.Commands.register('player-play-file', id => app.player.playFile(id));
App.Commands.register('player-queue-file', id => app.player.playFile(id, true));

const Fields = AddEditor.Fields;

AddEditor.register('playlist', [
	Fields.string({ name: 'display', title: 'Name', required: true })
	, Fields.option({
		name: 'genre'
		, options: ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Country', 'Jazz', 'Classic', 'Reggae', 'Metal', 'Blues', 'Folk', 'Soul', 'Dance', 'Punk']
	}),

	Fields.list({
		name: 'tracks'
		// , itemClass: TrackListItem
		, template: 'editor-player-sidebar-playlist-file'
	})
]);
