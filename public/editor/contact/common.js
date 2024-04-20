
const kMinute = 60 * 1000;
const kDay = 24 * 60 * 60 * 1000;

const kImage = {
	extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg']
	, maxWidth: 650
};

function getSipUri(email) {

	const [user, domain] = email.split('@');
	return `${user}@${app.sipDomain}`;
}

function isChannel(uri) { return /chat-/.test(uri); }
function isNotification(msg) { return /\*\*\*/.test(msg); }

function getTime(ts) {
	const now = ts ? new Date(ts * 1000) : new Date;

	const hour = now.getHours();
	const min = now.getMinutes();

	return `${hour > 9 ? hour : '0' + hour}:${min > 9 ? min : '0' + min}`;
}

function getDate(ts) {
	const d = typeof ts == 'number' ? new Date(ts) : ts;

	const month = d.toLocaleString('default', { month: 'short' });

	return `${d.getDate()} ${month}`;
}

function getDay(ts) { return Math.floor(ts / kDay) * kDay; }
function getMinute(ts) { return Math.floor(ts / kMinute) * kMinute; }

function renderMessage(text) {
	const blocks = buildMessageGroups(text);

	let html = '';
	for (let i = 0; i < blocks.length; ++i) {

		const type = blocks[i].type;
		const text = blocks[i].text;
		const mode = blocks[i].mode;

		switch (type) {

			case 'text': {
				// html += `<pre>${renderPlainMessage(text)}</pre>`;
				html += `${renderPlainMessage(text)}`;
			}
			break;

			case 'code':
			if (mode) html += renderMessageWithMode(mode, text);
			// else html += `<pre class="code">${text}</pre>`;
			else html += `\n<code>${text}</code>\n`;
			break;

			case 'image':
			// todo
			break;

			case 'link':
			break;

		}

	}

	//console.log('RNDER MSG:', blocks);
	return html.trim();
}

function renderPlainMessage(text) {

	text = renderHeadings(text);

	console.log('Before render:', text);

	return urlify(dom.renderEmojis(text));
}


function renderMessageWithMode(mode, text) {

	switch (mode) {

		case 'feed': {
			const data = JSON.parse(text);

			let html = '';

			if (Array.isArray(data)) {

				for (const i of data) {

					if (true/*i.thumb*/) {

						html += renderFeed(i);
					}
					else {
						// html += `<div class="column"><h4>${i.title}</h4><p>${i.short}</p></div>`;
						// html += `<p><h4>${i.title}</h4><pre>${i.short}</pre></p>`;
						html += `<a style="display:block" target="_blank" href="${i.link}"><h4>${i.title}</h4><pre>${i.short}</pre></a>`;
					}
				}

			}

			//console.log(html);

			return html;
		};

		break;

	}

	return text;
}

function renderFeed(i) {

	// console.log('RENDER FEED:', i.link);

	const host = `https://${i.ns}`;
	const url = new URL(i.link.startsWith('/') ? host + i.link : i.link);

	// return `<a class="row" target="_blank" href="${i.link}"><img src="${i.thumb}"><div class="info"><h4>${i.title}</h4><pre>${i.short}</pre></div></a>`;
	// return `<a class="row" target="_blank" href="${i.link}"><img class="thumb" src="${i.thumb}"><div class="info"><div class="row"><h4 class="fit">${i.title}</h4><img class="logo" src="${url.origin + '/favicon.ico'}"></div><pre>${i.short}</pre></div></a>`;
	// return `<a class="row" target="_blank" href="${i.link}"><img class="thumb" src="${i.thumb}"><div class="info"><div class="row"><img class="logo" src="${url.origin + '/favicon.ico'}"><h4 class="fit">${i.title}</h4></div><pre>${i.short}</pre></div></a>`;
	// return `<a class="feed row"><img class="thumb" src="${i.thumb}"><div class="info"><div class="row"><img class="logo" src="${url.origin + '/favicon.ico'}"><h4 class="fit">${i.title}</h4></div><pre class="fit">${i.short}</pre><time>07:45, 25 ное</time></div></a>`;

	// let html = '<div class="feed row">';
	// let html = `<div class="feed row" data-id=${i.id} onclick="app.handleFeedClick(this)">`;
	let html = `<div class="feed row" data-id=${i.id} onclick="if (event.target.tagName != 'A') app.handleFeedClick(this)">`;

	if (i.thumb) {
		html += `<img class="thumb" src="${i.thumb}">`;
		html += '<div class="info">';
	} else {
		html += '<div class="info no-thumb">';
	}

	html += '<div class="row">';
	html += `<img class="logo" src="${url.origin + '/favicon.ico'}">`;
	html += `<h4 class="fit">${i.title}</h4>`;
	html += '</div>';

	html += `<pre class="fit">${i.text || i.short || i.title}</pre>`;

	html += '<div class="footer row">';
	if (i.ts) {
		const d = new Date(i.ts);
		html += `<time datetime="${d.toISOString()}">${formatDate(d)}</time>`;
	}
	html += `<a target="_blank" href="${i.link.startsWith('/') ? host + i.link : i.link}">link</a>`;
	//html += '<span>link</span>';
	html += '</div>';

	html += '</div>';
	html += '</div>';

	// console.log('Rendering HTML:', html);

	return html;
}

