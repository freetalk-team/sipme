

import { WikiEditor } from "./page.js";

App.Editor.register(WikiEditor);

App.Commands.register('wiki-load-content', async (id, { item }) => {
	
	let e = item.querySelector('[role="content"]');

	if (!e) {

		try {

			e = dom.renderTemplate('wiki-search-result-content');

			dom.toggleLoading(e);

			item.appendChild(e);

			const content = await delayResolve(app.cache.load('wiki', id), 1200);

			e.innerHTML = dom.markdown(content);

		}
		catch (e) {
			console.error('Failed to load content', e);
		}
		finally {
			dom.toggleLoading(e);
		}
	}
});

export default WikiEditor;