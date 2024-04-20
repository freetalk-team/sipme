
import pako from '../../ui/lib/pako/pako.js';

Object.assign(window, {
	unzip(buffer, opt={ to: 'string'}) { return pako.inflate(buffer, opt); }
	, zip(data) {

		let buf = data;
		if (typeof data == 'string')
			buf = new TextEncoder('utf-8').encode(data);

		return pako.deflate(buf);

	} 
});