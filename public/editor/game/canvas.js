

export class EditorBase extends UX.Page {

	#ctx;

	get ctx() { return this.#ctx; }
	get canvas() { return this.#ctx.canvas; }

	set width(v) { 
		this.canvas.width = v;
		this.canvas.style.width = `${v}px`;
	}

	set height(v) { 
		this.canvas.height = v; 
		this.canvas.style.height = `${v}px`;
	}

	get width() { return this.canvas.width; }
	get height() { return this.canvas.height; }
	get clientRect() { return this.canvas.getBoundingClientRect(); }

	get viewport() { return this.container.getBoundingClientRect(); }

	constructor(container) {

		let e = container.querySelector('canvas');
		if (!e) {
			e = dom.createElement('canvas');
			container.appendChild(e);
		}

		super (container);

		// const area = e.parentElement;

		// const o = new ResizeObserver(e => this.onViewportChange(e[0].contentRect));
		// o.observe(area);


		this.#ctx = e.getContext('2d');

		e.onmousemove = (e) => this.onMouse(e);
		e.onclick = (e) => this.onClick(e);
	}

	registerHandlers() {
		const e = this.canvas;

		e.onmousemove = (e) => this.onMouse(e);
		e.onclick = (e) => this.onClick(e);

		const o = new ResizeObserver(e => this.handleResize(e[0].contentRect));
		o.observe(this.container);
	}

	init() {}

	onMouse(e) {
		this.handleMouseMove(this.#getPos(e), this.width, this.height);
	}

	onClick(e) {
		this.handleClick(this.#getPos(e), this.width, this.height);
	}

	handleClick() {}
	handleMouseMove() {}
	handleResize() {}

	#getPos(evt) {

		var rect = this.clientRect;
		var w = rect.width;
		var h = rect.height;
		var pos = {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top,
		};
		pos.xp = parseFloat(pos.x / w * 50).toFixed(2);
		pos.yp = parseFloat(pos.y / h * 50).toFixed(2);

		return pos;
	}
} 