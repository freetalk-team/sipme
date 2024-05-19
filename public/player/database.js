
const kAudio = 'audio'
	, kRadio = 'radio'
	, kPlaylist = 'playlist'
	, kSettings = 'settings'
	;

export class Database extends App.Database {

	get version() { return 1; }

	onUpgrade(db, txn, ver) {
		switch (ver) {
		
			case 0:

			Database.addTable(db, kSettings);
			
			Database.addTable(db, kAudio);
			Database.addTable(db, kRadio);
			Database.addTable(db, kPlaylist);

			Database.addIndex(kAudio, 'rating', txn);
			Database.addIndex(kAudio, 'type', txn);

			Database.addIndex(kPlaylist, 'type', txn);

			break;
		}

	}
	
}