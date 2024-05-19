
import './utils.js';
import '../common/utils.js';
import '../common/core.js';

import { IndexDB as Database } from '../db.js';
import { Player } from '../player.js';

import { EditorBase as Editor } from '../editor/base.js';
import { Sidebar } from '../sidebar2.js';
import { Runner, TaskRunner } from '../editor/runner.js';

import { DataSource } from './ds.js';

import { EventMixin } from './event.js';


const kMaxTitleLength = 100;
const kIdleTimeout = 120;

export class AppBase extends UX.Page {

	static Database = Database;
	static Player = Player;

	static Editor = Editor;
	static Sidebar = Sidebar;

	static DataSource = DataSource;

	static Commands = {

		register(id, cb) {
			this[id] = cb;
		}
	};
	
	#notifications = false;
	#active = false;

	#home = {};
	#ui;
	#db;
	#fs;
	#settings = {};
	#runner = new TaskRunner([30*60, 5*60, 60]);
	#monitor = new Runner({ interval: 5, log: true });
	#idle;
	
	#sidebar;
	#editor;

	get runner() { return this.#runner; }
	get monitor() { return this.#monitor; }

	get sidebar() { return this.#sidebar; }
	get editor() { return this.#editor; }
	get expanded() { return true; }

	get ui() { return this.#ui; }

	get currentEditor() { return this.editor.currentEditor; }

	get db() { return this.#db; }
	get fs() { return this.#fs.root; }
		
	get musicDirectory() { return this.#home ? this.#home.music : null }
	get defaultAvatar() { return '/ui/svg/contact.svg'; }
	get defaultRoom() { return '/ui/svg/contact-green.svg'; }

	get recent() { return this._recent; }
	get recentPath() { 
		//return `recent-${this.uid}`; 
		// todo: move in app
		return `recent`; 
	}

	handleCommand(id, ...params) {
		const cb = AppBase.Commands[id];
		if (cb) {
			cb(...params);
			return true;
		}

		return false;
	}

	isme(user) { 

		if (!user) return false;

		if (typeof user == 'string')
			return user.isEmail() ? user == this.email : user == this.uid; 

		return user.id == this.uid;
	}

	memberOf() { return false; }

	constructor(container='main') {
		super(container);

		window.app = this;

		this.event = new EventTarget;
		this._ = {}; // Mixin will use that

		// console.log('Creating APP global object', window.loaded);

		const theme = localStorage.getItem("theme");
		const systemSettingDark = window.matchMedia("(prefers-color-scheme: dark)");

		let currentThemeSetting = calculateSettingAsThemeString(theme, systemSettingDark);

		// todo: implement light theme 
		//updateTheme(currentThemeSetting);

		// if (window.loaded)
		// 	this.load();
		// else
		// 	window.onload = () => this.load();

		window.onbeforeunload = () => this.unload();
		// window.onvisibilitychange = () => document.hidden ? this.onBlur() : this.onFocus();
		document.onvisibilitychange = () => document.hidden ? this.onBlur() : this.onFocus();
		// document.closePopup = () => {
		// 	if (document._popup) {
		// 		document._popup.close();
		// 		delete document._popup;
		// 	}
		// }
		document.onclick = (event) => {
			const e = event.target;

			if (document._popup) {
				document._popup.onDocumentClick(event);
			}

			if (e.hasAttribute('expandable')) {

				if (!['A','CODE'].includes(e.tagName)) 
					e.classList.toggle('expanded');
			}
			else  {

				switch (e.tagName) {

					case 'BUTTON': {
						if (e.closest('#titlebar')) {
							this.onAction(e.name, e);
							return;
						}

						
						
						// switch (e.name) {

						// 	case 'testcall':
						// 	// this.onIncomingCall('wuZEDLTE1ChC4Y0ESQiQjl9K2lwx');
						// 	this.onIncomingCall('wnnM1tkyFFEw9XEFhPOcqrd5Hdu1');
						// 	break;
						// }
					}

					break;
				}

			}
		}

		document.onchange = (event) => {

			const e = event.target;

			switch (e.tagName) {
				case 'SELECT':
				if (e.hasAttribute('tab')) {
					const p = e.parentElement.querySelector(`[data-tab="${e.value}"]`);
					dom.insertAfter(p, e);
				}
				break;
			}

		}

		document.onmousedown = (e) => {

			const target = e.target;

			if (target.classList.contains('v-sash')) {

				const area = target.previousElementSibling;
				const reverse = target.classList.contains('reverse');
				//console.log('SASH mousedown', e.target);
	
				const startX = e.clientX;
				// const startW = parseInt(document.defaultView.getComputedStyle(area).width, 10);
				const startW = area.offsetWidth;
	
				//console.log('SASH resize start', startX, startW);
	
				document.body.style.cursor = 'e-resize';
	
				const doDrag = (e) => {
					// console.log('###', e.clientX);
					const delta = startX - e.clientX;
					const width = reverse ? startW + delta : startW - delta;
					
					// console.log('SASH => ', reverse, delta, width);
	
					area.style.width = `${width}px`;
				};
	
				const stopDrag = (e) => {
					document.documentElement.removeEventListener('mousemove', doDrag, false);
					document.documentElement.removeEventListener('mouseup', stopDrag, false);
	
					document.body.style.cursor = 'default';
	
					// todo: use custom attribute
					const id = area.id;
					if (id) {
						const width = parseInt(area.style.width);
						this.updateWidth(id, width);
					}
				};
	
				document.documentElement.addEventListener('mousemove', doDrag, false);
				document.documentElement.addEventListener('mouseup', stopDrag, false);
			}

			// todo: handle v slider properly
		}

		document.oncopy = (e) => {
			//console.log('ON COPY:', e.clipboardData);

			const target = e.target;

			if (target.hasAttribute('contenteditable')) {
				e.clipboardData.setData("text/plain", target.textContent.trim());
				e.preventDefault();
				return;
			}
		}

		// document.onfreeze = () => {
		// 	console.debug('# On Hibernate !!!');
		// 	this.onHibernate();
		// }

		// document.onresume = () => {
		// 	console.debug('# On hibernate resume !!!');
		// 	this.onResume();
		// }

		window.addEventListener('freeze', (event) => {
			console.debug('# On Hibernate !!!');
			// console.log('freeze', event);
		  }, {capture: true});
		  
		  window.addEventListener('resume', (event) => {
			console.debug('# On hibernate resume !!!');
			// console.log('resume', event);
		  }, {capture: true});

		// htmlLink = "<a href='#'>link</a>";
		// function listener(e) {
		// 	e.clipboardData.setData("text/html", htmlLink );
		// 	e.clipboardData.setData("text/plain", htmlLink );
		// 	e.preventDefault();
		// }
		// document.addEventListener("copy", listener);
		// document.execCommand("copy");
		// document.removeEventListener("copy", listener);

		// <div oncopy="return false;">Here you have protected text</div>
	}

	createDatabase() {
		return new Database;
	}

	createEditor() {
		return new Editor;
	}

	createSidebar() { 
		return new Sidebar;
	}

	async setupDatabase() {

		// todo: 
	}

	addDS(ds, name) {
		this._[name || ds.name] = ds;
	}

	ds(id) {
		return this._[id];
	}

	toggleLoading() {
		return super.toggleLoading('loading2');
	}

	async load() {

		// console.log('CONFIG', Config)

		try {
			this.#fs = await fs.init();
		}
		catch (e) {
			console.error('Failed to initialize TMPFS', e);
		}

		const db = this.createDatabase();

		try {
			await db.init();
			this.#db = db;
		}
		catch (e) {
			console.error('Failed to initialize IndexedDB', e);
		}

		await this.loadSettings();
		await this.registerServiceWorker();

		this.#sidebar = this.createSidebar();
		this.#editor = this.createEditor();
	
		this.#active = true;

		this.#notifications = await this.requestNotifications();

		console.log('Notifications enabled?', this.#notifications);

		// todo
		// must be called inside  button.onclick handler, otherwise it will throw an error
		// await this.startIdleDetecton();

		this.#loadSettingFields();

		this.player = new Player;
		this.player.registerEvents();

	}

	requestNotifications() {
		return false;
	}

	registerServiceWorker() {}

	unload() {
		console.log('Unloading app');
	}

	onFocus() {
		// console.log('APP on focus');
		this.#active = true;
		this.#monitor.resume();
		console.debug('# Resuming monitor');

		if (this.#idle) {
			clearTimeout(this.#idle);
			this.#idle = undefined;
		}
		else {
			this.runner.resume();
			this.emit('idle', false);
		}

	}

	onBlur() {
		// console.log('APP on blur');
		this.#active = false;
		this.#monitor.suspend();

		console.debug('## Susspending monitor');

		this.#idle = setTimeout(() => {

			this.#idle = undefined;
			this.runner.suspend();
			this.emit('idle', true);

		}, kIdleTimeout * 1000);

	}

	onHibernate() {

		this.db.updateHistory();
	}

	onResume() {

	}

	async setHomeDirectory(root) {

		console.log('Setting home directory', root);

		const images = root.getDirectoryHandle('Pictures', { create: true} );
		const music = root.getDirectoryHandle('Music', { create: true} );

		this.#home = { root, images, music };

		

		// return this.#db.put('settings', { type: 'storage', data: this.#home });
		// return this.#db.put('settings', { type: 'storage', root, images, music });
		// return this.#db.put('settings', { type: 'storage',  });
		return this.#db.put('settings', { type: 'storage', root });
	}

	getRootDirectory(name) {
		return fs.directory(this.fs, name, { create: true })
	}

	async getImagesDirectory() { 
		if (this.#home.images) return this.#home.images;

		this.#home.images = await this.getRootDirectory('Images');

		return this.#home.images;

		// const root = this.#home.root;
		// if (root) {

			

		// 	// // Request permission. If the user grants permission, return true.
		// 	// if ((await root.requestPermission({ mode: 'readwrite'})) === 'granted') {
		// 	// 	return true;
		// 	// }

		// 	// // if (! await verifyPermission(root, true)) {
		// 	// // 	console.error('No user permissions');
		// 	// // 	return null;
		// 	// // }


		// 	// try {

		// 	// 	this.#home.images = await root.getDirectoryHandle('Pictures', { create: true} );
		// 	// }
		// 	// catch (e) {
		// 	// 	console.error('APP: Failed to get image directory', e);
		// 	// }
		// }

		// return this.#home.images;
	}

	async loadSettings() {
		const ui = localStorage.getItem('ui');
		if (ui) this.#ui = JSON.parse(ui);
		else this.defaultSettings();

		const settings = await this.db.ls('settings');
		for (const i of settings) {

			const type = i.type;
			delete i.type;

			switch (type) {
				case 'storage': 
				this.#home = i;
				break;

				default:
				this.#settings[type] = i;
				break;
			}
		}
		console.log('SETTINGS loaded', settings);
	}

	initUser() {}

	defaultSettings() {

		this.#ui = {
			sidebar: Sidebar.defaultSettings()
		};
	
		this.updateSettings();
	}

	setUserInfo() {

		const elements = this.container.querySelectorAll('[role="username"]');
		const username = this.displayName;

		for (const i of elements)
			i.innerText = username;
	}

	updateSettings() {
		localStorage.setItem('ui', JSON.stringify(this.#ui));
	}

	updateWidth(id, val) {
		const target = this.#ui[id];

		if (!target) this.#ui[id] = { width: val };
		else target.width = val;

		this.updateSettings();
	}

	updateSetting(id, value) {
		const target = this.#ui[id];

		if (!target) this.#ui[id] = value;
		else Object.assign(target, value);

		this.updateSettings();
	}

	async startIdleDetecton() {

		if (await IdleDetector.requestPermission() !== "granted") {
			console.error("Idle detection permission denied.");
			return;
		}

		try {
			const idleDetector = new IdleDetector();
			idleDetector.addEventListener('change', () => {
			  const userState = idleDetector.userState;
			  const screenState = idleDetector.screenState;
			  console.log(`Idle change: ${userState}, ${screenState}.`);
			});
		
			await idleDetector.start({
			  threshold: 60000,
			  signal,
			});

			console.log('IdleDetector is active.');

		  } catch (err) {
			// Deal with initialization errors like permission denied,
			// running outside of top-level frame, etc.
			console.error(err.name, err.message);
		  }
	}
	
	startLifecycle(updater=true) {
		const now = new Date;
		const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); 

		// const offset = (tomorrow - now).seconds();

		// this.#runner.setTimeout(86400, () => {
		// 	this.emit('datechange');
		// }, true, offset);

		setTimeout(() => {
			this.emit('datechange');

			setInterval(() => this.emit('datechange'), 86400000);
		}, tomorrow - now);

		if (updater) {
			this.#runner.setTimeout(120, () => this.emit('timeupdate', Date.now()), true);
		}
	}

	openEditor(...args) {
		this.onOpenEditor(...args);

		this.editor.open(...args);
	}

	cancelEditor() {
		this.editor.cancel();
	}

	onOpenEditor(type, ...args) {
		console.log('APP: Opening editor', type);

		if (!['find', 'add', 'video'].includes(type)) {
			this.sidebar.onOpenEditor(type, ...args);
		}
	}

	doOpenEditor(...args) {
		this.editor.open(...args);
	}


	doSave() {
		console.log('Updating storage');

		//const objects = this.objects

		localStorage.setItem('objects', JSON.stringify([...this.objects]));
	}

	save(immediate=false) {

		if (immediate) {
			this.doSave();
			return;
		}

		if (!this.saveTimeout) {

			console.log('APP: Starting save timer ...');

			this.saveTimeout = setTimeout(() => {

				this.doSave();
				delete this.saveTimeout;
			}, kSaveTimeout);

		}
	}

	async add(type, info, update=false) {

		// if (update) {

		// 	if (typeof info == 'string') {
		// 		info = await this.db.get(type, info);
		// 	}

		// 	const id = info.id;

		// 	const data = typeof update == 'object' ? { ...update } : { ...info };

		// 	delete data.id;
		// 	data.remote = false;

		// 	await this.db.update(type, id, data);
		// }

		this.editor.notify(`'${type}' ${update ? 'updated' : 'added'}`);

		if (!update)
			this.emit(`${type}add`, info);
	}

	startPushClient() {

		const kServer = 
			`ws://${location.host}/push/ws`
			//'wss://localhost:5060/test'
			//'ws://localhost:5060/test'
			//'ws://127.0.0.1:8090/test'
			;

		console.log('HOST:', kServer);
		const connection = new WebSocket(kServer);

		connection.onopen = (e) => {
			console.debug('WS PUSH TEST CONNECTION: connected');
			connection.send(JSON.stringify({ method: 'bind', user: this.uid }));


			// for testing
			// this.monitor.setTimeout(20, () => {

			// 	if (['CLOSED', 'CLOSING'].includes(connection.readyState) ) {
			// 		this.startPushClient();
			// 		return;
			// 	}

			// 	connection.send(JSON.stringify({ method: 'ping', user: this.uid }));
			// }, true);

			// setTimeout(() => {
			// 	connection.send(JSON.stringify({ method: 'watch', service: 'route' }));
			// }, 3000)
		}

		connection.onmessage = (e) => {
			const message = e.data;

			const msg = JSON.parse(message);
			console.debug('## PUSH received:', msg);

			const [, ischannel, ru] = msg.to.match(/\/topics\/(channel-)?(.+)/);
			const data = msg.data;

			if (ischannel) {
				data.id = ru;
				this.onChannelPush(data);
				return;
			}

			let payload = data.msg;

			if (data.user && data.user.startsWith('chat-')) {

				const m = data.msg.match(/\[(.+)\]: (.+)/);
				if (!m) {
					console.error('Message not matching room format:', data);
					return;
				}

				const [, user, text] = m;

				data.room = data.user.slice(5);
				data.user = user;

				payload = text;
			}

			const isJson = msg.type == 'json' || /^\{.*\}$/.test(payload);
			data.msg = isJson ? JSON.parse(payload) : payload;
			
			// console.log(data);
			this.onPush(data);
		}

		connection.onclose = () => {
			console.log('PUSH socket remote close');
			//setTimeout(() => this.startPushClient(), 5000);
		}

		connection.onerror = (e) => {
			console.error('PUSH socket error', e);
		}
	}

	getInfo(type, id) {

		switch (type) {

			case 'channel': {

				const info = AppBase.kVirtualChannels[id];
				if (info) return info;
			}
			break;
		}

		return this.db.get(type, id);
	}

	showNotification(area, msg, type='warning', timeout=2000) {

		switch (area) {
			case 'editor':
			return this.#editor.showNotification(msg, type, timeout);
		}
	}

	onAction(action, e) {
		let cmd;

		if (cmd = e.getAttribute('cmd')) {
			this.executeCommand(...cmd.split('-'));
		}
	}

	async importAudioFiles(files, progress=function(){}) {

		const imported = [];
	
		for (const file of files) {
	
			const id = file.name.hashCode();

			progress(id, 'begin', file);

			const i = await this.db.get('audio', id);
	
			if (i) {
				file.meta = i.meta;
				continue;
			}
	
			const meta = file.meta || await fileX.getMeta(file);
			const ext = fileX.getExtension(file.name);
			const type = fileX.isVideo(ext) ? 'video' : 'audio';

			progress(id, 'meta', meta);
	
			const item = {
				id, type, file
			};
	
			console.log('# Importing file:', file.name);
	
			item.rating = 0;
			item.meta = meta;
			item.album = meta.album ? meta.album.toLowerCase().hashCode() : 0;
	
			await app.db.put('audio', item);

			progress(id, 'end');
	
			imported.push(item);
		}

		progress(null, 'done');
	
		app.emit('audioadd', imported);

		return imported;
	}

	#loadSettingFields() {

		

	}

	static kVirtualChannels = {
		support: {
			id: 'support',
			display: 'Support',
			desc: 'Get help from Support Team',
			icon: 'f059'
		}
	}

	get virtualChannels() { return AppBase.kVirtualChannels; }
}

Object.assign(AppBase.prototype, EventMixin);

window.App = AppBase;

function getObject(id) {
	return localStorage.getItem(id);
}

function sendRequest(path, headers={}, text=true) {
	// throw new Error('From where it comes');
	console.log('HTTPX Sending request:', path);
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					let r;
					if (text) {
						// console.log('XHTTP response:', xhttp.responseText);
						r = JSON.parse(xhttp.responseText);
					}
					else {

						const response = xhttp.response;

						console.log('RESPONSE:', typeof response, response);

						const json = inflate(response, { to: 'string' });
						r = JSON.parse(json);
					}

					resolve(r);
				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('GET', path, true);

		if (!text) xhttp.responseType = 'arraybuffer';

		//xhttp.setRequestHeader('keepa-live', 'timeoout=5, max=100');
		// xhttp.setRequestHeader('Accept-encoding', 'deflate, gzip');

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send();
	});
}

function postRequest(path, req={}, headers={}) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					let r;
					if (xhttp.responseText)
						r = JSON.parse(xhttp.responseText);

					resolve(r);

				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('POST', path, true);

		xhttp.setRequestHeader('content-type', 'application/json');
		// xhttp.setRequestHeader('Accept-encoding', 'deflate, gzip');

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send(JSON.stringify(req));
	});
}

function deleteRequest(path, headers={}) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = () => {
			if(xhttp.readyState === XMLHttpRequest.DONE) {
				var status = xhttp.status;
				if (status === 0 || (status >= 200 && status < 400)) {

					//const r = JSON.parse(xhttp.responseText);
					//resolve(r);
					resolve();
				}
				else {
					reject(status);
				}
			}
		};

		xhttp.open('DELETE', path, true);

		for (const [name,val] of Object.entries(headers))
			xhttp.setRequestHeader(name, val);

		xhttp.send();
	});
}

