const net = require('net');
const EventEmitter = require('events');

const TransportStatus = {
  STATUS_CONNECTING: 'STATUS_CONNECTING',
  STATUS_CONNECTED: 'STATUS_CONNECTED',
  STATUS_CLOSING: 'STATUS_CLOSING',
  STATUS_CLOSED: 'STATUS_CLOSED'
};

class SipTcpTransport extends EventEmitter {
  constructor(logger, options) {
    super();
    
    this.logger = logger;
    this.status = TransportStatus.STATUS_CONNECTING;
    this.configuration = options;
  }

  isConnected() {
    return this.status === TransportStatus.STATUS_CONNECTED;
  }

  connect(options) {
    let socket = new net.Socket();
    this._tcpSocket = socket;
    let { ip, port } = this.configuration;

    let promise = new Promise((resolve, reject) => {
      socket.connect(port, ip, {}, () => {

        console.log('TCP connected');

        this.status = TransportStatus.STATUS_CONNECTED;
        this.emit('connected');

        resolve({ overrideEvent: true });
      });
    });

    socket.setEncoding('utf8');
    this.boundOnMessage = this.onMessage.bind(this);
    this.boundOnError = this.onError.bind(this);
    this.boundOnClose = this.onClose.bind(this);

    socket.on('data', this.boundOnMessage);
    // socket.on('data', data => console.log(data));
    socket.on('error', this.boundOnError);
    socket.on('close', this.boundOnClose);

    return promise;
  }

  send(message, options) {
    if (!this._tcpSocket) {
      return Promise.reject();
    }

    this._tcpSocket.write(message);
    return Promise.resolve({ msg: message });
  }

  disconnect(options) {
    if (!this._tcpSocket) {
      return Promise.reject();
    }

    this._tcpSocket.destroy();
    return Promise.resolve();
  }

  onMessage(data) {
    console.log('TCP data:', data);

    let finishedData;

    if (/^(\r\n)+$/.test(data)) {
      // this.clearKeepAliveTimeout();

      // if (this.configuration.traceSip === true) {
      //   this.logger.log(
      //     'received WebSocket message with CRLF Keep Alive response'
      //   );
      // }
      return;
    } else if (!data) {
      this.logger.warn('received empty message, message discarded');
      return;
    } else if (typeof data !== 'string') {
      // WebSocket binary message.
      // try {
      //   // the UInt8Data was here prior to types, and doesn't check
      //   finishedData = String.fromCharCode.apply(null, (new Uint8Array(data) as unknown as Array<number>));
      // } catch (err) {
      //   this.logger.warn("received WebSocket binary message failed to be converted into string, message discarded");
      //   return;
      // }
      // if (this.configuration.traceSip === true) {
      //   this.logger.log("received WebSocket binary message:\n\n" + data + "\n");
      // }
    } else {
      // WebSocket text message.
      // if (this.configuration.traceSip === true) {
      //   this.logger.log("received WebSocket text message:\n\n" + data + "\n");
      // }
      finishedData = data;
    }

    this.emit('message', finishedData);
  }

  onError(e) {
    this.logger.warn('Transport error: ' + e);
    this.emit('transportError');
  }

  onClose(e) {
    this.logger.log(
      'TCPSocket disconnected (code: ' +
        e.code +
        (e.reason ? '| reason: ' + e.reason : '') +
        ')'
    );

    this.status = TransportStatus.STATUS_CLOSED;
    this.emit('disconnected', { code: e.code, reason: e.reason });
  }
}

module.exports = SipTcpTransport;
