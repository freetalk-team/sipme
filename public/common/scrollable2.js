

const kMinScrollY = 50;

const ScrollableMixin = {
	
	
	append(e, top=false) {
		if (top) this.area.insertBefore(e, this.area.firstElementChild);
		else this.area.appendChild(e);
	}

	, appendTemplate(id, data, tag='div', ...styles) {
		const e = dom.renderTemplate(id, data, tag, [...styles]);
		this.append(e);
		return e;
	}

	, removeContent() {
		dom.removeChilds(this.area);
	}

	, querySelector(s) { return this.area.querySelector(s); }
	, querySelectorAll(s) { return this.area.querySelectorAll(s); }

	, getLastElement() { return this.area.lastElementChild; }
	, getFirstElement() { return this.area.firstElementChild; }


	, moveTop(e, after=false) {
		after 
			? dom.moveAfterTop(e)
			: dom.moveTop(e);
	}

	, insertTop(e) {
		dom.insertTop(e, this.area);
	}

	, addStyle(...styles) {
		this.area.classList.add(...styles);
	}

	, removeStyle(...styles) {
		this.area.classList.remove(...styles);
	}

	, removeSelf() { dom.removeElement(this.area); }

	, getViewport() {
		return this.area.getBoundingClientRect();
	}

	, showSelf(parent) {
		const e = parent ? this.area.parentElement : this.area;
		dom.showElement(e);
	}

	, hideSelf(parent) {
		const e = parent ? this.area.parentElement : this.area;
		dom.hideElement(e);
	}

	, childCount() {
		return this.area.childElementCount;
	}
}

class Scrollable /*extends EventTarget*/ {

	#container;
	#area;

	#width;

