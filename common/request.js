const http = require('http')
	, https = require('https')
	, zlib = require('zlib')
	, fs = require('fs')
	// , { pipeline } = require('stream')
	;

async function sendPost(url, request, opt={}) {
	opt.method = 'POST';

	const u = new URL(url);
	const call = u.protocol == 'https:' ? https.request : http.request;

	return new Promise((resolve, reject) => {
		const req = call(url, opt, (res) => {

			const status = res.statusCode;

			if (status != 200)
				return reject(status);

			let body = '';
			//res.setEncoding('utf8');
			res.on('data', (chunk) => {
				//console.log(`BODY: ${chunk}`);
				body += chunk.toString();
			});

			res.on('end', () => {
				if (!res.complete) {
					// error
					return reject(500);
				}

				return resolve(body);
			});


		});

		req.on('error', () => {
			console.log('### ERROR');
			reject(500);
		});

		req.on('timeout', () => {
			console.log('REQUEST TIMEOUT');
			req.abort();
		});

		//req.setHeader('content-type', 'text/html');
		//req.setHeader('content-type', 'application/json');
		if (request)
			req.write(request);

		req.end();
	});
}

async function sendGet(url, opt={}) {
	opt.method = 'GET';

	const u = new URL(url);
	const call = u.protocol == 'https:' ? https.request : http.request;

	return new Promise((resolve, reject) => {
		const req = call(url, opt, (res) => {

			const status = res.statusCode;

			// console.log(res.headers);

			if (status != 200) {
				if (status == 301) {
					return reject({ status, location: res.headers['location'] });
				}
				
				return reject({ status });
			}

			let body;
			//res.setEncoding('utf8');
			res.on('data', (chunk) => {
				//console.log(`BODY: ${chunk}`);
				// body += chunk.toString();
				if (!body) body = chunk;
				else body = Buffer.concat([body, chunk]);
			});

			// res.on('error', reject);
			res.on('end', () => {
				if (!res.complete) {
					// error
					return reject(500);
				}

				// console.log('GET response:', res.headers);

				const encoding = res.headers['content-encoding'];
				const ctype = res.headers['content-type'];
				const json = ctype && /application\/json/.test(ctype);

				switch (encoding) {

					case 'gzip':
					zlib.gunzip(body, (err, text) => {

						if (err) {
							// console.error('Failed to decode response');
							return reject(err);
						}

						resolve(json ? JSON.parse(text) : text);
					});
					break;

					default: {
						let text = body.toString();
						resolve(json ? JSON.parse(text) : text);
					}
					break;

					// case 'br':
					//   pipeline(response, zlib.createBrotliDecompress(), output, onError);
					//   break;
					// Or, just use zlib.createUnzip() to handle both of the following cases:
					
					// case 'deflate':
					//   pipeline(response, zlib.createInflate(), output, onError);
					//   break;
					// default:
					//   pipeline(response, output, onError);
					//   break;
				  }

			});

		});

		req.on('error', reject);

		//req.setHeader('accept', 'application/json');
		req.end();
	});
}

async function sendJsonPost(url, req, opt={}, token=null) {

	//console.log('Sending JSON request', req);

	const request = JSON.stringify(req);

	opt = opt || {};

	if (!opt.headers) {
		opt.headers = {};
	}

	if (token) {
		opt.headers['authorization'] = 'Bearer ' + token;
	}

	opt.headers['content-type'] = 'application/json';

	const response = await sendPost(url, request, opt);

	//console.log('JSON reponse received', response);

	return response != '' ? JSON.parse(response) : {};
}

async function sendJsonGet(url, opt={}) {

	//console.log('Sending JSON GET request', url);

	const response = await sendGet(url, opt);

	//console.log('JSON reponse received', response);

	return JSON.parse(response);
}

function download(url, path) {
	const u = new URL(url);
	const request = u.protocol == 'https:' ? https.get : http.get;

	const file = fs.createWriteStream(path);

	return new Promise((resolve, reject) => {
		const req = request(url, function(res) {

			res.pipe(file);

			file.on('finish', function() {
				file.close();
				resolve();
			});
		});

		req.on('error', function(err) {
			fs.unlink(path);
			reject(err.message);
		});
	});
}

async function get(url, opt={}) {

	for (let i = 0; i < 3; ++i) {

		try {
			const r = await sendGet(url, opt);
			return i > 0 ? [r, url] : r;
		}
		catch (e) {
			if (e.status == 301) 
				url = e.location;
			else 
				throw e;
		}
	}

	throw new Error({ status: 400 });

}

module.exports = {
	sendPost
	, sendGet
	, sendJsonRequest: sendJsonPost
	, post: sendJsonPost
	, get: sendGet
	, download
}
