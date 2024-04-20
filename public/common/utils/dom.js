
import * as marked from '../../ui/lib/marked/lib/marked.esm.js';
import * as template from './template.js';

const kHighlightStyle = 'highlight';

function highlightElement(e, ms=1800) {

	// e.classList.add(kHighlightStyle);
	// setTimeout(() => e.classList.remove(kHighlightStyle), ms);

	e.classList.remove(kHighlightStyle);
	e.classList.add(kHighlightStyle);
}

function removeChilds(e) {
	while (e.lastElementChild) e.removeChild(e.lastElementChild);
}

function removeElement(e) {
	if (e && e.parentElement)
		e.parentElement.removeChild(e);
	return e;
}

function moveTop(e, selector, value) {

	if (selector) {
		e = e.querySelector(`[${selector}="${value}"]`);
	}

	const p = e.parentElement;
	p.insertBefore(e, p.firstElementChild);
	return e;
}

function moveAfterTop(e) {
	insertAfter(e, e.parentElement.firstElementChild);
}

function moveUp(e) {
	insertBefore(e, e.previousElementSibling);
}

function createIconButton(icon, ...styles) {
	const e = createElement('button', 'icon', 'fa', 'fa-fw', icon, ...styles);
	return e;
}

function facReplace(e, style) {
	const classNames = e.className.split(' ');
	for (const i of classNames)
		if (/^fac-/.test(i)) {
			e.classList.remove(i);
			break;
		}

	e.classList.add(style);
} 

function insertAfter(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode.nextElementSibling);
}

function insertBefore(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode);
}

function insertTop(newNode, container) {
	container.insertBefore(newNode, container.firstElementChild);
}

function createElement(tag, ...styles) {
	const e = document.createElement(tag);
	applyStyles(e, ...styles);
	return e;
} 

function createElementFromMarkdown(md, emojis=true) {
	const e = dom.createElement('span', 'md', 'compact', 'r2', 'nomargin', 'noevents', 'text-expand');
	e.setAttribute('expandable', '');

	const html = markdown(md);
	e.innerHTML = emojis ? renderEmojis(html) : html;

	return e;
}

function applyStyles(e, ...styles) {
	if (styles.length > 0)
		e.classList.add(...styles);
}

function toggleShow(e) {
	return e.classList.toggle('hidden');
}

function hideElement(e) {
	e.classList.add('hidden');
}

function showElement(e, show=true) {
	show ? e.classList.remove('hidden') : e.classList.add('hidden');
}

function isHidden(e) { return e.classList.contains('hidden'); }

function getParent(element, level=1) {
	let parent = element;
	for (let i = 0; i < level; ++i) parent = parent.parentElement;
	return parent;
}

function isVisible(e, vport) {
	const r = e.getBoundingClientRect();
	return !(r.bottom < vport.top || r.top > vport.bottom);
}

function findVisible(vport, items, a=0, b=items.length, i=Math.floor((a+b)/2)) {

	if (a == b) return [];

	// console.log('Checking element index:', i, a, b);

	let e = items[i];
	let r = e.getBoundingClientRect();

	// console.log('Checking element:', r.top, r.bottom, i, e.dataset.id);

	if (r.top >= vport.bottom) {
		return findVisible(vport, items, a, i);
	}

	if (r.bottom <= vport.top)
		return findVisible(vport, items, i + 1, b);

	const visible = [e];
	
	for (let j = i - 1; j >= 0; j--) {
		e = items[j];
		r = e.getBoundingClientRect();

		if (r.bottom > vport.top) {
			visible.unshift(e);
			continue;
		}

		break;
	}

	for (let j = i + 1; j < items.length; ++j) {
		e = items[j];
		r = e.getBoundingClientRect();

		if (r.top < vport.bottom) {
			visible.push(e);
			continue;
		}

		break;
	}
	

	// console.log('Found visible element:', e.dataset.id);
	return visible;

}



function getValues(container, data={}) {

	const items = container.querySelectorAll('[role]');

	for (const i of items) {

		let value;

		switch (i.tagName) {

			case 'IMG':
			value = i.src;
			break;

			case 'A':
			value = i.href;
			break;

			case 'TIME':
			if (i.dateTime) {
				data.ts = new Date(i.dateTime).seconds();
				break;
			}

			default:
			value = i.innerText;
			break;

		}

		if (value)
			data[i.getAttribute('role')] = value;
	}

	return data;
}

function updateValues(container, data) {
	let e;

	for (let [name, value] of Object.entries(data)) {
		e = container.querySelector(`[role="${name}"]`);
		if (e) {

			if (name == 'status') {
				e.innerHTML = renderEmojis(value);
			}
			else {

				switch (e.tagName) {

					case 'IMG':
					e.src = value;
					break;

					default:
					e.innerText = value;
					break;
				}
			}
		}
	}
}

