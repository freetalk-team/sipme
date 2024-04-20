
import './utils-base.js';

import './utils/fs.js';
import './utils/crypto.js';
import './utils/file.js';
import './utils/zip.js';
import './utils/svg.js';

import { LimitedCache } from '../ui/lib/limited-cache/limited-cache.esm.js';
import { SimpleMDE } from '../ui/lib/simplemde/js/simplemde.js';

const console = createConsole({ label: 'UTILS'});

function download(content, mimeType, filename){
	var a = document.createElement('a')
	var blob = new Blob([content], {type: mimeType})
	var url = URL.createObjectURL(blob)
	a.setAttribute('href', url)
	a.setAttribute('download', filename)
	a.click()
}

SimpleMDE.wrap = function(element) {
	return new SimpleMDE({ element, spellChecker: false, autoDownloadFontAwesome: false });
}


/*
// Decompress an LZW-encoded string
    // Code From http://jsolait.net/
    function lzw_decode(s) {
       var dict = {};
       var data = (s + "").split("");
       var currChar = data[0];
       var oldPhrase = currChar;
       var out = [currChar];
       var code = 256;
       var phrase;
       for (var i = 1; i < data.length; i++) {
          var currCode = data[i].charCodeAt(0);
          if (currCode < 256) {
             phrase = data[i];
          } else {
             phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
          }
          out.push(phrase);
          currChar = phrase.charAt(0);
          dict[code] = oldPhrase + currChar;
          code++;
          oldPhrase = phrase;
       }
       return out.join("");
	}
*/

function loadImageUrl2(fileOrUrl, maxWidth = 200, maxHeight = maxWidth) {
	const img = dom.createElement('img', 'obj');
	const ext = fileX.getExtension(fileOrUrl);
	const mime = fileX.getMimeType(ext);

	if ( !(typeof fileOrUrl == 'string' || fileOrUrl instanceof Blob) ) 
		img.file = fileOrUrl;

		// get an image file from the user
		// this uses drag/drop, but you could substitute file-browsing

	return new Promise((resolve, reject) => {

		img.onerror = reject;
		img.onload = () => {

			var canvas = dom.createElement("canvas", 'photo');
			var ctx = canvas.getContext("2d");
				
			let width = img.width;
			let height = img.height;

			if (width > height) {
				if (width > maxWidth) {
					height *= maxWidth / width;
					width = maxWidth;
				}
			} else {
				if (height > maxHeight) {
					width *= maxHeight / height;
					height = maxHeight;
				}
			}

			canvas.width = width;
			canvas.height = height;
			
			ctx.drawImage(img, 0, 0, width, height);

			URL.revokeObjectURL(img.src);

			resolve({
				url: canvas.toDataURL(mime),
				width, height
			});
		}

		const reader = new FileReader();

		reader.onerror = reject;
		reader.onload = () => img.src = reader.result;

		reader.readAsDataURL(fileOrUrl);
	});
}

function loadImageUrl(fileOrUrl, maxWidth = 200, maxHeight = maxWidth) {
	return new Promise((resolve, reject) => {
		// a seed img element for the FileReader
		const img = dom.createElement('img', 'obj');
		const ext = fileX.getExtension(fileOrUrl);
		const mime = fileX.getMimeType(ext);

		if ( !(typeof fileOrUrl == 'string' || fileOrUrl instanceof Blob) ) 
			img.file = fileOrUrl;

		// get an image file from the user
		// this uses drag/drop, but you could substitute file-browsing
		const reader = new FileReader();

		reader.onload = ((aImg) => {
			return (e) => {
				aImg.onload = () => {

					// draw the aImg onto the canvas
					var canvas = dom.createElement("canvas", 'photo');
					var ctx = canvas.getContext("2d");
					
					let width = aImg.width;
					let height = aImg.height;

					if (width > height) {
						if (width > maxWidth) {
							height *= maxWidth / width;
							width = maxWidth;
						}
					} else {
						if (height > maxHeight) {
							width *= maxHeight / height;
							height = maxHeight;
						}
					}

					canvas.width = width;
					canvas.height = height;
					
					ctx.drawImage(aImg, 0, 0, width, height);

					resolve({
						url: canvas.toDataURL(mime),
						width, height
					});
				
				}

				// e.target.result is a dataURL for the image
				aImg.src = e.target.result;
			};
		})(img);

		reader.readAsDataURL(fileOrUrl);

	});
}

async function loadImage(fileOrUrl, maxWidth = 200, maxHeight = maxWidth) {

	console.debug('Load image begin ...');

	const { url, width, height } = await loadImageUrl(fileOrUrl, maxWidth, maxHeight);

	const img = new Image();
	img.src = url;
	img.width = width;
	img.height = height;

	console.debug('Load image DONE!!!');

	return img;
}