	get area() { return this.#area; }

	get viewport() { return this.#container.getBoundingClientRect(); }

	set bottom(v) { this.alignBottom = v; this.posY = 1; }

	get sliderMaxY() { return this.height - this.sliderHeight; }
	get sliderPosY() { return this.sliderMaxY * this.posY; }

	get containerElement() { return this.#container; }
	get parentElement() { return this.#container.parentElement; }
	get firstElement() { return this.#container.firstElement; }

	get Y() { return this.posY; }
	set Y(y) {
		this.posY = y;

		this.#updateSliderPos();
		this.#updateContent();
	}

	get offsetY() { return Math.floor(this.posY * this.totalHeight); }
	set offsetY(pixels) {
		if (this.totalHeight > 0) {
			const pos = Math.abs(pixels / this.totalHeight);
			this.Y = pos <= 1 ? pos : 1;
		}
	}

	constructor(container) {
		// super();

		// console.log('#### CONTINER', container);

		this.height = container.getBoundingClientRect().height;

		this.scroller = container.querySelector('div.v-scroller');
		this.slider = this.scroller.querySelector('div.slider');

		this.#area = container.querySelector('div.content');

		const area = this.area.getBoundingClientRect();
		this.totalHeight = area.height;
		this.#width = area.width;

		this.posY = 0.0;
		this.alignBottom = false;
		this.scrolling = false;

		if (this.#area.hasAttribute('bottom')) {
			this.bottom = true;
		}

		this.#container = container;
		this.#updateSize();

		this.resizeObserver = new ResizeObserver((e) => {

			const height = Math.floor(container.getBoundingClientRect().height);

			// console.log('Scrollable: Size change', height);

			if (height > 0) {
				this.height = height;
				this.#updateScroller();
			}
		});
		
		this.resizeAreaObserver = new ResizeObserver(() => {

			const area = this.#area.getBoundingClientRect();
			// this.totalHeight = this.area.getBoundingClientRect().height;
			const height = Math.ceil(area.height);

			if (Math.abs(this.#width - area.width) > 20) {
				this.#width = area.width;

				const marquees = this.area.querySelectorAll('.marquee-container > .marquee');
				for (const i of marquees) {

					const w = i.clientWidth;
					const n = i.parentElement.clientWidth;

					let s = (n / 100) * 1.2; 

					if (w > n) s += w / n;
					else s -= n / w;

					s = Math.floor(s);
					if (s < 4) s = 4;

					i.style.animationDuration = `${s}s`;
				}
			}

			// console.debug('Scrollable size change:', this.offsetY, this.posY, this.totalHeight,  height);

			if (height > 0) {

				// const y = this.alignBottom 
				// 	? (this.posY == 1 ? height : this.totalHeight - this.offsetY) 
				// 	: this.offsetY;

				const y = this.alignBottom ? this.totalHeight - this.offsetY : this.offsetY;

				const h = this.totalHeight;

				this.totalHeight = height;
				this.#updateSize();

				this.offsetY = this.alignBottom ? height - y : y;
				this.onHeightChange(h, height, this.height);
			}

		});
	}

	

	registerEvents() {
		// console.log('SCROLL: Register observ events');

		this.resizeObserver.observe(this.#container);
		this.resizeAreaObserver.observe(this.area);

		this.#container.addEventListener('wheel', this, { passive: true });
		this.#container.addEventListener('keyup', this);

		this.registerSliderEvents();

		// this.area.addEventListener('focus', (e) => {
		// 	console.log('Scrollable focus change');
		// });
	}

	unregisterEvents() {
		//console.log('SCROLL: Unregister observ events');

		this.resizeObserver.unobserve(this.#container);
		this.resizeAreaObserver.unobserve(this.area);

		this.#container.removeEventListener('wheel', this);
		this.#container.removeEventListener('keyup', this);

		this.unregisterSliderEvents();
	}

	registerSliderEvents() {
		this.slider.addEventListener('mouseup', this);
		this.slider.addEventListener('mousedown', this);
		this.slider.addEventListener('mouseleave', this);
		this.slider.addEventListener('mousemove', this);

		// todo: improve draging out of area 
		// this.#container.addEventListener('mousemove', this);
		// this.#container.addEventListener('mouseup', this);
	}

	unregisterSliderEvents() {
		this.slider.removeEventListener('mouseup', this);
		this.slider.removeEventListener('mousedown', this);
		this.slider.removeEventListener('mouseleave', this);
		this.slider.removeEventListener('mousemove', this);

		// todo
		// this.#container.removeEventListener('mousemove', this);
		// this.#container.removeEventListener('mouseup', this);
	}

	handleEvent(e) {

		// console.log('SCROLL: handle event =>', e.type);

		switch (e.type) {

			case 'wheel':
			//console.log('ON SCROLL', this.height, this.totalHeight, this.posY, e.deltaY);
			if (this.totalHeight > this.height) {

				//let p = this.scrollerPosY + deltaY*(this.height/this.totalHeight);
				if (this.posY <= 0 && e.deltaY < 0) return;
				if (this.posY >= 1 && e.deltaY > 0) return;

				// const dy = unclamp(e.deltaY, kMinScrollY);
				const dy = e.deltaY;

				// console.debug('# POS before:', this.posY, dy);

				let p = this.posY + dy / this.totalHeight;
				if (p > 1) p = 1;
				else if (p < 0) p = 0;

				this.posY = p;
				//console.log('# POS after:', this.posY);

				this.#update();
			}

			return true;

			case 'keyup': {


				if (this.totalHeight > this.height) {

					const dy =  this.height / this.totalHeight;
					// console.log('Key DOWN event:', e.keyCode, this.posY, dy);

					// page up
					if (e.keyCode == 33) {
						if (this.posY > 0) {

							this.posY -= dy;
							if (this.posY < 0) this.posY = 0;

							this.#update();
						}
					}
					// page down]
					else if (e.keyCode == 34) {

						if (this.posY < 1) {

							this.posY += dy;
							if (this.posY > 1) this.posY = 1;

							this.#update();
						}
					}


				}

				return true;
			}
			break;

			case 'mousedown':
			e.stopPropagation();
			this.scrolling = true;
			this.sliderY = e.offsetY;
			break;

			case 'mouseup': 
			e.stopPropagation();
			this.scrolling = false;
			break;

			case 'mousemove': {

				if (this.scrolling) {
					e.stopPropagation();

					// console.log('Mouse move', e.offsetY - this.sliderY, this.sliderHeight);

					const dy = e.offsetY - this.sliderY;
					const y = this.sliderPosY;

					if (y <= 0) {
						if (dy <= 0) return;

						this.posY = dy / this.sliderMaxY;
					}
					else {
						this.posY *= (y + dy) / y;
					}

					// console.log('Mouse move', y, dy);
					
					if (this.posY > 1) this.posY = 1;
					else if (this.posY < 0) this.posY = 0;

					this.#update();
				}
			}
			break;

			case 'mouseleave': {
				this.scrolling = false;
				e.stopPropagation();
			}
			break;
		}

		return false;
	}

	setFocus() { this.#container.focus(); }

	scrollTo(e) {

		const r = e.getBoundingClientRect();
		// const top = e.offsetTop;
		const top = r.top;

		if (top <= 10) {
			this.Y = 0;
			return;
		}

		const total = this.totalHeight;

		if (total > 0) {

			console.log('###', top, total);

			this.Y = top / total;
		}
	}
	
	scrollBottom() {

		this.posY = 1;
		this.#update();

		if (this.alignBottom) {

			// console.log('Scroll bottom:', this.height, this.totalHeight);

			if (this.totalHeight < this.height) {
				this.area.style.top = `${this.height - this.totalHeight}px`;
			}
		}
	}

	onScrollY() {}
	onHeightChange() {}

	#update() {
		this.#updateSliderPos();
		this.#updateContent();

		const y = Math.floor(this.posY * this.totalHeight);

		// this.emit('y-scroll', y);
		//this.dispatchEvent(new CustomEvent('y-scroll', {detail: y }));
		this.onScrollY(y, this.totalHeight);
	}

	#updateSize() {
		// console.log('Scroll update size:', this.height, this.totalHeight, this.posY);
		this.#updateScroller();
		this.#updateContent();
	}

	#updateScroller() {
		//console.log('Update scroller', this.height, this.totalHeight);

		if (this.totalHeight == 0) {
			this.scroller.style.display = 'none';
			return;
		}

		if (this.totalHeight <= this.height) {
			this.scroller.style.display = 'none';
		}
		else {

			this.scroller.style.display = 'block';
			this.scroller.style.height = `${this.height}px`;

			const r = this.height / this.totalHeight;

			let h = this.height * r;
			if (h < 20) h = 20;

			this.slider.style.height = `${h}px`;
			this.sliderHeight = h;

			// setting position
			this.#updateSliderPos();
		}

	}

	#updateSliderPos() {
		const p = Math.floor((this.height - this.sliderHeight) * this.posY);
		this.slider.style.top = `${p}px`;
	}

	#updateContent() {
		if (this.totalHeight <= this.height) {
			if (this.alignBottom)
				this.area.style.top = `${this.height - this.totalHeight}px`;
			else
				this.area.style.top = '0px';

			return;
		}

		
		const maxPosY = this.totalHeight - this.height;
		const y = Math.ceil(this.posY*maxPosY);

		// console.debug('#UPDATE CONTENT:', this.height, this.totalHeight, y, this.posY);

		this.area.style.top = `${-y}px`;
	}

	

	// #updateContentBottom() {
	// 	if (this.totalHeight < this.height) {


	// 		return;
	// 	} 

	// 	this.#updateContent();
	// }

	static createContent(container) {
		const slider = dom.createElement('div', 'slider');
		// slider.setAttribute('tabindex', '-1');

		const scroller = dom.createElement('div', 'v-scroller');
		// scroller.setAttribute('tabindex', '-1');
		scroller.appendChild(slider);

		const shadow = dom.createElement('div', 'shadow');
		// shadow.setAttribute('tabindex', '-1');

		const content = dom.createElement('div', 'content');
		content.setAttribute('tabindex', '0');

		const area = dom.createElement('div', 'area');
		// area.setAttribute('tabindex', '1');
		area.appendChild(shadow);
		area.appendChild(content);

		container.appendChild(scroller);
		container.appendChild(area);

		container.classList.add('scrollable');
	}

	static create(container) {
		Scrollable.createContent(container);
		return new Scrollable(container);
	}

	static createElement(container) { 
		const e = dom.renderTemplate('scrollable');

		if (container)
			container.appendChild(e);

		return e;
	}

	static createMixin(container) {

		return {
			area: container
			, ...ScrollableMixin
		}
	}
}



Object.assign(Scrollable.prototype, ScrollableMixin);

class ScrollableContent extends Scrollable {
	constructor(container) {

		const list = createList();
		container.appendChild(list);

		super(list);
	}
}

function createList() {
	const list = document.createElement('div');
	list.className = 'list';

	const scroller = document.createElement('div');
	scroller.className = 'v-scroller';

	const slider = document.createElement('div');
	slider.className = 'slider';

	scroller.appendChild(slider);
	list.appendChild(scroller);

	const area = document.createElement('div');
	area.className = 'area';

	const shadow = document.createElement('div');
	shadow.className = 'shadow';

	const content = document.createElement('div');
	content.className = 'content';

	area.appendChild(shadow);
	area.appendChild(content);

	list.appendChild(area);

	return list;
}

export {
	Scrollable
	, ScrollableContent
	, ScrollableMixin
}