function updateElapsed(e, now=Date.now()) {
	const elements = e.querySelectorAll('time[data-time]');
	for (const i of elements) {

		const ts = i.dataset.time;
		if (ts) {
			const d = new Date(parseInt(ts) * 1000);
			i.innerText = d.offsetFrom(now);
		}
	}
}

function showNextImage(container, next=true) {

	const imgs = container.querySelectorAll('img');
	if (imgs.length < 2) return;

	for (let i=0; i < imgs.length; ++i) {

		const img = imgs[i];
		if (!img.classList.contains('hidden')) {

			let n = i + (next ? 1 : -1);
			if (n < 0) n = imgs.length - 1;
			else if (n == imgs.length) n = 0;

			dom.hideElement(img);
			dom.showElement(imgs[n]);

			const num = container.querySelector('.number');
			if (num) num.innerText = `${n+1} / ${imgs.length}`;

			break;

		}
	}
}

function openTab(container, id) {

	//const kStyle = 'w3-red';
	const kStyle = 'w3-border-red';

	const tablinks = container.getElementsByClassName("tablink");
	for (const i of tablinks) {
		if (i.dataset.id == id) i.classList.add(kStyle);
		else i.classList.remove(kStyle);
	}

	const tabs = container.querySelectorAll('div[data-tab]');
	for (const i of tabs) {
		if (i.dataset.tab == id) dom.showElement(i);
		else dom.hideElement(i);
	}
}

function markdown(s, opt) {

	// a bit ugly
	// s = s.replace(/drive:\/\/([^?]+)\?type=([a-z]+)/g, (m, id, type) => `https://drive.google.com/file/d/${id}/view`);


	const o = { headerIds: false, breaks: true, externalLinks: true };

	if (opt)
		Object.assign(o, opt);

	const text = s.trim();
	const html = marked.parse(text, o);

	// return escape(html);
	return html;
}

function markdowne(s, o) {
	// console.debug(s);
	return s 
		// ? markdown(renderEmojis(s), o)
		? renderEmojis(markdown(s, o))
			// .replaceAll(/\p{Emoji}/ug, (m) => m == '#' ? m : `<i class="em">${m}</i>`)
		: ''; 
}

// experimental !!!
function tomarkdown(e) {
	const parser = new DOMParser;
	const doc = parser.parseFromString(e.innerHTML, 'text/html');

	// console.debug('#$# ', doc);

	let md = '';

	for (const i of doc.body.children) {

		switch (i.nodeName) {

			case '#text':
			md += i.textContent;
			break;

			case 'P':
			md += i.innerText;
			break;

			case 'H6':
			md += '#';
			case 'H5':
			md += '#';
			case 'H4':
			md += '#';
			case 'H3':
			md += '#';
			case 'H2':
			md += '#';
			case 'H1':
			md += '# ' + i.innerText;
			break;

		}
	}

	return md;
}

