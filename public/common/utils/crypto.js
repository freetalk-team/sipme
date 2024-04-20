
function generateAesKey(length = 256) {
	console.log('# Generating new AES key ...');

	return crypto.subtle.generateKey({
	  name: 'AES-CTR',
	  length
	}, true, ['encrypt', 'decrypt']);
}

function importAesKey(data, format='jwt', extractable=true) {

	//this is the algorithm options
	const algorithm = { name: "AES-CTR" };
	const usages = ['encrypt', 'decrypt' ];
	
	let key;

	switch (format) {

		case 'raw':
		key = fromBase64(data);
		break;

		case 'jwt':
		key = JSON.parse(atob(data))
		break;

	}

	return crypto.subtle.importKey(format, key, algorithm, extractable, usages); 
}

async function exportAesKey(key) {
	const jwk = await crypto.subtle.exportKey('jwk', key);
	return btoa(JSON.stringify(jwk));
}

async function encryptAes(text, key, iv) {

	const enc = new TextEncoder();
	const counter = typeof iv == 'string' ? fromBase64(iv) : iv;

	let encoded = enc.encode(text);
	// The counter block value must never be reused with a given key.
	const ciphertext = await crypto.subtle.encrypt(
	  {
		name: 'aes-ctr',
		counter,
		length: 64
	  },
	  key,
	  encoded
	);
  
	// return bufferToBase64(ciphertext); 
	return toBase64(ciphertext);
}

async function decryptAes(ciphertext, key, iv) {

	const buf = fromBase64(ciphertext);
	const counter = typeof iv == 'string' ? fromBase64(iv) : iv;
	// console.log(buf, buf.length);
  
	let decrypted = await crypto.subtle.decrypt(
	  {
		name: 'aes-ctr',
		counter,
		length: 64
	  },
	  key,
	  buf
	);
  
	let dec = new TextDecoder();

	return dec.decode(decrypted);
}

function toBase64(buf) {
	return btoa(String.fromCharCode.apply(null, buf instanceof Uint8Array ? buf : new Uint8Array(buf)));
}

function fromBase64(s) {
	const bstr = atob(s);
    const buf = new Uint8Array(bstr.length);
    Array.prototype.forEach.call(bstr, (ch, i) => buf[i] = ch.charCodeAt(0));
    return buf;
}

function encrypt(o, salt) {
    o = JSON.stringify(o).split('');
    for(var i = 0, l = o.length; i < l; i++)
        if(o[i] == '{')
            o[i] = '}';
        else if(o[i] == '}')
            o[i] = '{';
    return encodeURI(salt + o.join(''));
}

 function decrypt(o, salt) {
    o = decodeURI(o);
    if(salt && o.indexOf(salt) != 0)
        throw new Error('object cannot be decrypted');
    o = o.substring(salt.length).split('');
    for(var i = 0, l = o.length; i < l; i++)
        if(o[i] == '{')
            o[i] = '}';
        else if(o[i] == '}')
            o[i] = '{';
    return JSON.parse(o.join(''));
}
 

window.aes = {
	generateKey: generateAesKey
	, importKey: importAesKey
	, exportKey: exportAesKey
	, encrypt: encryptAes
	, decrypt: decryptAes
}

/*

//
// AES Symmetric Encryption in node.js
//

var crypto = require('crypto');
var sharedSecret = crypto.randomBytes(16); // should be 128 (or 256) bits
var initializationVector = crypto.randomBytes(16); // IV is always 16-bytes

var plaintext = "Everything's gonna be 200 OK!";
var encrypted;

cipher = crypto.Cipheriv('aes-128-cbc', sharedSecret, initializationVector);
encrypted += cipher.update(plaintext, 'utf8', 'base64');
encrypted += cipher.final('base64');

// I would need to send both the IV and the Encrypted text to my friend
// { iv: initializationVector.toString('base64')
// , cipherText: encrypted
// }

*/