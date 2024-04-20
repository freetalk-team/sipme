

function getRequest(path, headers={}, text=true) {
	// throw new Error('From where it comes');
	console.log('HTTPX Sending request:', path);
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					const type = xhttp.getResponseHeader('content-type');
					let r = xhttp.responseText;

					if (text) {

						if (/application\/json/.test(type))
							r = JSON.parse(r);

						console.log('XHTTP response:', status, type);
					}
					else {

						const response = xhttp.response;

						console.log('RESPONSE:', typeof response, response);

						const json = inflate(response, { to: 'string' });
						r = JSON.parse(json);
					}

					resolve(r);
				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('GET', path, true);

		if (!text) xhttp.responseType = 'arraybuffer';

		//xhttp.setRequestHeader('keepa-live', 'timeoout=5, max=100');
		// xhttp.setRequestHeader('Accept-encoding', 'deflate, gzip');

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send();
	});
}

function postRequest(path, req={}, headers={}) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();
		// const isjson = !(req instanceof FormData);
		const isjson = req.constructor === Object;

		let data = req;

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					let r;
					if (xhttp.responseText) {
						const type = xhttp.getResponseHeader('content-type');
						if (/application\/json/.test(type))
							r = JSON.parse(xhttp.responseText);
						else 
							r = xhttp.responseText;
					}

					resolve(r);

				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('POST', path, true);

		let contentType;
		
		if (isjson) {
			contentType = 'application/json';
			data = JSON.stringify(req)
		}
		else if (req instanceof Blob) {
			contentType = 'application/octet-stream';
		}
		else if (req instanceof FormData) {
			/// todo
		}

		if (contentType)
			xhttp.setRequestHeader('content-type', contentType);

		// xhttp.setRequestHeader('Accept-encoding', 'deflate, gzip');

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send(data);
	});
}

function deleteRequest(path, headers={}) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					//const r = JSON.parse(xhttp.responseText);
					//resolve(r);
					resolve();
				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('DELETE', path, true);

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send();
	});
}

function optionsRequest(path, headers={}) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					//const r = JSON.parse(xhttp.responseText);
					//resolve(r);
					resolve();
				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('OPTIONS', path, true);

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send();
	});
}

function submit(url, params) {
	const form = document.createElement('form');

	form.method = 'POST';
	// form.target = '_blank';
	form.action = url;

	for (const [name, value] of Object.entries(params)) {
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = name;
		input.value = value;
		form.appendChild(input);
	}

	document.body.appendChild(form);

	form.submit();
	document.body.removeChild(form);
}

async function fetchRequest(url, opt) {
	const res = await fetch(url, opt);
	const type = res.headers.get('content-type');
	return type == 'application/json' ?  await res.json() : res.text();
}

window.ajax = {
	get: getRequest
	, post: postRequest
	, delete: deleteRequest
	, fetch: fetchRequest

	, submit

	, token(token) {
		return {

			get(path, headers={}) {
				headers['authorization'] = 'Bearer ' + token;
				return getRequest(path, headers);
			}

			, post(path, data, headers={}) {
				headers['authorization'] = 'Bearer ' + token;
				return postRequest(path, data, headers);
			}
			
			, async post2(url, data, headers={}) {
				headers['authorization'] = 'Bearer ' + token;
				headers['content-type'] = 'application/json';
				
				const res = await fetch(url, {
					method: 'POST',
					headers,
					body: JSON.stringify(data),
					mode: 'no-cors'
				});

				return res.json();
			}

			, options(path, headers={}) {
				headers['authorization'] = 'Bearer ' + token;
				headers['Origin'] = window.location.origin;
				return optionsRequest(path, headers);
			}
		}
	}
}