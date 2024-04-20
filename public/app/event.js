
export const EventMixin = {

	initEvents() {

		this.event = new EventTarget;
	}

	, on(event, cb) { this.event.addEventListener(event, cb); }
	, emit(event, data) { this.event.dispatchEvent(new CustomEvent(event, { detail: data })); }
};