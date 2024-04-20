
const { UserAgent } = require('../sip/ua')
	, crypto = require('crypto').webcrypto
	, request = require('@common/request')
	;

const kDomain = 'ftalk.net';

const kProfile = {
	user: 'notify',
	domain: kDomain,
	name: 'Notify Service'
};


// const kServer = 'ws://ext.app.home.eu.org/messenger/sip';
const kServer = Config ? Config.sip.proxy : 'tcp://127.0.0.1:5060';
const kMaxTitleLength = 100;


class Bot extends UserAgent {

	#counter = 0;
	#key;
	#iv;
	#rooms = new Set;
	#domain;

	constructor (domain=kDomain, user=kProfile.user) {
		const uri = user + '@' + domain;

		super({ 
			uri
			, host: kServer
			, name: kProfile.name
		});

		this.#domain = domain;
	}

	onRegistered() {

		console.log('Registered', );
		// throw new Error('What');
		
	}

	onServerConnect() {
		console.log('Connected to server');
		// this.ua.register();
	}

	onServerDisconnect() {
		console.error('Disconnected!!!');
	}


	async sendMessage(user, message) {

		await this.#checkConnected();

		return super.sendMessage(user + '@' + this.#domain, message);
	}

	async sendRoomMessage(to, msg) {
		// const data = { 
		// 	name: kProfile.name
		// 	, avatar: kProfile.photo
		// 	, msg };

		const data = msg;

		const payload = JSON.stringify(data);

		const id = typeof to == 'string' ? to : to.id;
		const room = `chat-${id}`;

		if (!this.#rooms.has(id)) {
			// await this.sendMessage(room, '#join');
			this.#rooms.add(id);
		}

		console.log('Sending room message', id, payload);

		return this.sendMessage(room, payload);
	}

	onMessage(msg) {
		console.log(new Date().toLocaleTimeString(), '=> Received message');
		console.log(msg);
	}

	notifyComment(user, topic) {

		console.log('TODO: Notify', user, topic);

		this.sendMessage(user, { data: [ topic ] });
	}

	async notifyChannel(channel, posts) {

		console.log('New posts for channel:', channel, '=>', posts);

		const data = [];
		for (const i of posts) {

			const [,, thumb, content ] = i.content.match(/^(!\[[^\]]+\]\((.*?)\)\n+)?(.*)/);

			let title;
			let m = content.match(/^#{1,6}[ \t]+(.*)$/);
			if (!m) 
				m = content.match(/^(.*)$/);

			title = m[1].trim();
			if (title.length > kMaxTitleLength)
				title = title.slice(0, kMaxTitleLength) + '...';

			const post = { 
				ts: i.ts,
				title
			};

			if (thumb)
				post.thumb = thumb;

			data.push(post);
		}

		if (kConfig.internalPush) {

			console.debug('Sending internal push:', kConfig.internalPush);

			try {

				await request.post(kConfig.internalPush, { to: `/topics/channel-${channel}`, data });
			}
			catch (e) {
				console.error('Failed to send PUSH for channel', channel, e);
			}

		}
		else {
			// todo
		}
	}

	#checkConnected() {
		if (!this.ua.isConnected()) 
			return this.ua.connect();;
	}

	#startChannelMonitoring() {

		setInterval(() => {

			this.sendRoomMessage({ id: 'support' }, 'Ko staa maniaciii')

		}, 10000);

	}
}

function encodMessage(text) {
	let enc = new TextEncoder();
	return enc.encode(text);
}

async function encryptMessage(text, key, counter) {

	console.log('ENCRYPT MSG:', text);

	let encoded = encodMessage(text);
	// The counter block value must never be reused with a given key.
	ciphertext = await subtle.encrypt(
	  {
		name: "AES-CTR",
		counter,
		length: 64
	  },
	  key,
	  encoded
	);
  
	// console.log(ciphertext);
  
	// return btoa(ciphertext);
	// return ciphertext.toString('base64');
	// return ciphertext.toString('base64');
	const buf = Buffer.from(ciphertext);
	console.log(buf);
  
	return buf.toString('base64');
  }

module.exports = { 
	Bot
}

async function asyncStringReplace(str, regex, aReplacer) {
    const substrs = [];
    let match;
	let i = 0;
	let count = 0;
    while ((match = regex.exec(str)) !== null) {

		//console.log('#$$', str);

        // put non matching string
        substrs.push(str.slice(i, match.index));
        // call the async replacer function with the matched array spreaded
        substrs.push(aReplacer(...match));
		i = regex.lastIndex;
		++count;
    }
    // put the rest of str
    substrs.push(str.slice(i));
    // wait for aReplacer calls to finish and join them back into string
    return [(await Promise.all(substrs)).join(''), count];
};