function renderHeadings(text) {
	text = text
		.replace(/``([^`]+)``/, (m, k) => `<i>${k}</i>`)
		.replace(/`([^`]+)`/, (m, k) => `<b>${k}</b>`)
		;

	const m = text.match(/^([']{1,4} )/);
	if (m) {
		const h = m[1].length - 1;

		if (h <= 4) {
			const tag = `h${h}`;

			const s = text.substr(m[1].length).trim();
			console.log('ADD H:', s);

			text = `<${tag}>` + s + `</${tag}>`;
		}
	}

	return text;
} 

function formatDate(d) {
	return `${('0' + d.getHours()).slice(-2)}:${("0" + d.getMinutes()).slice(-2)}, ${('0' + d.getDate()).slice(-2)} ${d.toLocaleString('default', { month: 'short' })}`;
}



function buildMessageGroups(str) {

	//console.log('BUILD MSG:', str);

	// let re = /```(.*)```/sg;
	let re = /```(\[[a-zA-Z]+\])?(.*)```/sg;

	const blocks = [];
	let start = 0;

	let match;
	while ((match = re.exec(str)) != null) {
		//console.log("match found at " + match.index);
		// console.log(match);
        const mode = match[1] || '';
		const s = str.slice(start, match.index).trim();

		const b = match.index + 3 + mode.length;
		const e = b + match[2].length;
		const code = str.slice(b, e).trim();

		start = match.index + match[0].length;

		if (s.length > 0) {
			blocks.push({
				text: s
				, type: 'text'
			});
		}

		if (code.length > 0) {
			const i = {
				text: code
				, type: 'code'
			};

			if (mode != '')
				i.mode = mode.slice(1, mode.length - 1);

			blocks.push(i);
		}
	}

	if (blocks.length == 0) {
		blocks.push({ text: str.trim(), type: 'text' });
	}
	else {
		if (start < str.length - 1) {

			blocks.push({ text: str.slice(start, str.length - 1).trim(), type: 'text' });
		}
	}

	// console.log(blocks);

	return blocks;
}

function urlify(text) {
	var urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.replace(urlRegex, url => {
		const link = new URL(url);
		if (/youtube\.com$/.test(link.hostname)) {
			const vid = link.searchParams.get('v');

			const embed = `${link.protocol}//${link.hostname}/embed/${vid}`;
			
			return `<iframe src="${embed}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
		}

		return '<a href="' + url + '" target="_blank">' + url + '</a>'
	});
	// or alternatively
	// return text.replace(urlRegex, '<a href="$1">$1</a>')
}

async function uploadLocalFiles(files) {

	console.log('UPLOAD local files', files.length);

	const images = [];
	const audio = [];
	const video = [];
	const text = [];
	const zip = [];
	const pdf = [];

	for (const i of files) {

		const type = fileX.getType(i.type);

		switch (type) {

			case 'image': {
				const img = await loadImage(i, kImage.maxWidth);
				img.classList.add('image');
				img.dataset.id = i.name.hashCode();

				// adding some extra attrs
				img.name = i.name;
				img.size = i.size;
	
				images.push(img);
			}
			break;

			case 'audio':
			audio.push(i);
			break;

			case 'video':
			video.push(i);
			break;

			case 'text':
			text.push(i);
			break;

			case 'zip':
			zip.push(i);
			break;

			case 'pdf':
			pdf.push(i);
			break;
		}
		
	}

	const total = images.length + audio.length + video.length;
	const options = [];

	if (text.length == 1 && [zip, pdf].reduce((a,b) => a.length + b.length, 0) == 0) {
		const file = text[0];

		if (file.size < 2048)
			options.push('message');
	}

	// todo: check user drive
	if (true) {
		options.push('drive');
	}

	// firebase storage
	if (app.sudo) options.push('storage');

	if (options.length == 0) {
		console.error('No available destinations');
		// todo: editor emit warning popup
		return;
	}

	const data = {
		images
		, audio
		, video
		, total
		, text
		, zip
		, pdf

		, options 
	}

	console.log('RENDER template', data);

	const container = dom.createElement('div', 'container-col', 'max-width', 'w3-padding-bottom');

	const e = dom.renderTemplate('file-upload-message', data);

	if (images.length > 0) {
		// create slide-show
		const imgs = e.querySelectorAll('img');
		if (imgs.length > 1) {
			Array.from(imgs).slice(1).map(i => dom.hideElement(i));
		}
	}

	dom.openTab(e, 'torrent');

	container.appendChild(e);

	for (const i of video) {
		const img = await loadVideoThumb(i);
		container.appendChild(img);
		//this.group.append(video);
	}

	return container;
}


export {
	getSipUri

	, getDate
	, getTime
	, getDay
	, getMinute

	, isChannel
	, isNotification

	, renderMessage
	, renderHeadings
	, buildMessageGroups

	, uploadLocalFiles

	, kDay
	, kMinute

	, kImage 
}