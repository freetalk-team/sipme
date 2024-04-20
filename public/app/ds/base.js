

export class DataSourceBase {

	#name;

	get name() { return this.#name; }

	constructor(name) {
		this.#name = name;
	}

	ls() {}
	count() {}

	get() {}
	put() {}
	set() {}

	search() {}
}