function loadVideoThumb(fileOrUrl, maxWidth = 640, maxHeight = maxWidth) {
	console.log('LOADING VIDEO');

	return new Promise((resolve, reject) => {
		var canvas = dom.createElement("canvas", 'video');
		var ctx = canvas.getContext("2d");

		const uri = URL.createObjectURL(fileOrUrl);

		const video = dom.createElement('video');
		video.autoplay = true;
		video.src = uri;
		video.createTime = 5;
		video.muted = true;

		let seeked = false, width, height;

		video.onloadedmetadata = (e) => {
			console.log('VIDEO metadata loaded', video.videoWidth, 'x', video.height);
			console.log(e)
			// canvas.width = video.width;
			// canvas.height = video.height;


			width = video.videoWidth;
			height = video.videoHeight;

			if (width > height) {
				if (width > maxWidth) {
					height *= maxWidth / width;
					width = maxWidth;
				}
			} else {
				if (height > maxHeight) {
					width *= maxHeight / height;
					height = maxHeight;
				}
			}

			canvas.width = width;
			canvas.height = height;
		}

		video.oncanplay = () => {
			console.log('VIDEO can play', video.width, 'x', video.height);

			if (!seeked) {
				video.currentTime = 10;
				seeked = true;
			}
		// video.onseeked = () => {
			// console.log('VIDEO onseekd');
			// ctx.drawImage(video, 0, 0, video.width, video.height);
			// //return resolve([ctx, video]);

			// const img = new Image();
			// img.src = canvas.toDataURL('image/jpeg');
			// img.width = canvas.width;
			// img.height = canvas.height;

			// resolve([img, video]);
		}

		video.onseeked = () => {
			// console.log('VIDEO onseekd', canvas);
			ctx.drawImage(video, 0, 0, width, height);
			//return resolve([ctx, video]);

			const img = new Image();
			img.src = canvas.toDataURL('image/jpeg');
			img.width = width;
			img.height = height;

			video.pause();

			resolve(img);
		}

		video.onerror = ()=> reject('Unable to load video');

		//video.play();
		// video.fastSeek(5);
		//video.load();
	});
}

function parseMagnetURI(uri) {
	const m = uri.match(/magnet:\?xt=urn:[a-z0-9]+:([a-z0-9]{40})(.+)/);

	const hash = m[1];
	const params = m[2].slice(1).split('&');

	const r = { uri, hash };

	//  new URLSearchParams(p);

	for (const [k,v] of params.map(i => i.split('='))) {

		const val = decodeURIComponent(v);

		if (r[k]) {

			if (Array.isArray(r[k])) r[k].push(val);
			else r[k] = [r[k], val];

		} else {
			r[k] = val;
		}
	}

	return r;
}

function createConsole(opt={}) {

	const styles = [
		`color: ${opt.color || '#fff'}`,
		`background-color: ${opt.bgcolor || '#87CEEB'}`,
		"padding: 2px 4px",
		"border-radius: 2px"
	  ].join(";");

	const label = opt.label || '';
	const console = window.console;

	return {

		log(...args) { log(console.log, !!opt.time, label, styles, ...args); }, 
		error(...args) { log(console.error, !!opt.time, label, styles, ...args); }, 
		debug(...args) { log(console.debug, !!opt.time, label, styles, ...args); }, 
	}
}

function log(fn, time, label, styles, ...args) {
	if (time) {
		const now = new Date;
		fn(`${now.toLocaleTimeString()} %c${label}`, styles, ...args); 
	}
	else {
		fn(`%c${label}`, styles, ...args); 
	}
}



const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

function generatePushID(s, ts=Date.seconds()) {

	var hash = typeof s == 'string' ? s.hashCode() : s;
	var now = ts * 1000 + hash % 1000;
	var r = (hash ^ now) >>> 0;

    var timeStampChars = new Array(8);
    for (var i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
      now = Math.floor(now / 64);
	}

	var id = timeStampChars.join('');

	var i = r % PUSH_CHARS.length;
	var chars = PUSH_CHARS.slice(i) + PUSH_CHARS.slice(0, i);
	
	for (var i = 7; i >= 0; i--) {
		timeStampChars[i] = chars.charAt(r % 64);
		// NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
		r = Math.floor(r / 64);
	}

	id += timeStampChars.join('');

	return id;
}


Object.assign(window, {
	download
	, loadImage
	, loadImageUrl: loadImageUrl2
	, loadVideoThumb

	, parseMagnetURI
	, generatePushID

	, createConsole

	, CacheMap: LimitedCache
	, MDE: SimpleMDE

	, le(a, b) { return a < b; }
	, leq(a, b) { return a <= b; }

	, gt(a, b) { return a > b; }
	, gte(a, b) { return a >= b; }
});


function readFile(filename) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();

		console.log('Reading file', filename);

		reader.readAsText(filename);

		reader.onload = function() {
			//console.log(reader.result);
			resolve(reader.result);
		};

		reader.onerror = function() {
			//console.log(reader.error);
			reject(reader.error);
		};

	});
	
}

function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);

	console.log('Decoded cookie', typeof decodedCookie, decodedCookie);

	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		//console.log(c, name);
		if (c.indexOf(name) == 0) {
				const val = c.substring(name.length, c.length);
				//console.log(val);

				return JSON.parse(val);
		}
	}

	return undefined;
}

function deleteCookie(cname) {
	//console.log(document.cookie);
	const sections = document.cookie.split('; ');
	// console.log(sections);
	// const newcookie = sections.filter(i => i.split('=')[0] != cname);
	// console.log(newcookie);
	document.cookie = sections.filter(i => i.split('=')[0] != cname).join('; ');
	//console.log(document.cookie);
}