import CodeMirror from '../component.js';
import { autocomplete } from '../../common/autocomplete.js';

import { createPicker } from '../../ui/lib/picmo/picmo.js';
import Cropper from '../../ui/lib/cropperjs/index.js';

const kExternal = ['edit', 'preview', 'test'];

export class SettingsList {

	#container;
	#valid = true;
	#editors;
	#custom = {};
	#md;
	#fields;
	#err;
	#pickers = [];
	#cropper;

	get area() { return this.#container.area; }

	constructor(container) {
		container.area.classList.add('settings', 'container-col', 'm5');

		this.#container = container;

		this.area.oninput = (e) => this.#handleInputChange(e.target);
		this.area.onchange = (e) => this.#handleInputChange(e.target);
	}

	load(fields, info={}) {

		console.log('Settings load items', fields, info);

		this.#reset();

		const map = new Map;
		const err = new Set;

		for (let i of fields) {

			if (typeof i == 'string') {

				switch (i) {

					case 'opponent':
					i =  {
						type: 'autocomplete'
						, name: 'opponent'
						, title: 'Opponent'
						, placeholder: 'Select an opponent'
						, value(i) { return i.dataset.id; }
						// , async options() {
						// 	const ds = app.ds('contact');
						// 	const contacts = await ds.ls('contact');
						// 	for (const i of contacts) {
						// 		if (!i.photo)
						// 			i.icon = 'fas fa-user-circle';
						// 	}
						// 	return contacts;
						// }

						, ds: 'contact'
					}
					break;
				}
			}

			if (kExternal.includes(i.type)) continue;

			const name = i.name.toLowerCase();

			if (i.type == 'custom') {

				const field = new i.Instance();
				this.#custom[name] = field;

				const p  = field.render(info);
				if (isPromise(p))
					p.then(e => this.#container.append(e));
				else
					this.#container.append(e);
			}
			else {

				let edit = true;

				// if (!i.val)
				if (i.name in info) {
					i.val = info[i.name];
					// if (i.val && i.noedit)
					// 	edit = false;

				}

				let type = i.type;
				if (type == 'json')
					type = 'text';

				const e = this.#container.addItemTemplate(`settings-${type}-field`, i);
				map.set(name.toLowerCase(), i);
				
				if ((i.required && !i.val) || (i.check && i.val && !i.check(i.val)))
					err.add(name);

				switch (i.type) {
					case 'autocomplete': {
						const input = e.querySelector('input');
						
						if (Array.isArray(i.options)) {
							autocomplete(input, i.options);
						}
						else if (typeof i.options == 'function') {

							const r = i.options();

							if (isPromise(r)) {
								r.then(opts => autocomplete(input, opts));
							}
							else {
								autocomplete(input, r);
							}
						}
					}
					break;

					case 'radio': {

						const inputs = e.querySelectorAll('input');
						if (i.val) {
							for (const e of inputs) {
								if (e.value == i.val) {
									e.checked = true;
									break;
								}
							}
						}
						else {
							inputs[0].checked = true;
						}
					}
					break;

					case 'region':
					case 'option':
					if (i.val) {
						const o = e.querySelector(`select > option[value="${i.val}"]`);
						if (o)
							o.selected = true;
					}
					break;

					case 'optiontab':
					if (i.val) {
						const o = e.querySelector(`select > option[value="${i.val}"]`);
						if (o)
							o.selected = true;

						const flds = {};
						for (const { name, fields } of i.options) {

							if (!fields) continue;

							for (const i of fields)
								flds[i.name] = i;
						}

						const inputs = e.querySelectorAll('[data-tab] input');
						for (const i of inputs) {
							const name = i.name;
							const f = flds[name];

							if (f && f.val) {
								// todo: radio input
								i.value = f.val;
							}

						}

						const selects = e.querySelectorAll('[data-tab] select');
						for (const i of selects) {
							const name = i.name;
							const f = flds[name];

							if (f && f.val) {
								const o = i.querySelector(`option[value="${f.val}"]`);
								if (o)
									o.selected = true;
							}
						}

						const tab = e.querySelector(`[data-tab="${i.val}"]`);
						if (tab) {
							dom.moveAfterTop(tab);
						}
					}
					break;

					case 'text': {

						const element = e.querySelector('textarea');

						if (i.val) {
							element.value = i.val;
						}	
						if (i.md) {

							element.setAttribute('md', '');

							const mde = new MDE({ element, spellChecker: false, autoDownloadFontAwesome: false });
							this.#md = mde;
						}
					}
					break;

					case 'json': {
						const element = e.querySelector('textarea');
						element.setAttribute('type', 'json');

						if (i.val) {
							element.value = JSON.stringify(i.val);
						}
					}
					break;

					case 'list': 
					if (i.val && Array.isArray(i.val)) {

						const ul = e.querySelector('ul');
						for (const info of i.val) {
							const li = dom.renderTemplate(i.template, info, 'li');
							ul.appendChild(li);
						}
					}
					break;

					case 'faicon': {
						const rootElement = e.querySelector('.picker');
						const picker = createPicker({ rootElement, theme: 'dark' });

						this.#pickers.push(picker);
							
						// picker.addEventListener('emoji:select', (selection) => {
						// 	emoji.innerHTML = selection.emoji;
						// 	name.textContent = selection.label;
						
						// 	selectionContainer.classList.remove('empty');
						// });
						
					}
					break;

					default:
					if (!edit) {
						const input = e.querySelector('input');
						// input.readonly = true;
						input.setAttribute('readonly', '');
					}
					break;
				}
			}
		}

		this.#fields = map;
		this.#err = err;
		this.#valid = err.size == 0;

		this.onvalidchange(this.#valid);

		return;
		const edits = this.#queryEdits();
		if (edits.length > 0) {
			this.#editors = {};

			for (const i of edits) {
				CodeMirror.bind(i, 'js', true).then((cm) => {

					// cm.setValue('\n'.repeat(9));

					// cm.getInputField().name = i.name;
					this.#editors[i.name] = cm;
				});
			}
		}
		else {
			this.#editors = undefined;
		}
	}

	getData() {
		const data = {};
		const inputs = this.#queryInputs();
		for (const i of inputs) {

			if (i.name == '') continue;

			switch (i.tagName) {

				case 'INPUT': {

					if (i.dataset.id) {
						data[i.name] = i.dataset.id;
					}
					else {
	
						switch (i.type) {
							case 'checkbox':
							data[i.name] = !!i.checked;
							break;
	
							case 'radio':
							if (i.checked) data[i.name] = i.value;
							break;
	
							case 'number':
							data[i.name] = Number(i.value)
							break;
	
							// case 'time':
							// break;
							default:
							data[i.name] = i.value;
							break;
						}
					}
	
				}
				break;

				case 'TEXTAREA':
				if (i.hasAttribute('md')) {
					// todo: multiple md fields
					data[i.name] = this.#md.value(); 
					break;
				} else {
					const type = i.getAttribute('type');
					if (type == 'json') {
						data[i.name] = JSON.parse(i.value);
						break;
					}
				}

				default:
				data[i.name] = i.value;
				break;


			}

		}

		const lists = this.#queryLists();
		for (const i of lists) {
			const items = Array.from(i.querySelectorAll('li[data-id]')).map(i => i.dataset.id);
			data[i.getAttribute('name')] = items;
		}

		if (this.#editors) {
			for (const [name, cm] of Object.entries(this.#editors)) 
				data[name] = cm.getValue();
		}

		for (const [name, field] of Object.entries(this.#custom)) {

			data[name] = field.getValue();
		}

		if (this.#cropper) {
			data.photo = getPhoto(this.#cropper);
		}

		return data;
	}

	onvalidchange(valid) {
		console.log('Setting valid change', valid);
	}

	async onFileDrop(files) {
		const e = this.#container.querySelector('.dropzone');
		if (!e)
			return;

		dom.removeChilds(e);

		e.classList.add('active');

		for (const i of files) {

			this.#cropper = await loadPhoto(i, e);
			// e.appendChild(img);

			break;
		}
	}

	#queryInputs(exclude=true) {
		// const inputs = ['input', 'select', exclude ? 'textarea:not([data-mode])' : 'textarea'];
		// const q = `:not(.hidden) :is(${inputs.join(',')})`;
		const q = exclude ? 'input,select,textarea:not([data-mode])' : 'input,select,textarea';
		return this.area.querySelectorAll(q);
	}

	#queryEdits() {
		return this.area.querySelectorAll('textarea[data-mode]');
	}

	#queryLists() {
		return this.area.querySelectorAll('ul[name]');
	}

	#reset() {

		this.#custom = {};

		if (this.#cropper) {
			this.#cropper.destroy();
			this.#cropper = null;
		} 


		// for (const i of this.#md) {
		// 	i.toTextArea();
		// }

		// this.#md = [];
		if (this.#md) {
			this.#md.toTextArea();
			this.#md = null;
		}

		if (this.#editors) {

			for (const cm of Object.values(this.#editors))
				cm.toTextArea(); // release memory for the editors

			this.#editors = undefined;
		}

		for (const i of this.#pickers)
			i.destroy();

		this.#pickers = [];

		// this.#container.clear();
		this.#container.removeContent();
	}

	#handleInputChange(i) {
		const kNotInput = ['checkbox', 'radio', 'color'];
		const docheck = i.name != '' && (i.tagName == 'TEXTAREA' || (i.tagName == 'INPUT' && !kNotInput.includes(i.type)));

			// console.log('Setting value changed', i.name, value, check);

		if (!docheck) return;

		const map = this.#fields;
		const err = this.#err;
		const value = i.tagName == 'INPUT' && i.type == 'checkbox' ? !!i.checked : i.value;

		const name = i.name;
		const { check } = map.get(name);

		if (check && !check(value)) {
			err.add(name);
			i.classList.add('error');
		}
		else {
			err.delete(name);
			i.classList.remove('error');
		}

		// console.log('ERRR:', err.size);

		if (err.size == 0) {
			if (!this.#valid)
				this.onvalidchange(true);

			this.#valid = true;
		}
		else {
			if (this.#valid)
				this.onvalidchange(false);

			this.#valid = false;
		}
	}
}

Object.assign(SettingsList.prototype, UX.ListMixin);

async function loadPhoto(file, container, name='default') {

	const img = await loadImage(file, 600);

	console.debug('PHOTO loaded', file.name);

	container.appendChild(img);

	const cropper = new Cropper(img, {
		aspectRatio: 1,
		viewMode: 1,
		ready: function () {
			// croppable = true;
		},
	});

	cropper.name = name;

	return cropper;
}

function getPhoto(cropper) {
	const cropped = cropper.getCroppedCanvas();

	// Round
	const canvas = getRoundedCanvas(cropped);

	const data = canvas.toDataURL('image/png');
	
	return data;
}

function getRoundedCanvas(sourceCanvas) {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	var width = sourceCanvas.width;
	var height = sourceCanvas.height;

	canvas.width = width;
	canvas.height = height;
	context.imageSmoothingEnabled = true;
	context.drawImage(sourceCanvas, 0, 0, width, height);
	context.globalCompositeOperation = 'destination-in';
	context.beginPath();
	context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI, true);
	context.fill();
	return canvas;
  }

/*

 select {
    border: none;
    background: transparent;
    -webkit-appearance: none;
    -moz-appearance: none;
     appearance: none;
    width: 180px;
    padding-top: 0px;
    background-size: 20px;
    color:#ffffff;
    font-size:30px;
  }


  select option {
    color:#424146;
    background:#ffffff;

    
}

<select name="town" >
      <option value="London">London <i class="fa fa-caret-down" aria-hidden="true"></i>
      </option>
      <option value="Paris">Paris</option>
      <option value="Madrid">Madrid</option>
      </select>

*/