
import { Database as DatabaseBase } from './app/db.js';

const kContact = 'contact'
	, kSettings = 'settings'
	, kRecent = 'recent'
	, kHistory = 'history'
	, kRoom = 'room'
	, kGame = 'game'
	, kGameState = 'games'
	, kAudio = 'audio'
	, kPlaylist = 'playlist'
	, kTorrent = 'torrent'
	, kTask = 'task'
	, kChat = 'chat'
	, kCache = 'cache'
	, kPin = 'pin'
	, kRadio = 'radio'
	, kEnum = 'enum'
	, kWiki = 'wiki'
	;

export class Database extends DatabaseBase {

	get version() { return 7; }
	
	needSetup(ver) { return ver < 2; }

	onUpgrade(db, txn, ver) {

		switch (ver) {
		
			case 0:
			this.addCommonTables(db, txn);
			
			case 1:
			Database.addTable(db, kContact);
			Database.addTable(db, kHistory, true);
			Database.addTable(db, kRoom);
			Database.addTable(db, kWiki);
			Database.addTable(db, kGame);
			Database.addTable(db, kTask);
			Database.addTable(db, kChat, true);
			Database.addTable(db, kGameState);
			Database.addTable(db, kCache);
			Database.addTable(db, kPin);
			Database.addTable(db, kEnum);

			Database.addIndex(kContact, 'email', txn, true);
			Database.addIndex(kContact, 'ts', txn);
			Database.addIndex(kHistory, 'uid', txn);
			Database.addIndex(kChat, 'uid', txn);
			Database.addIndex(kChat, 'ts', txn);
			Database.addIndex(kCache, ['id', 'type'], txn, true, 'uid');
			Database.addIndex(kPin, 'type', txn);
			Database.addIndex(kRoom, 'uid', txn);
			Database.addIndex(kGameState, 'type', txn);
			Database.addIndex(kGameState, 'user', txn);
			Database.addIndex(kGameState, ['type', 'ts'], txn, false, 'recent');

			case 2:
			Database.addIndex(kTask, ['owner', 'time'], txn, true, 'own');
			Database.addIndex(kTask, ['reporter', 'time'], txn, true, 'reported');

			case 3:
			Database.addIndex(kTask, 'time', txn, false, 'created');
			Database.addIndex(kTask, 'time', txn, false, 'updated');

			case 4:
			Database.addIndex(kTask, ['owner', 'changetime'], txn, true, 'ownu');
			Database.addIndex(kTask, ['reporter', 'changetime'], txn, true, 'reportedu');

			case 5:
			Database.addIndex(kChat, ['uid', 'ts'], txn, false, 'user');

			case 6:
			Database.addIndex(kChat, ['ts', 'recent'], txn, false, 'latest');

			break;
		}

	}

	addCommonTables(db, txn) {
		Database.addTable(db, kSettings);
		Database.addTable(db, kAudio);
		Database.addTable(db, kRadio);
		Database.addTable(db, kPlaylist);
		Database.addTable(db, kRecent);
		Database.addTable(db, kTorrent);

		Database.addIndex(kRecent, ['_type', 'ts'], txn, false, 'latest');
		Database.addIndex(kAudio, 'rating', txn);
		Database.addIndex(kAudio, 'type', txn);
	}
	
}
