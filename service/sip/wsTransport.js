'use strict';

const debug = require('debug')('jssip-node-websocket');
const debugerror =  require('debug')('jssip-node-websocket:ERROR');

const parse = require('url').parse;
const W3CWebSocket = require('websocket').w3cwebsocket;

const EventEmitter = require('events');
const { resolve } = require('path');

class NodeWebSocket extends EventEmitter
{
	constructor(logger, { server }, options)
	{
		super();

		const url = server;

		debug('new() [url:"%s", options:%o]', url, options);

		this._url = url;
		this._options = options || {};
		this._sipUri = null;
		this._viaTransport = null;
		this._ws = null;

		var u = parse(url, true);

		if (!u)
			throw new TypeError('wrong url');

		var scheme = u.protocol.toLowerCase().replace(/:/, '');

		if ([ 'ws', 'wss' ].indexOf(scheme) === -1)
			throw new TypeError('invalid WebSocket scheme');

		this._sipUri = `sip:${u.hostname}${u.port ? ':' + u.port : ''};transport=ws`;
		this._viaTransport = scheme.toUpperCase();
	}

	get url()
	{
		return this._url;
	}

	get sip_uri()
	{
		return this._sipUri;
	}

	get via_transport()
	{
		return this._viaTransport;
	}

	set via_transport(value)
	{
		this._viaTransport = value.toUpperCase();
	}

	connect()
	{
		debug('connect()');

		if (this.isConnected())
		{
			debug('WebSocket already connected [url:"%s"]', this._url);

			return;
		}
		else if (this.isConnecting())
		{
			debug('WebSocket already connecting [url:"%s"]', this._url);

			return;
		}

		if (this._ws)
			this._ws.close();

		debug('WebSocket connecting [url:"%s"]', this._url);

		var options = this._options;

		this._ws = new W3CWebSocket(this._url, 'sip',
			options.origin, options.headers, options.requestOptions, options.clientConfig);

		this._ws.binaryType = 'arraybuffer';

		const promise = new Promise((resolve, reject) => {
			this._ws.onopen = () =>
			{
				debug('WebSocket open [url:"%s"]', this._url);

				this.onconnect();

				resolve({overrideEvent: true});
			};
		})
		

		this._ws.onclose = (event) =>
		{
			debug('WebSocket closed [url:"%s", code:%s, reason:"%s", wasClean:%s]',
				this._url, event.code, event.reason, event.wasClean);

			this.ondisconnect(event.wasClean, event.code, event.reason);
		};

		this._ws.onerror = () =>
		{
			debug('WebSocket error [url:"%s"]', this._url);
		};

		this._ws.onmessage = (event) =>
		{
			debug('WebSocket message received');

			this.ondata(event.data);
		};

		//this._ws.onmessage = this.ondata.bind(this);

		return promise;
	}

	disconnect()
	{
		debug('disconnect()');

		this._ws.close();
		this._ws = null;

		return Promise.resolve();
	}

	send(message)
	{
		debug('send()');

		if (!this.isConnected())
		{
			debugerror('send() | unable to send message, WebSocket is not open');

			// return false;
			return Promise.reject();
		}

		this._ws.send(message);

		// return true;
		return Promise.resolve({ msg: message });
	}

	isConnected()
	{
		return this._ws && this._ws.readyState === this._ws.OPEN;
	}

	isConnecting()
	{
		return this._ws && this._ws.readyState === this._ws.CONNECTING;
	}

	onconnect() {
		// console.log('WS: connected');
		this.emit('connected');
	}

	ondisconnect(wasClean, code, reason) {
		this.emit('disconnected', { code, reason });
	}

	ondata(data) {
		// console.log('WS data:', data);
		this.emit('message', data);

		this.onMessage(data);
	}
}

module.exports = NodeWebSocket;
