
export async function loadArticle(data, container, append=false, beforeLast=false) {

	let e;
	let content = '';

	if (append)
		e = container;
	else {
		e = dom.createElement('span', 'article', 'md', 'nomargin', 'fade');
		if (container) {
			if (beforeLast)
				dom.insertBefore(e, container.lastElementChild);
			else
				container.appendChild(e);
		}
	}

	e.classList.add('loading3');

	if (data.content) {
		content = data.content;
	}
	else {

		const id = typeof data == 'string' ? data : data.id;
		const ds = app.ds('news');

		let r;

		try {

			r = await ds.local.get(id);
			if (r && r.content) {
				content = r.content;
			}
			else {

				r = await delayResolve(ds.remote.get(id), 1200);

				content = r.content;

				await ds.local.put(r);
			}
			
		}
		catch (err) {
			console.error('Failed to load article');
			if (container)
				dom.removeElement(e);

			e.classList.remove('loading3');
			return null;
		}
	}

	content = toMarkdown(content);
	const html = dom.markdown(content);

	e.classList.remove('loading3');

	if (append)
		e.innerHTML += html;
	else
		e.innerHTML = html;

	return e;
}
