#!/usr/bin/env node

const http = require('http')
	, https = require('https')
	, { google } = require('googleapis')
	// , firebase = require('firebase-admin');
	;

const PROJECT_ID = 'sipme-dfbde';
const SA = require('../../sipme-dfbde-9878b7d713e5.json');
const PORT = process.env.PORT || 9012;
const TOKEN_EXPIRE = 55;
const PUSH_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
// const PUSH_ENDPOINT = "http://127.0.0.1:9090";

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

// firebase.initializeApp({
// 	projectId: PROJECT_ID
// 	, credential: firebase.credential.cert(sa)
// 	//, databaseURL
// });

console.log('FCM push proxy listening on:', PORT);

var token;
// var token = 'ya29.c.c0AY_VpZjExHoVsIKrEetJvxQiAVjuS5jup6xHmJiAP0el2WOzjj-tIpXBH585DRL4rRqM02Oxa2rH_MszTLYp6ByZ392yhII4mKkkZ4PlwgF9tXBz1KUtN8n0RBkdMMBw46vPxQfdS6B6LC9Png-pqHnAXqHFgY6PgGwWM49CC1_dXgepBG8HxyOUco51x0AMG2VFWQwS_Typkdtr4hDChzQ8ses7-Z6zoDCEwEnxNhTq82mAjqvpaYEuhPsh6lwhj2oH-suZGN7QmH6D1ai5iUTeQlGknfks5t6OWgKIC_npsyOHRVbnkRP4uj5M5fGtWkL2ZcrgsSL16hvE2zWZmOK4Crf41ANY0XX1GeL__5eraefI6bI-1s4H384DZMSSbkMn1M-hZ1RXBuxb96FsOio_lwMvQs3Qf64JwcB10S1OaF4p52nMYzl2efjF83174-ogqcgyIe1_1Fi3zfiUhQcMfh4Vn6n2ankJy9fSVlryb06YyYsQBV8YOczb25rf5Vkd5mro84o-3roec5Ovdehby8g459iMbSeyk0QS7Be1iUgyh7jyiBjmBt9qet4eOZutwtxSSp1yrwgx4rFz-O1hZlr4Rm2zQr23y98XhQzy7aSj4V89oZ_4uQtJ8txjVz3bO9zZad-b9WrwZ8jzUmOVQJ3R-VYw5Yx9ldscnr3Mq3Uum2tqOl35x5m1MofZu5y9xV0aggbQ8Ui_Rbku3BfmOqeye3kRIR391mVSzyz2uvM8-ktBbZ_fY5ycXor92w41k7iuWwanRwQj6Oo9mb5RtXJgBd1WrIr9JU8pbIFB0kUeQ4xaOUn7U6fX87s4iSlvlJBFv6uItjU0Uug3S_8dU7hqacugmMYBpr-9gXx7l4tqrzBtzIdfI8Y8VOhgVRFdx4uFYhMsv7zWJen8QtZV6bIVOa4cJja8pw04fVI4d9vvW8SyrJ7R8m9ojjWx3q7nemVBFtik6J38zsrIgloyaX-ow6iFnUSwWMvRm3w1JgZw23f9udb';
let updater;

http.createServer(async function (req, res) {

	console.log(req.method, req.url, req.headers);

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        //console.log(body);

		const ctype = req.headers['content-type'];
		if (ctype == 'application/json') {

			body = JSON.parse(body);
		}

		handleRequest(res, body, req.headers);
    });

	

}).listen(PORT);

async function handleRequest(res, msg, headers) {
	// const from = req.getHeader('X-from');
	// const ctype = req.getHeader('Content-type');

	// console.log('PUSH request:', from, ctype);

	console.log(msg);

	let from = headers['x-from']
		, name = headers['x-from-name']
		, topic = headers['x-to']
		, room = headers['x-room']
		, type = headers['x-type']
		, body = msg, data = { user: from, type }
		, notification = true
		;


	if (room) {
		data.room = room;
	}

	if (name.startsWith('"'))
		name = name.slice(1, - 1);

	if (typeof msg == 'object') {
		console.log('Checking payload type');

		//data = msg;
		body = "todo";
	}

	if (type == 'invite') {
		// body = 'Incomming call';
		notification = false;
	}

	try {

		if (!token) {
			token = await getAccessToken();

			console.log('Token received', token);

			if (!updater)
				updater = setTimeout(() => {
					token = null;
					updater = null;
				}, TOKEN_EXPIRE * 60 * 1000);
		}

		// note: without 'notification' section no popup message will be displayed 

		const message = {
			topic,
			data
		};

		if (notification) {
			message.notification = {
				// body : "This is a Firebase Cloud Messaging Topic Message!",
				body,
				title: name
			};
		}


		console.log('FCM request:', message);

		const r = await sendMessage(PUSH_ENDPOINT, m, null, token);
		console.log('FCM response:', r);

		res.writeHead(200);
		//res.write("Hi");

	}
	catch (e) {
		res.writeHead(500);
	}

	res.end();
}

let getAccessTokenPromise;

function getAccessToken() {
	if (!getAccessTokenPromise) {

		getAccessTokenPromise = new Promise(function(resolve, reject) {
			const jwtClient = new google.auth.JWT(
				SA.client_email,
				null,
				SA.private_key,
				SCOPES,
				null
			);
			jwtClient.authorize(function(err, tokens) {

				getAccessTokenPromise = null;

				if (err) {
					reject(err);
					return;
				}

				resolve(tokens.access_token);
			});
		});
	}

	return getAccessTokenPromise;
  }

 

async function sendMessage(url, req, opt={}, token=null) {

	//console.log('Sending JSON request', req);

	const request = JSON.stringify(req);

	opt = opt || {};

	if (!opt.headers) {
		opt.headers = {};
	}

	opt.headers['content-length'] = Buffer.byteLength(request);

	if (token) {
		opt.headers['authorization'] = 'Bearer ' + token;
	}

	opt.headers['content-type'] = 'application/json';

	const response = await sendPost(url, request, opt);

	//console.log('JSON reponse received', response);

	return response != '' ? JSON.parse(response) : {};
}

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

		console.debug('Sending HTTP POST:', request);

		//req.setHeader('content-type', 'text/html');
		//req.setHeader('content-type', 'application/json');
		if (request)
			req.write(request);

		req.end();
	});
}