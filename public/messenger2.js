
// import { SimpleUser } from './ui/lib/sip.js/web/lib/platform/web/simple-user/index.js';
const SimpleUser = SIP.Web.SimpleUser;

// Note: cannot be on custom port. Only 80/443 or same origin as a host (location.host)

//const console = createConsole({ label: 'SIP', time: true });


// const mediaSource = new MediaSource();

const kMessageTone = Config.messagetone || Config.sip.messagetone || '/ui/ogg/popsound.mp3';

export class Messenger {

	#timeout;
	#opt;
	#started;
	#state = 'idle'; // call
	#sharing;
	#canvas;
	#video;
	#unregister;
	#publisher;

	get uri() { return this.ua.options.aor; }
	get domain() { return this.#opt.domain; }

	constructor(unregister=true) {
		this.channels = new Set;
		this.audio = new Audio();
		// this.audio.loop = true;

		this.#unregister = unregister;
	}

	get connected() { return this.ua.isConnected(); }
	get registering() { return this.ua.registerRequested; }

	get localView() { return document.getElementById('local-video'); }
	get remoteView() { return document.getElementById('remote-video'); }
	get remoteAudio() { return document.getElementById('remote-audio'); }

	get canCall() { return this.#state = 'idle'; }

	getURI(id) { return `sip:${id}@${this.domain}`; }

	async addAccount(uri, name) {

		const url = Config.sip.url || Config.sip.proxy || `ws://${location.host}/messenger/sip`;
		const kServer = url.startsWith('/')
			? `${location.protocol == 'http:' ? 'ws' : 'wss'}://${location.host}${url}`
			: url
			;

		const defaultOptions = {
			domain: 'ftalk.net',
			inactiveTimeout: 60,
			userAgent: 'ftalk-beta'
		};

		this.#opt = Object.assign({}, defaultOptions, Config.sip);

		console.log('Adding account:', uri, kServer);

		// const creds = await postRequest('/auth/messenger');
		// console.log('Using SIP creds:', creds);

		const localView = this.localView;
		const remoteView = this.remoteView;
		const remoteAudio = this.remoteAudio;

		const ua = new SimpleUser(kServer, {
			delegate: this

			, aor: `sip:${uri}`
			, media: {
				constraints: {
					// This demo is making "data only" calls
					audio: true,
					video: false, 
				}
				, local: { video: localView }
				, remote: { video: remoteView, audio: remoteView }

				// , render: {
				// 	local: { video: localView },
				// 	remote: { video: remoteView, audio: remoteView }
				// }
			  },
			  userAgentOptions: {
				// logLevel: "debug",
				displayName: name
				, logLevel: 'error'
				, userAgentString: this.#opt.userAgent 
				, register: true
				, registerExpires: 600
				// , hackIpInContact: true
				// , hackViaTcp: true
				, sessionDescriptionHandlerFactoryOptions: {
					iceGatheringTimeout: 5000, //currently, the smallest allowed value
					peerConnectionConfiguration: {
					  iceServers: [ 
						  { urls: 'stun:192.168.8.68:3478' } 
						  //, { urls: "stun:stun.l.google.com:19302" }
						]
					  , iceTransportPolicy: "all"
					  , rtcpMuxPolicy: "require"
					}
				  }
				//   , constraints: { audio: true }
			  }

		});

		this.ua = ua;

		// todo: improve reconnect
		// if (app.sudo || Config.sip.registerOnStart)
			await this.#register();
	}

	async offline() { 
		console.log('SIP: Go offline');

		await this.unregister();
		await this.ua.disconnect(); 
	}

	register() {  return this.#checkRegistered(); }
	unregister() { return this.ua.unregister(); }

	async publish(data, event='presence') {

		if (!this.#publisher)
			this.#publisher = this.ua.publisher(this.uri, event);

		let msg = '<?xml version="1.0" encoding="UTF-8"?>';

		switch (event) {

			case 'presence':
			msg += objectToXmlString({
				tuple: {
					_attr: [['id', 'status']],
					// _attr: [['id', 's' + Math.floor(Math.random() * 10000)]],
					status: { basic: 'open', im: 'online' },
					//contact: '123' + Math.floor(Math.random() * 10000),
					...data
				}
			}, event);
			break;
		}

		console.debug('Sending PUBLISH:', msg);

		await this.#checkRegistered();
		
		return this.#publisher.publish(msg);
	}

	subscribe(id, event='presence') {
		const uri =`sip:${id}@${this.#opt.domain}`;
		return this.ua.subscribe(uri, event);
	}

	// SimpleUser delegates
	onServerConnect() {
		console.log('SIP: Connected to server');

		// try {
		// 	await this.ua.register();
		// }
		// catch (e) {
		// 	console.error('SIP Failed to register:', e);
		// }
	}

	onServerDisconnect() {
		console.error('Disconnected!!!');
	}

	onRegistered() {

		console.log('SIP: Registered');

		this.#resetInactiveTimeout();

		if (!this.#started) {
			this.#started = true;
			app.onStarted();

			
		}
	}

	onUnregistered() {
		console.log('Unregistered');
		this.#timeout = null;
		app.onUnregister();
	}

	onNotify({ request }) {

		console.debug('SIP notification received:', request);

		const parser = new DOMParser;

		const body = request.body;
		const from = request.from.uri.user;

		let data = {}, msg = xmlStringToObject(body);

		if (msg.tuple) {

			// msg = msg.tuple;
			
			// data.status = msg.note;
			// data.contact = msg.contact;

			// console.debug('SIP PRESENCE:', from, data);

			app.onNotify(from, msg.tuple);
		}
	}

	onCallCreated() {
		console.log('Outgoing call');

		this.#cancelInactiveTimeout();
		// const audio = this.audio;
		// audio.src = '/ui/ogg/ringback-tone.ogg';
		// audio.play();
	}

	onCallReceived(from) {
		console.log('Incomming call ', from);
		//console.log('Ringing ...');

		this.#state = 'ringing';

		this.#cancelInactiveTimeout();

		const audio = this.audio;
		audio.src = Config.ringtone;
		audio.loop = true;
		audio.play();

		app.onIncomingCall(from);
	}

	onCallAnswered() {
		console.log('Call answer');

		this.#state = 'incall';
		this.audio.pause();

		//setTimeout(() => this.startScreenSharing(), 5000);
		//setTimeout(() => this.hangup(), 15000);

		app.onAnswer();
	}

	onCallHangup(user) {
		console.log('On hangup');

		dom.hideElement(this.localView);

		let missed = this.#state == 'ringing';

		this.#state = 'idle';

		if (this.#sharing) {
			this.#sharing.stop();
			this.#sharing = null;
		}

		//this.#stopTracks();
		this.#resetInactiveTimeout();

		this.audio.pause();
		app.onHangup(user, missed);

	}

	onMessageReceived(from, msg, headers) {
		// console.log('SIP: Incomming message', from, msg);

		this.#resetInactiveTimeout();

		// dumpHeaders(headers);

		let h;

		// if ((h = headers['In-Reply-To']) || (h = headers['Call-ID'])) {
		// 	from.tid = h[0].raw;
		// }

		

		if ((h = headers['Timestamp'])) {
			from.ts = parseInt(h[0].raw);
		}
		else if ((h = headers['Expires'])) {
			from.ts = parseInt(h[0].raw) - 86400000;
		}
		else if ((h = headers['Date'])) {
			const d = new Date(h[0].raw);
			from.ts = d.getTime();
		}

		
		// const callid = headers['Call-ID'];
		// if (callid) {
		// 	console.debug('## CALLID:', callid[0].raw);
		// }

		// const replyto = headers['In-Reply-To'];
		// if (replyto) {
		// 	console.debug('## REPLYTO:', replyto[0].raw);
		// }

		// const ts = headers['Date'];
		// if (!ts) {
		// 	console.error('## SIP msg without Timestamp header:', from);
		// }
		// else {
		// 	from.ts = parseInt(ts[0].raw);
		// }


		if (/chat-/.test(from.user)) {
			if (/^\*\*\* (.+)$/.test(msg)) {
				console.log('Channel notification received:', msg);
				return;
			}

			const m = msg.match(/\[(.+)\]:\s+(.+)/s);
			if (!m) {
				console.error('Message not matching room format:', msg);
				return;
			}

			const [, user, text] = m;
			const [, channel ] = from.user.match(/chat-([^@]+)/);

			from.user = user;
			from.room = channel;

			msg = text.trim();
		}

		if (/^\{.*\}$/.test(msg)) {
			msg = JSON.parse(msg);

			// if (msg.msg && typeof msg.msg == 'object') {
			// 	const m = msg.msg;
			// 	delete msg.msg;

			// 	Object.assign(msg, m);
			// }

			if (!from.ts && msg.ts)
				from.ts = msg.ts;
		}
		else if (/^\[.*\]$/.test(msg)) {
			// todo: array of messages
		}
		
		if (typeof msg == 'string')
			msg = msg.replaceAll('\\n', '\n').trim();

		// if ((h = headers['In-Reply-To'])) {
		// 	from.tid = h[0].raw;
		// }
		// else {
		// 	from.tid = ((from.user.hashCode() ^ from.ts) >>> 0).toString(16);
		// }

		from.tid = ((from.user.hashCode() ^ from.ts) >>> 0).toString(16);

		console.log('<=', from, msg);
		app.onMessage(from, msg);
	}

	playNotification() {
		// todo: check state

		if (this.#state == 'idle') {
			const audio = this.audio;
			audio.src = kMessageTone;
			audio.loop = false;
			audio.play();
		}
	}

	// public
	async send(uri, msg, push=true) {
		console.log('=>', uri, msg);

		await this.#checkRegistered();

		this.#resetInactiveTimeout();

		const to = `sip:${uri}`;

		 // const ts = Math.floor(Date.now() / 1000) + 86400;
        // const ts = Math.floor(Date.now() / 1000);
		const ts = Date.now();

		const headers = [
			// `Expires: ${ts + 86400000}`,
			`Timestamp: ${ts}`
		];

		if (push) {
			headers.push('X-push: 1');

			if (typeof push == 'object') {

				for (const [name, value] of Object.entries(push))
					headers.push(`X-${name}: ${value}`);

			}
		}
		
		console.debug('Messnger send:', headers);

		return this.ua.message(to, msg, headers);
	}

	sendMessage(id, msg, push=true) {
		const uri =`${id}@${this.domain}`; 

		if (typeof msg == 'string') {
			// hack around Kamailio
			msg = msg.replace(/\n/g, '\\n');
		}

		console.debug('## Sending message:', msg);
		return this.send(uri, msg, push);
	}

	sendRoomMessage(id, msg, push) {
		const prefix = Config.sip.room;
		const uri = id.startsWith(prefix) ? id : prefix + id;

		let text;

		if (typeof msg == 'string') {
			text = msg.startsWith('#') ? ' ' + msg : msg;
		}
		else {
			text = JSON.stringify(msg);
		}

		return this.sendMessage(uri, text, push);
	}

	sendRoomCommand(id, cmd, ...params) {
		const prefix = Config.sip.room;
		const msg = '#' + cmd + ' ' + params.join(' ');
		const uri = id.startsWith(prefix) ? id : prefix + id;

		this.sendMessage(uri, msg, false);
	}

	createChannel(name, priv=false) {
		const [uri, cmd] = channelJoinCmd(name, priv);
		this.channels.add(uri);
		return this.send(uri, cmd);
	}

	lsChannel(name) {
		const [uri, cmd] = channelMembersCmd(name);
		return this.send(uri, cmd);
	}

	room(id, cmd) {
		const uri = `chat-${id}@${this.#opt.domain}`;
		return this.send(uri, '#' + cmd);
	}

	joinChannel(id) {
		return this.send(`chat-${id}@${this.#opt.domainChannel}`, '#join');
	}

	call(id, opt={ audio: true, video: 'dummy', muted: false }) {

		if (this.#state != 'idle') {
			console.error('Already in call!');
			return;
		}

		this.#state = 'calling';

		const audio = this.audio;
		audio.src = Config.ringbacktone;
		audio.loop = true;
		audio.play();

		const uri = `sip:${id}@${this.#opt.domain}`;

		// const localView = this.localView;
		// const remoteView = this.remoteView;

		const sessionDescriptionHandlerOptions = {
			constraints: opt,
			// render: {
			// 	local: { video: localView },
			// 	remote: { video: remoteView, audio: remoteView }
			// }
		};

		console.log('Calling', uri, opt.muted);
		this.ua.muted = opt.muted;

		const local = this.localView;
		dom.hideElement(local);

		// if (local) {

		// 	opt.video ? dom.showElement(local) : dom.hideElement(local);
		// }

		this.ua.call(uri, { sessionDescriptionHandlerOptions });
	}

	callTest(id, opt={ audio: true, video: true, muted: false }) {

		if (this.#state != 'idle') {
			console.error('Already in call!');
			return;
		}

		this.#state = 'calling';

		const audio = this.audio;
		audio.src = '/ui/ogg/ringback-tone.ogg';
		audio.loop = true;
		audio.play();


		const local = this.local;

		if (local) {
			opt.video ? dom.hideElement(local) : dom.showElement(local);
		}

	}

	answer() {
		this.#state = 'incall';
		this.audio.pause();
		this.ua.answer();
	}

	hangup() {

		const state = this.#state;

		this.#state = 'idle';

		dom.hideElement(this.localView);
		this.audio.pause();

		switch (state) {

			case 'calling':
			case 'incall':
			this.ua.hangup();
			break;

			default:
			this.ua.decline();
			break;
		}

	}

	async startVideo() {
		// const sdh = this.ua.sdh;
		const stream = await getLocalVideoStream();
		const videoTrack = stream.getVideoTracks()[0];

		const pc = this.#getPeerConnection();

		// console.log('replace camera track with screen track');
		this.#canvas = replaceTrack(pc, videoTrack);
		this.#video = videoTrack;
		
		
		// const pc = this.#getPeerConnection();
		// const videoTracks = localStream.getVideoTracks();

		// videoTracks.forEach((track) => {
		// 	track.enabled = true;
		// });
		
		this.localView.srcObject = stream;

		const e = this.localView;
		e.classList.remove('hidden');
	}

	async stopVideo() {
		const pc = this.#getPeerConnection();
		replaceTrack(pc, this.#canvas);

		this.#video.stop();
		
		dom.hideElement(this.localView);
	}

	async startScreenSharing() {

		const mediaStream = await getLocalScreenCaptureStream();
		const screenTrack = mediaStream.getVideoTracks()[0];
		
		
		if (screenTrack) {


			const pc = this.#getPeerConnection();

			console.log('replace camera track with screen track');
			this.#sharing = replaceTrack(pc, screenTrack);
			
			screenTrack.onended = () => {
				console.log('Screen capture stopped');

				replaceTrack(pc, this.#sharing);
				this.#sharing = null;
			}

		}

		// this.localView.srcObject = mediaStream;
    }

	// private methods
	async #register() {
		await this.ua.connect();

		if (!this.registering)
			await this.ua.register();

		this.#resetInactiveTimeout();
	}

	#checkRegistered() {
		if (!this.connected) 
			return this.#register();
	}

	#cancelInactiveTimeout() {
		if (this.#timeout) 
			clearTimeout(this.#timeout);
	}

	#resetInactiveTimeout() {

		// su and admins must not disconnect ???
		if (!this.#unregister) return;

		this.#cancelInactiveTimeout();
		this.#timeout = setTimeout(() => this.offline(), this.#opt.inactiveTimeout * 1000);
	}

	#getPeerConnection() {
		if (!this.ua.session) {
            throw new Error("Session does not exist.");
		}
		
        const sessionDescriptionHandler = this.ua.session.sessionDescriptionHandler;
		const peerConnection = sessionDescriptionHandler.peerConnection;

        if (!peerConnection) {
            throw new Error("Peer connection closed.");
		}
		
		return peerConnection;
	}

	#stopTracks() {
		try {
			const pc = this.#getPeerConnection();

			for (const sender of pc.getSenders()) 
				sender.track.stop();
		}
		catch (e) {
			console.error('Peerconnection release:', e);
		}
	}
}




function channelJoinCmd(name, priv) {
	//return [`sip:chat-manager@${kDomain}`, `#create chat-${name}@${kDomain}`];
	return [`chat-${name}@${kDomain}`, '#join'];
}

function channelMembersCmd(name) {
	return [`chat-${name}@${kDomain}`, `#members`];
}

async function getLocalScreenCaptureStream() {
    try {
      const constraints = { video: { cursor: 'always', mediaSource: 'screen' }, audio: false };
      const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(constraints);
  
      return screenCaptureStream;
    } catch (error) {
      console.error('failed to get local screen', error);
    }
}

async function getLocalVideoStream() {
    try {
      const constraints = { video: true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
  
      return stream;
    } catch (error) {
      console.error('failed to get local screen', error);
    }
}

function replaceTrack(peerConnection, newTrack) {

	if (!newTrack) return;

    const sender = peerConnection.getSenders().find(sender =>
      sender.track.kind === newTrack.kind 
    );
  
    if (!sender) {
      console.warn('failed to find sender');
  
      return;
	}
	
	const oldTrack = sender.track;
  
	sender.replaceTrack(newTrack);
	
	return oldTrack;
}
 
function dumpHeaders(hdrs) {

	for (const [name, v] of Object.entries(hdrs)) {
		console.debug(name, '=>', v[0].raw);
	}
}

// Function to convert the object into XML string
function objectToXmlString(obj, root='presence') {
    // Create a new XML document
    const xmlDoc = document.implementation.createDocument(null, null, null);

    // Create root element
    const rootElement = xmlDoc.createElement(root);

    // Function to recursively build XML from object
    function buildXml(parentNode, obj) {

		if (obj._attr) {

			// const attr = Array.isArray(obj._attr) ? obj._attr : [ obj._attr ];
			const attr = obj._attr;

			for (const i of attr) 
				parentNode.setAttribute(i[0], i[1]);
			
			delete obj._attr;
		}

        for (const [key, value] of Object.entries(obj)) {
            const element = xmlDoc.createElement(key);
            if (typeof value === "object") {
                buildXml(element, value);
            } else {
                const textNode = xmlDoc.createTextNode(value);
                element.appendChild(textNode);
            }
            parentNode.appendChild(element);
        }
    }

    // Build XML from the object
    buildXml(rootElement, obj);

    // Append root element to the XML document
    xmlDoc.appendChild(rootElement);

    // Serialize the XML document to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
}

// Function to parse XML string and convert it to JavaScript object
function xmlStringToObject(xmlString) {
    // Create a new DOMParser object
    const parser = new DOMParser();

    // Parse the XML string
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    // Function to recursively build JavaScript object from XML
    function buildObject(node) {
        const obj = {};
        // Loop through child nodes
        for (const childNode of node.childNodes) {
            if (childNode.nodeType === Node.ELEMENT_NODE) {
                // If child node has child nodes, recursively build object
                if (childNode.childNodes.length > 1 || (childNode.childNodes.length === 1 && childNode.firstChild.nodeType === Node.ELEMENT_NODE)) {
                    obj[childNode.nodeName] = buildObject(childNode);
                } else {
                    obj[childNode.nodeName] = childNode.textContent.trim();
                }
            }
        }
        return obj;
    }

    // Call buildObject on the root element
    return buildObject(xmlDoc.documentElement);
}
