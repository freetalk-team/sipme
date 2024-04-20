
function toMarkdown(data, type=data.type) {

	if (typeof data == 'string')
		return data
			.replace(/"(.*?)"/g, (m, i) => `***${i}***`)
			.replace(/\((.*?)\)/g, (m, i) => `(*${i}*)`)
			;

	switch (type) {

		case 'files':
		return filesToMarkdown(data);

		case 'task':
		return taskToMarkdown(data);

		case 'article':
		return articleToMarkdown(data);
	}

	return null;
}

function fromMarkdown(md, type) {

	switch (type) {
		case 'post':
		return getPostInfo(md);
	}

	return { content: md };
}

function filesToMarkdown(files) {

	let m, l, md = '### Files share\n\n|name|size||\n|:-----|:-:|:-:|';

	for (const i of files) {

		l = i.link;
		// m = l.match(/drive:\/\/([^?]+)\?type=([a-z]+)/);

		// if (m) {
		// 	l = app.google.viewLink(m[1]);
		// }

		md += `\n|${i.name}|${fileX.formatSize(i.size)}|[link](${l})|`;
	}

	return md;

}

function taskToMarkdown(data) {
	
	let md = '### ' + data.title || data.summary;

	if (data.user) {
		let user = data.user;
		// if (typeof user == 'string') {
		// 	user = await app.loadContact(user);
		// 	data.user = user;
		// }
		// md += '\n\n*Author:* ' + `**${user.name}**`; 
		md += '\n<font size="2">*Author:* ' + `**${user.name}**</font>`; 
	}

	if (data.ts) {
		const d = new Date(data.ts * 1000);
		md += `\n<font size="2">*Created: ${d.formatTimeDate()}*</font>`; 
	}

	if (data.md) {
		md += '\n\n' + data.md
			.replace(/^#{1,3}/mg, '####')
			; 
	}

	return md;
}

function articleToMarkdown(info) {
	let md = '';

	let channel;

	if (info.channel)  {

		if (typeof info.channel == 'string') {
			channel = info.channel;
			//info.channel = await app.loadChannel(info.channel);
		}
		else {
			channel = info.channel.id;
		}

	}

	if (info.thumb) {
		md += `![thumb alt <](${info.thumb})\n`;
	}

	md += '### ' + info.title + '\n\n';
	// if (info.short) {
	// 	md += info.short + '\n\n';
	// }

	if (!info.logo) {
		const url = new URL(info.link);
		info.logo = url.origin + '/favicon.ico';
	}

	let date = info.date;
	if (!date) {
		const d = new Date(info.time || (info.ts * 1000));
		date = d.formatTimeDate();
	}

	md += `![logo alt <](${info.logo}) <font size="3">[link](${info.link}) *${date}*</font>`;

	return md;
}


function getPostInfo(mdOrData) {

	let md, assign = false;

	if (typeof mdOrData == 'object') {
		md = mdOrData.content;
		assign = true;
	}
	else {
		md = mdOrData;
	}

	let m, title, thumb, content = md;
	
	m = md.match(/^(!\[[^\]]+\]\((.*)\))?[ \n]*(.*)/);
	if (m) {

		thumb = m[2];
		content = m[3];

		m = content.match(/^(#{1,6}[ ]+(.*))?[ \n]*(.*)/);
		if (m) {
			title = m[2];
			content = m[3] || title;
		}
	}

	const info = Object.deleteUndefined({ title, thumb });

	if (assign)
		Object.assign(mdOrData, info);

	info.content = content;

	return info;
}

// function getPostInfo(md) {
// 	const [,, thumb, content ] = md.match(/^(!\[[^\]]+\]\((.*?)\)\n+)?(.*)/);

// 	let title;
// 	let m = content.match(/^#{1,6}[ \t]+(.*)$/);
// 	if (!m) 
// 		m = content.match(/^(.*)$/);

// 	title = m[1].trim();
// 	if (title.length > kMaxTitleLength)
// 		title = title.slice(0, kMaxTitleLength) + '...';

// 	return { title, thumb };
// }


Object.assign(window, {
	toMarkdown
	, fromMarkdown
	, getPostInfo
});