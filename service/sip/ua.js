Object.assign(global, {

	window: {
		addEventListener() {}
	}
});

const SIP = require('./sip').Web
	SipTcpTransport = require('./tcpTransport')
	SipWsTransport = require('./wsTransport')
	;

class UserAgent {

	get connected() { return this.ua.isConnected(); }
	get incall() { return this.ua.session; }

	constructor(opt, register=true) {

		let { user, name, host, domain, uri, ...rest } = opt;

		if (!domain) domain = host;

		const aor = 'sip:' + (uri || `${user}@${domain}`);

		console.log('SIP AOR:', aor);
		console.log(opt);

		const userAgentOptions = {
			displayName: name
			, logLevel: 'error'
			//  , logLevel: 'debug'
			, userAgentString: 'ftalk-player'
			, register
			, registerExpires: 600
			// , contactName: opt.user
			, ...transportOptions(host)
			, sessionDescriptionHandlerFactoryOptions: {
				iceGatheringTimeout: 5000, //currently, the smallest allowed value
				peerConnectionConfiguration: {
				  iceServers: [ 
					  { urls: 'stun:127.0.0.1:3478' } 
					  //, { urls: "stun:stun.l.google.com:19302" }
					]
				  , iceTransportPolicy: "all"
				  , rtcpMuxPolicy: "require"
				}
			  }
		  };

		if (rest.username) {
			userAgentOptions.authorizationUser = rest.username;
			userAgentOptions.password = rest.password;
		}

		console.debug('SIP UA server:', host, aor);

		this.ua = new SIP.SimpleUser(host, {
			aor
			 , delegate: this
			, media: {
				constraints: {
				  // This demo is making "data only" calls
				  audio: true,
				  video: false
				}
			  },
			  userAgentOptions 
		});
	}

	async start() {

		// // const devices = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
		// const devices = await getUserMedia({ audio: true, video: false });

		// console.log('Available devices:', devices.getTracks().length);
		//return;

		await this.ua.connect();

		// return this.ua.register();
		//console.log(SIP.LIBRARY_VERSION);
	}

	async stop() {
		console.log('SIP UA: Stopping ...');

		if (this.ua.session) {
			console.debug('SIP UA: Closing active session');
			await this.ua.hangup();
		}

		return this.ua.unregister();
	}

	sendMessage(to, message, push=false) {
		const uri = `sip:${to}`;
		console.log('SIP: sending msg, type:', typeof message);

		const headers = [];

		if (push) {
			headers.push('X-push: 1');
		}

		return this.ua.message(uri, message, headers);
	}

	call(to, muted=false) {
		const uri = `sip:${to}`;

		const inviterOptions = {
			sessionDescriptionHandlerOptions: {
				constraints: {
					audio: true
					, video: false
					, muted
				}
			}
		}

		// const opt = { audio: true, video: false, muted: false };

		return this.ua.call(uri, inviterOptions); 
	}

	mute() {
		const pc = this.ua.session.sessionDescriptionHandler.peerConnection;
		pc.getSenders().forEach((stream) => {
			stream.track.enabled = false
		});
	}

	dtmf(code) {
		return this.ua.sendDTMF(code);
	}

	// overrides
	onServerConnect() {
		console.debug('# SIP: On server connect');
	}

	onRegistered() {
		console.log('# SIP: Registered');

		// const inviterOptions = {
		// 	sessionDescriptionHandlerOptions: {
		// 		constraints: {
		// 			audio: true
		// 			, video: false
		// 		}
		// 	}
		// }

		//this.ua.call('sip:radio1-777@ftalk.net');
		// this.ua.call('sip:Z8QhSLOfMDQtH3avpSRHkBokGJNG@ftalk.net');
	}

	onCallReceived(from) {
		console.log('SIP: Incomming call =>', from);
		console.log('Ringing ...');
	}

	onCallAnswered() {
		console.log('SIP: Call answer');
	}

	onCallHangup() {
		console.log('MESSENGER: On hangup');
	}

	onMessageReceived(from, msg) {

		if (/chat-/.test(from.user)) {
			if (/^\*\*\* (.+)$/.test(msg)) {
				console.log('Channel notification received:', msg);
				return;
			}

			const m = msg.match(/\[(.+)\]: (.+)/);
			if (!m) {
				console.error('Message not matching room format:', msg);
				return;
			}

			const [, user, json] = m;
			const [, channel ] = from.user.match(/chat-([^@]+)/);

			from.user = user;
			from.channel = channel;
			
			console.log('# ROOM MSG:', channel, json);

			msg = JSON.parse(json);
		}

		const m = typeof msg == 'string' 
			? { ...from, msg } 
			: { ...from, ...msg };

		this.onMessage(m);

	}
}

function transportOptions(url) {

	console.debug('Transport:', url);

	const u = new URL(url);
	const tport = u.protocol.slice(0, -1);

	// const server = url.slice(u.protocol.length + 2);
	const server = url;

	// const transportOptions = {
	// 	server
	// 	// , ip: '127.0.0.1'
	// 	// , port: 5060
	// }; 


	switch (tport) {

		case 'tcp': 
		return {
			contactParams: { 
				transport: 'tcp'
			// 	, outbound: true
				}
			, transportConstructor: SipTcpTransport
			// , transportOptions
			, hackViaTcp: true
			// , hackIpInContact: true
			// , hackIpInContact: '127.0.0.1'
			, transportOptions: {
				ip: u.hostname
				, port: u.port
			} 
		}

	}

	return {
		transportConstructor: SipWsTransport
		, transportOptions: {
			server
		}
	};
}

module.exports = {
	UserAgent
}
