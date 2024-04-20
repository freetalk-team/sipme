
import { fromFile } from '../../ui/lib/id3/id3.js';

const kTextExtensions = new Set(['c', 'cc', 'cpp', 'js', 'json', 'yml', 'yaml', 'py', 'sh', 'wsdl']);

function getFilename(fileOrUrl) {

	let filename;

	if (fileOrUrl instanceof File) {
		filename = fileOrUrl.name;
	}
	else if (/^http(s)?:/.test(fileOrUrl)) {

		const url = new URL(fileOrUrl);

		filename = url.pathname;
	}
	else {
		filename = fileOrUrl;
	}

	const i = filename.lastIndexOf('.');
	if (i == -1) {

		if (/^data/.test(filename)) {
			const mime = filename.slice(5).split(';')[0];
			return [null, mime.split('/')[1]];
		}
		else {
			return [filename, ''];
		}

	} 

	return [filename.slice(0, i), filename.slice(i + 1).toLowerCase()];
}


function isImage(ext) { return ['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(ext.toLowerCase()); }
function isAudio(ext) { return ['mp3', 'flac', 'ogg'].includes(ext); }
function isVideo(ext) { return ['mp4', 'mkv', 'webm'].includes(ext); }
function isMedia(ext) { return isAudio(ext) || isVideo(ext); }

function getMimeType(ext) {

	switch (ext) {

		case 'jpg':
		case 'jpeg':
		return 'image/jpeg';

		case 'png': return 'image/png';
		case 'svg': return 'image/svg';
		case 'gif': return 'image/gif';

		case 'bz2': return 'application/x-bzip2';
		case 'gz': return 'application/gzip';
		case 'zip': return 'application/zip';

		case 'json': return 'application/json';

		case 'mp3': return 'audio/mpeg';
		case 'mp4': return 'video/mp4';
		case 'mpeg': return 'video/mpeg';
		case 'webm': return 'video/webm';
	}
}

function formatSize(size) {
	if (size < 1024) 
		return `${size.toString()} B`;

	let x;
	let s;

	if (size < 1024*1024) {
		s = size / 1024;
		x = 'K';
	}
	else {
		s = size / (1024*1024);
		x = 'M';
	}

	s = s.toFixed(1);

	return `${s.endsWith('.0') ? s.slice(0, -2) : s} ${x}`;
}

function getType(mime) {
	let [type, category] = mime.split('/');

	switch (type) {

		case 'application':
		switch (category) {

			case 'x-bzip':
			case 'gzip':
			category = 'zip';
			break;

			case 'x-shellscript':
			case 'x-yaml':
			case 'json':
			category = 'text';
			break;

		}

		return category;
	}

	return type;
}

function getTypeFromExtension(ext) {
	if (isAudio(ext)) return 'audio';
	if (isVideo(ext)) return 'video';
	if (isImage(ext)) return 'image';

	if (kTextExtensions.has(ext))
		return 'text';
}

function getDuration(seconds) {
	return fmtMSS(seconds).split('.')[0];
	//return (seconds / 60).toFixed(2).toString().replace('.', ':');
}

function fmtMSS(s){   // accepts seconds as Number or String. Returns m:ss
  return( s -         // take value s and subtract (will try to convert String to Number)
          ( s %= 60 ) // the new value of s, now holding the remainder of s divided by 60 
                      // (will also try to convert String to Number)
        ) / 60 + (    // and divide the resulting Number by 60 
                      // (can never result in a fractional value = no need for rounding)
                      // to which we concatenate a String (converts the Number to String)
                      // who's reference is chosen by the conditional operator:
          9 < s       // if    seconds is larger than 9
          ? ':'       // then  we don't need to prepend a zero
          : ':0'      // else  we do need to prepend a zero
        ) + s ;       // and we add Number s to the string (converting it to String as well)
}

function getTitleFromMeta(info, addartist=true) {
	const name = info.title || info.name || info.filename || info.file.name;
	if (!info.meta) return fileX.getName(name);

	let title;
	const m = info.meta;

	if (m.title) { title = m.artist && addartist ? `${m.title} - ${m.artist}` : m.title; }
	else if (m.artist) title = m.artist;
	else return fileX.getName(name);

	return title;
}

function getDescriptionFromMeta(info) { 
	if (!info.meta) {

		let desc = '';

		if (info.artist)
			desc += info.artist;

		if (info.album) {
			if (desc) desc += ' - ';
			desc += info.album;
		}

		if (info.year)
			desc += ` (${info.year})`;

		desc = desc.trim();

		return desc || 'Unknown';
	}

	let desc = '';
	const m = info.meta;

	if (m.album) desc = m.year ? `${m.album} - ${m.year}` : m.album;

	return desc;
}

function getRating(info) {
	//console.debug('getRaing', info, Math.floor((info.rating || 0) / 10));
	return Math.floor((info.rating || 0) / 10).toString();
}

function readFile(file) {
	return new Promise((resolve, reject) => {

		const reader = new FileReader;

		reader.onerror = reject;
		reader.onload = () => {
			const text = reader.result;

			resolve(text);
		}

		reader.readAsText(file);
	});
}

function getFileType(file) {}

async function getMeta(file) {

	const filename = file.name;

	let m;
	let meta = {};

	const [name, ext] = getFilename(filename);

	if (m = name.match(/^\s*(\d{1,2})[\s-_.]*(.*)(\.\w+)?$/))
		meta = { title: m[2], track: parseInt(m[1]) };
	// else if (m = name.match(/([^_.\s-]+)[_.\s-]*(\d+)(\.\w+)?$/)) 
	// 	meta = { title: m[1], track: parseInt(m[2]) };

	if (ext == 'mp3') {
		try {
			const id3 = await fromFile(file);
			console.log(id3);

			if (id3) {

				const info = Object.fromEntries(Object.entries(id3).filter(([_, v]) => v != null));

				if (info.track) {

					if (typeof info.track == 'string') {
						const m = id3.track.match(/^([0-9]{1,2}).*/);
						if (m) info.track = parseInt(m[1]);
					}
				}

				Object.assign(meta, info);
			} 

		} catch (e) {
			console.log('Failed to load meta info for mp3 file:', file.name);
		}
	}

	return meta;
}


window.fileX = {

	getExtension(filename) { return getFilename(filename)[1]; }
	, getName(filename) { return getFilename(filename)[0]; }
	, getFilename
	, getType
	, getTypeFromExtension
	, getTypeFromFilename(fname) { return this.getTypeFromExtension(this.getExtension(fname)); }
	, getMimeType

	, getDuration
	, getRating
	, getDescriptionFromMeta
	, getTitleFromMeta

	, isImage
	, isAudio
	, isVideo
	, isMedia
	, formatSize

	, readFile
	, getFileType(file) { return file.type ? getType(file.type) : this.getTypeFromFilename(file.name); }

	, getMeta
};