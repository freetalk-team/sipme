
import { EditorBase } from './editor/base.js';

import { VideoEditor } from './editor/video/page.js';

// import { createTwoFilesPatch } from './ui/lib/diff/diff.js';

class Editor extends EditorBase {

	
	constructor(id='editor') {
		super();


		this.#addCommonEditors();

		app.on('timeupdate', e => this.#onTimeUpdate(e.detail));
	}

	set dirty(v) {
		const page = this.currentPage;

		page.dirty = v;

		// console.log('Editor DIRTY', page);

		// if (page.hasOwnProperty('dirty')) {
		// 	console.log('### Editor appling dirty');
		// 	page.dirty = v;
		// }
	}

	#addCommonEditors() {
		// this.addPage('account', new AccountEditorPage);
		this.addPage('video', new VideoEditor);
	}

	#onTimeUpdate(ts) {
		this.currentEditor.updateTimes(ts);
	}

	static defaultSettings() {
		return {
			menu: {
				panel: {
					width
				}
			}
		};
	}
}


export {
	EditorBase
	, Editor
}

/*

parser = new DOMParser();
xmlDoc = parser.parseFromString(text,"text/xml");

*/