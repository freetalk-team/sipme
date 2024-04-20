const parser = require('fast-xml-parser')
	, util = require('util')
	, { sendPost } = require('./request')
	;

const encoder = new parser.j2xParser(/*{ indentBy: '  ', format: true  }*/);

function collectMembers(a) {
	//console.debug(a);

	let params = {};
	if (Array.isArray(a)) {
		for (const p of a)
			Object.assign(params, collectMembers(p));
	} else {
		params[a.name] = collectMember(a.value);
	}

	return params;
}

function collectMember(v) {

	if ('string' in v)
		return v.string;
	else if ('i4' in v) 
		return v.i4;
	else if ('int' in v) 
		return v.int;
	else if ('array' in v) {
		const value = v.array.data.value;
		if (!value)
			return [];

		return Array.isArray(value) ? value.map(i => collectMember(i)) : [ collectMember(value) ];
	} 
	else if ('struct' in v)
		return v.struct.member ? collectMembers(v.struct.member) : {};
	else if ('dateTime.iso8601' in v)
		return fromISOString(v['dateTime.iso8601']);
	else if ('boolean' in v)
		return Boolean(v.boolean);

	console.error('INVALID FIELD: ', v);
	return null;
}

function toMembers(r) {
	let members = [];
	for (const k in r) {
		const v = r[k];
		members.push({ name: k, value: toMember(v) });
	}

	return members;
}

function toMember(v) {
	if (typeof v === 'string')
		return { string: v };
	else if (typeof v === 'boolean')
		return { boolean: v ? 1 : 0 };
		//return { boolean: v ? true : false };
	else if (typeof v === 'number')
		return { i4: v };
	else if (Array.isArray(v))
		return v.length > 0 ? { array: { data: { value: v.map(i => toMember(i)) } } } : { array: { data: {} } };
	else if (v instanceof Date)
		return { 'dateTime.iso8601': toISOString(v) };

	// object
	return { struct: { member: toMembers(v) } };
}

function toISOString(d) {

	function pad(i) { return i < 10 ? '0' + i : String(i); }

	return util.format('%d%s%sT%s:%s:%s+0000', d.getUTCFullYear(), pad(d.getUTCMonth() + 1), pad(d.getUTCDate()), pad(d.getUTCHours()), pad(d.getUTCMinutes()), pad(d.getUTCSeconds()) );
}

function fromISOString(s) {
	const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
	return new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]));
}

function parseRequest(xml) {
	const obj = parser.parse(xml, { 
			ignoreAttributes: true
			//, trimValues: false
			, parseTrueNumberOnly: true
		});
	const method = obj.methodCall.methodName;

	const members = collectMembers(obj.methodCall.params.param.value.struct.member);

	return { method, members };
}

function parseResponse(xml) {
	const obj = parser.parse(xml, { ignoreAttributes: true, trimValues: true });

	const res = obj.methodResponse;
	if (res.fault)
		return collectMembers(res.fault.value.struct.member);

	return collectMembers(res.params.param.value.struct.member);

}

function encodeResponse(o) {
	const members = toMembers(o);
	const obj = { methodResponse: { params: { param: { value: { struct: { member: members } } }}}};

	return encoder.parse(obj);
}

function encodeUcipReponse(r) {
	Object.assign(r, {
		OriginTimeStamp: new Date
	});

	return encodeResponse(r);
}

function encodeRequest(method, o) {
	const members = toMembers(o);
	const r = {
		methodCall: { methodName: method, params: { param: { value: { struct: { member: members } } }} }
	};

	return encoder.parse(r);
}

async function sendHuxRequest(url, r, headers) {
	Object.assign(r, {
		TransactionId: String(randomTransactionId()),
	});

	Object.assign(headers, { X: r.MSISDN });

	return sendRequest(url, 'handleUSSDRequest', r, headers);
}

function sendRequest(url, method, r, headers) {
	//console.log('Sending XMLRPC request', url, '\n', r);

	const xml = encodeRequest(method, r);
	return sendPost(url, xml, { headers: { 'content-type': 'text/xml' } });	
	//console.log('Sending XMLRPC request\n', xml);
}

function handleResponse(error, response, body, resolve, reject) {
	if (error) {
		console.error('HTTP ERROR:', error)
		reject(error);
	} else if (response.statusCode >= 200 && response.statusCode <= 299) {
		if (body) {
			resolve(parseResponse(body));
		}
		else {
			resolve();
		}
	}
	else {
		let status = -1
		if (response.statusCode)
			status = response.statusCode;
		
		reject({ error: { status } });
	}
}

function randomTransactionId() {
	return Math.floor(100000000 + Math.random() * 900000000);
}

module.exports = {
	parseRequest,
	parse: parseRequest,
	parseResponse,
	encodeResponse,
	encode: encodeResponse,
	encodeUcipReponse,
	encodeRequest,
	sendRequest,
	sendHuxRequest
}
