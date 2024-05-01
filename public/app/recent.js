
const kUpdateTimeout = 2* 60;
const kDefaultRecent = { chat: [], channel: [], comment: [], post: [], player: [] , game: [] };

export const RecentMixin = {

	async loadRecent() {
		const data = localStorage.getItem(this.recentPath);
		const recent = data ? JSON.parse(data) : kDefaultRecent;
		// recent.game = [
		// 	{ user: 'HBe5aAHRbxsISan0axoII5nxqkdP', own: false, ts: 1674974786, type: 'backgammon' }
		// ];

		// const posts = await this.db.lsByIndex('post', 'ts', null, true, 20);
		const posts = []; //await this.db.lsByIndex('recent', '_type', 'post', true, 20);

		for (const i of posts) {


			if (!i.channel)
				continue;

			getPostInfo(i);

			if (typeof i.channel == 'string')
				i.channel = await this.loadChannel(i.channel);

			if (i.link)
				i.id = i.link.hashCode().toString();
		}

		recent.post = posts;

		const ts = Date.seconds();

		const chats = await this.db.lsByRange('recent', 'latest', ['chat', 0], ['chat', ts], true);
		// console.debug('##', chats);

		for (const i of chats)
			await this.loadContact(i);

		recent.chat = chats;

		// comments
		const comments = await loadRecentComments();
		recent.comment = comments;

		// games
		const games = recent.game;
		for (const i of games)
			await this.loadContact(i);

		this._recent = recent;

		return recent;
	}

	, async addRecent(type, data) {

		// not working
		return;

		if (typeof type == 'object') {

			data = type;

			switch (data.type) {
				case 'comment':
				type = 'comment';
				break;

				default:
				type = 'chat';
				break;
			}
		}

		console.debug('Adding to recent:', type, data);

		const recent = this._recent[type];

		let info = data;
		let add = false;
		let updater = false;

		switch (type) {

			case 'chat': {
				// const { msg, ts, user, own } = data;
				// await this.db.put('recent', { _id: user, _type: 'chat', msg, ts, own, user });
			}
			break;
			
			// case 'chat': {
				
			// 	info = { ...data };

			// 	const i = recent.findIndex(j => (j.room ? j.room == data.room : j.user == data.user));
			// 	if (i > -1) {
			// 		recent.splice(i, 1);
			// 	}
			// }
			// break;

			case 'comment': {
				const { channel, gid, id, msg, ts, user, level } = data;
				await this.db.put('recent', { _id: gid, _type: 'comment', id, channel, gid, msg, ts, user, level });
			}
			break;

			case 'post': {

				let id, load = false;
				if (typeof data == 'string') {
					id = data;
					load = true;
				}
				else {
					id = data.id;
				}

				if (load) 
					data = await this.db.get('post', id);

				if (!data.title)
					getPostInfo(data);

				add = false;
				data.type = type;
				await this.db.put('recent', data);

				const { content, ...post } = data;
				
				info = post;
			}
			break;

			case 'player': {

				const i = recent.findIndex(j => j.id == data.id);
				if (i > -1) {
					const item = recent.splice(i, 1)[0];
					recent.unshift(item);
					return;
				}

				const { id, rating, duration, type } = data;

				let item = { id, rating, duration, type,
					title: data.title || fileX.getTitleFromMeta(data),
					desc: data.desc || fileX.getDescriptionFromMeta(data)
				};

				data = item;
			}
			break;

			case 'game':
			info = { ...data };
			break;
		}

		if (add) {
			recent.unshift(data);
			recent.splice(15, 1);
		}

		if (updater && !this._recentUpdater) {
			this._recentUpdater = this.runner.setTimeout(kUpdateTimeout, () => {
				delete this._recentUpdater;
				const { comment, ...data } = this._recent;
				localStorage.setItem(this.recentPath, JSON.stringify(data));
			});
		}

		if (info.user && !info.name) {
			await this.loadContact(info);
		} 

		if (info.channel && typeof info.channel == 'string') {
			info.channel = await this.loadChannel(info.channel); 
		}

		this.emit('recent', { type, info });
	}
}

async function loadRecentComments() {

	const ds = app.ds('comment', true);

	const comments = await app.db.lsByRange('recent', 'latest', ['comment', 0], ['comment', Date.seconds()], true);
		
	// console.debug('##', comments);

	let channel, recent = [];

	for (const i of comments) {

		channel = i.channel;

		const parent = await app.db.get('comment', i.id);
		const childs  = await app.db.lsByIndex('comment', 'topic', [channel, i.gid]);

		console.debug('Loaded childs:', childs);

		parent.childs = childs;

		await loadInfo(i);
		await loadInfo(parent);

		for (const i of childs)
			await loadInfo(i);

		recent.push(parent);
	}

	return recent;



	const data = await ds.ls();
	const own = []; //data.filter(i => i.own);
	const rep = new Set;

	for (const i of data) {
		if (i.own) {

			if (i.post)
				own.push(i);

			continue;
		}

		if (i.comment && i.comment.own) {
			if (i.comment.childs) i.comment.childs.push(i);
			else i.comment.childs = [i]; 
			
			rep.add(i.comment);
		} 
		
		if (i.reply && typeof i.reply == 'string') {
			i.reply = await ds.get(i.reply);
		}

	}

	own.reverse();

	const replies = Array.from(rep);
	replies.reverse();

	for (const i of replies) 
		i.childs.sort((a,b) => b.ts - a.ts);

	return [own, replies]; 
}

async function loadInfo(info) {
	await app.loadContact(info);

	info.channel = await app.loadChannel(info.channel);
	info.canreply = function() { return !this.own && this.level < 2; }

}