function download(content, mimeType, filename){
	var a = document.createElement('a')
	var blob = new Blob([content], {type: mimeType})
	var url = URL.createObjectURL(blob)
	a.setAttribute('href', url)
	a.setAttribute('download', filename)
	a.click()
}

function readFile(filename) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();

		console.log('Reading file', filename);

		reader.readAsText(filename);

		reader.onload = function() {
			//console.log(reader.result);
			resolve(reader.result);
		};

		reader.onerror = function() {
			//console.log(reader.error);
			reject(reader.error);
		};

	});
	
}

function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);

	console.log('Decoded cookie', typeof decodedCookie, decodedCookie);

	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		//console.log(c, name);
		if (c.indexOf(name) == 0) {
				const val = c.substring(name.length, c.length);
				//console.log(val);

				return JSON.parse(val);
		}
	}

	return undefined;
}

function deleteCookie(cname) {
	//console.log(document.cookie);
	const sections = document.cookie.split('; ');
	// console.log(sections);
	// const newcookie = sections.filter(i => i.split('=')[0] != cname);
	// console.log(newcookie);
	document.cookie = sections.filter(i => i.split('=')[0] != cname).join('; ');
	//console.log(document.cookie);
}

function evaluate(vars, exp) {
	//console.log('EVALUATE:', vars, exp);
	//return eval(`with (vars) { ${exp}; }`);
	return new Function('vars', `with (vars) { ${exp}; }`)(vars);
}

async function verifyPermission(fileHandle, readWrite) {
	const options = {};
	if (readWrite) {
	  options.mode = 'readwrite';
	}

	try {

		// Check if permission was already granted. If so, return true.
		if ((await fileHandle.queryPermission(options)) === 'granted') {
			return true;
		}
		// Request permission. If the user grants permission, return true.
		if ((await fileHandle.requestPermission(options)) === 'granted') {
			return true;
		}
	}
	catch (e) {
		console.log('APP: check file permissions =>', e);
	}
	  
	// The user didn't grant permission, so return false.
	return false;
}

function calculateSettingAsThemeString(localStorageTheme, systemSettingDark) {
	if (localStorageTheme !== null) {
	  return localStorageTheme;
	}
  
	if (systemSettingDark.matches) {
	  return "dark";
	}
  
	return "light";
  }
  

function updateTheme(theme) {
	document.querySelector("html").setAttribute("data-theme", theme);
}
