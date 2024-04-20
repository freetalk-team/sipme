

export class EditorBase extends UX.Page {

	get area() { return this.container; }

	constructor (container, type, template='editor-player-content-base') {

		const e = dom.renderTemplate(template, {});
		e.classList.add(type, 'hidden');

		if (container)
			container.appendChild(e);

		super(e);
	}

	load() {}
	search() {}

	onClick() {}
	onInput() {}
	onAction() {}
	onFilesDrop() {}
	onTabChange() {}

	onTrackChange() {}
	onTrackStop() {}

}

Object.assign(EditorBase.prototype, UX.ListMixin)