function renderEmojis(text) {
	/*
		Emojis
		https://www.w3schools.com/charsets/ref_emoji.asp
		https://en.wikipedia.org/wiki/List_of_emoticons
	*/

	const kEmojis = {
		':)': '🙂'
		, ":')": '😃'
		, ':")': '😀'
		
		, ':p': '😋'
		, ":'p": '😛'
		, ':"p': '😝'
	
		, ':P': '😛' 
		, ":'P": '😛'
		, ':"P': '😝'
	
		, ':d': '😀'
		, ":'d": '😄'
		, ':"d': '😆'
	
		, ':D': '😄'
		, ":'D": '😅'
		, ':"D': '😂'
	
		, ':k': '😗'
		, ":'k": '😙'
		, ':"k': '😚'
	
		, ':s': '💯'
		, ':X': '💣'
		, ':t': '👍'
		, ':b': '🍺'
		, ':B': '🍻'
		, ':w': '✋'
	
		, ':(': '😧'
		, ":'(": '😥'
		, ':"(': '😭'
	
		, ':o': '😯'
		, ":'o": '😲'
		, ':"o': '😵'

		, ':8': '😎'


		, ';)': '😉'
	};

	const kEmojiSub = {
		'family': '👪️',
		'zzz': '💤',
		'newspaper': '📰',
		'books': '📚️',
		'up': '👍️',
		'usd': '💲',
		'card': '💳️',
		'money': '💰️',
		'cash': '💸',
		'tm': '™️',
		'boom': '💥',
		'eye': '👁️',
		'eyes': '👀',
		'glasses': '👓️',
		'dizzy': '💫',
		'santa': '🎅',

		// animals
		'bird': '🐦️',
		'dragon': '🐉',
		'fox': '🦊',
		'horse': '🐎',
		'linux': '🐧',
		'mushroom': '🍄',
		'octopus': '🐙',
		'ox': '🐂',
		'shark': '🦈',
		'snake': '🐍',
		'tiger': '🐅',
		'whale': '🐋',

		// nature
		'sunflower': '🌻',
		'tree': '🌳',

		// symbols
		'ok': '🆗',
		'wc': '🚾',
		'wtf': '⁉',
		'new': '🆕',
		'free': '🆓',
		'cool': '🆒',

		// zodiac
		'cancer': '♋️',
		'gemini': '♊️',
		'taurus': '♉️',
		'libra': '♎️',

		// food
		'hamburger': '🍔',
		'honeypot': '🍯',
		'pizza': '🍕',
		'strawberry': '🍓',

		// drinks
		'beer': '🍺',
		'cheers': '🍻',
		'cocktail': '🍸️',
		'coffee': '☕️',
		'drink': '🍹',
		'wine': '🍷',



		// flags
		'bg': '🇧🇬',
		'de': '🇩🇪',
		'es': '🇪🇸',
		'fr': '🇫🇷',
		'gb': '🇬🇧',
		'gr': '🇬🇷',
		'us': '🇺🇸',

		// japanese
		'congratulations': '㊗️',

		// fa
		'cannabis': '<i class="fa fa-cannabis w3-text-green"></i>',
		'joint': '<i class="fa fa-joint"></i>',
		'facebook': '<i class="fa fa-facebook w3-text-blue"></i>',
		'feather': '<i class="fa fa-feather w3-text-indigo"></i>',
	};

	const re = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])|(\p{Emoji_Presentation})/ug;

	return text
		.replaceAll(/\:([A-z]+)\:/g, (m,k) => kEmojiSub[k.toLowerCase()] || m)
		.replaceAll(/([:;]['"]?[)(pPdDksXtbBwo8])/g, (m,k) => kEmojis[k] || m )
		//.replace(/([:;]['"]?[)(pPdDksXtbBwo])/g, (m,k) => `<i class="em">${kEmojis[k]||k}</i>` )
		.replaceAll(re, m => `<i class="em">${m}</i>`)
		;
}

function escapeTags(text) {
	var regex = /(&nbsp;|<([^>]+)>)/ig;
	return text.replace(regex, '');
}

function escape(s) {
	return s.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function icon(id, ...styles) {

	if (!id) return '';

	const color = styles.pop();

	const c = color ? ` style="color:${color}"` : '';
	let [v, s ] = /^f[0-9a-f]{3}/.test(id)
		? [` value="${String.fromCodePoint(parseInt(id, 16))}"`, '']
		: ['', ` ${id}`];

	if (styles.length > 0)
		s += ' ' + styles.join(' ');

	return `<i class="fa${s}"${v}${c}></i>`;
	// return /^f[0-9a-f]{3}/.test(id) ?
	// 	'<i class="fa"' + (color ? ` style="color:${color}">` : '>') + (id ? '&#x' + id : '') + '</i>'; 
		


	//return '<i class="fa"' + (color ? ` style="color:${color}">` : '>') + (id ? '&#x' + id : '') + '</i>'; 
}

function color(id) {
	return id ? `color:${id}`: '';
}

//Returns true if it is a DOM node
function isNode(o){
	return (
	  typeof Node === "object" ? o instanceof Node : 
	  o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
	);
  }
  
  //Returns true if it is a DOM element    
function isElement(o){
	return (
	  typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
	  o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
	);
}

function getData(container, selector='input') {
	const data = {};
	const elements = container.querySelectorAll(selector);

	for (const i of elements) {
		if (i.name) data[i.name] = i.value.trim();
	} 

	return data;
}

function loadScript(url) {
	const script = document.createElement('script');

	script.type = 'text/javascript';
	script.src = url;

	document.getElementsByTagName('head')[0].appendChild(script);

	return new Promise((resolve, reject) => {
		script.onload = resolve;
		script.onerror = reject;
	});
}

function getColor(name) {
	const kColors = [
		'orange', 'green', 'blue', 'orange-light', 'green-light', 'blue-light', 'magenta', 'lightsalmon', 'lightyellow', 'lightsteelblue', 'lightping', 'lightseagreen', 'lightcoral'
	];
	const colorIndex = name.hashCode() % kColors.length;
	return kColors[colorIndex];
}

window.dom = {
	createFa(...styles) { return createElement('i', 'fa', ...styles); }
	, createFaButton: createIconButton
	, highlightElement
	, isNode
	, isElement
	, isElementVisible(e) {
		const r = e.getBoundingClientRect();
		return r.height > 0;
	}
	, removeChilds
	, removeElement
	, insertAfter
	, insertBefore
	, insertTop
	, createElement
	, createElementFromMarkdown
	, showElement
	, hideElement
	, toggleShow
	, isHidden
	, moveTop
	, moveAfterTop
	, moveUp
	, getParent
	, findVisible
	, isVisible
	, getValues
	, updateValues
	, loadScript
	, getData
	, updateElapsed

	, renderTemplate: template.render
	, renderTemplateHtml: template.renderHtml
	, renderTemplateContainer: template.renderContainer
	, template

	, facReplace

	, showNextImage
	, openTab

	, markdown
	, markdowne
	, tomarkdown
	, renderEmojis
	, escapeTags
	, escape

	, icon
	, color

	, attr(name, value) { return value ? `${name}="${value}"` : '' }
	, length(a) { 
		return a ? a.length() : 0; }

	, logoFromLink(url) {
		const u = new URL(url);
		return u.origin + '/favicon.ico';
	}

	, option(selected, ...values) {

		let html = '';

		const render = (i, s) => {
			return `<option value="${i}" ${i == s ? 'selected' : ''}>${i.capitalizeFirstLetter()}</option>`;
		}



		for (let i of values) {

			if (typeof i == 'function') {
				i = i();
			}

			if (Array.isArray(i)) {
				for (let j of i)
					html += render(j, selected);
			}
			else {
				html += render(i, selected);
			}
		}

		return html;
	},

	radio(name, ...values) {
		let html = '';
		let check = true;

		const render = (i, s) => {

			const html = `<input type="radio" name="${name}" value="${i}" ${check ? 'checked' : ''}><label class="radio">${i.capitalizeFirstLetter()}</label>`;

			check = false;
			return html;
		}

		for (let i of values) {

			if (typeof i == 'function') {
				i = i();
			}

			if (Array.isArray(i)) {
				for (let j of i)
					html += render(j);
			}
			else {
				html += render(i);
			}
		}

		return html;
	}
}


// function getCaretCharacterOffsetWithin(element) {
//     var caretOffset = 0;
//     var doc = element.ownerDocument || element.document;
//     var win = doc.defaultView || doc.parentWindow;
//     var sel;
//     if (typeof win.getSelection != "undefined") {
//         sel = win.getSelection();
//         if (sel.rangeCount > 0) {
//             var range = win.getSelection().getRangeAt(0);
//             var preCaretRange = range.cloneRange();
//             preCaretRange.selectNodeContents(element);
//             preCaretRange.setEnd(range.endContainer, range.endOffset);
//             caretOffset = preCaretRange.toString().length;
//         }
//     } else if ( (sel = doc.selection) && sel.type != "Control") {
//         var textRange = sel.createRange();
//         var preCaretTextRange = doc.body.createTextRange();
//         preCaretTextRange.moveToElementText(element);
//         preCaretTextRange.setEndPoint("EndToEnd", textRange);
//         caretOffset = preCaretTextRange.text.length;
//     }
//     return caretOffset;
// }

// /**
//  * @file get/set caret position and insert text
//  * @author islishude
//  * @license MIT
//  */
// export class Caret {
//     /**
//      * get/set caret position
//      * @param {HTMLColletion} target 
//      */
//     constructor(target) {
//         this.isContentEditable = target && target.contentEditable
//         this.target = target
//     }
//     /**
//      * get caret position
//      * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Range}
//      * @returns {number}
//      */
//     getPos() {
//         // for contentedit field
//         if (this.isContentEditable) {
//             this.target.focus()
//             let _range = document.getSelection().getRangeAt(0)
//             let range = _range.cloneRange()
//             range.selectNodeContents(this.target)
//             range.setEnd(_rang.endContainer, _range.endOffset)
//             return range.toString().length;
//         }
//         // for texterea/input element
//         return this.target.selectionStart
//     }

//     /**
//      * set caret position
//      * @param {number} pos - caret position
//      */
//     setPos(pos) {
//         // for contentedit field
//         if (this.isContentEditable) {
//             this.target.focus()
//             document.getSelection().collapse(this.target, pos)
//             return
//         }
//         this.target.setSelectionRange(pos, pos)
//     }
// }

// /**
//  * insert text or orther to editor
//  * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
//  * @module Editor
//  */
// export class Editor {
//     constructor() {

//     }
//     /**
//      * @param {string} content - your insert text
//      * @returns {boolean} 
//      */
//     insertText(content) {
//         document.execCommand('insertText', false, content)
//     }
// }