
// import CodeMirror from './codemirror.js';

const kDarkTheme = 
	// 'pastel-on-dark'
	// 'paraiso-dark'
	'base16-dark'
	;

class CodeMirrorWrapper {
	
	static createTextArea(container) {

		const e = document.createElement('textarea');

		container.appendChild(e);

		return CodeMirror.fromTextArea(e, {
				mode: 'javascript'
				, keyMap: 'vim'
				, lineNumbers: true
				, autoRefresh: true
				, lineWrapping: true
				, scrollbarStyle: 'overlay'
				//, value: "function myScript() {\n\treturn 100;\n}\n"
				//, extraKeys: {"Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }}
				, foldGutter: true
				, gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
			});
	
	}

	static async create(container, type='js', dark=false) {

		const mode = getMode(type);

		await checkImported();

		const opt = getEditorOptions({ mode });
		if (dark)
			opt.theme = kDarkTheme;

		console.log('Creating CodeMirror editor', opt);

		return CodeMirror(container, opt);

	}

	static async bind(textarea, type='js', dark=false) {
		const mode = getMode(type);

		await checkImported();

		const opt = getEditorOptions({ mode, 
			height: 'auto', 
			viewportMargin: Infinity,
		});

		if (dark)
			opt.theme = kDarkTheme;

		console.log('Binding CodeMirror editor', opt);

		return CodeMirror.fromTextArea(textarea, opt);
	}
}

async function checkImported() {
	
}

function getMode(type) {
	const kSupported = {
		js: 'javascript', 
		md: { name: 'markdown', highlightFormatting: true },
		html: 'htmlmixed',
		css: 'css'
	};

	const name = kSupported[type];
	if (!name)
		throw new Error('Unsupported code editor mode:', type);

	return name;
}

function getEditorOptions(opt={ mode: 'js' }) {
	const kDefaultOptions = {
		keyMap: 'vim'
		, lineNumbers: true
		, autoRefresh: true
		, lineWrapping: true
		, scrollbarStyle: 'overlay'
		//, value: "function myScript() {\n\treturn 100;\n}\n"
		, foldGutter: true
		, gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
		, extraKeys: { "Ctrl-Space": "autocomplete" }
		, autoCloseTags: true
		, matchBrackets: true
		, autoCloseBrackets: true
	}

	return Object.assign(kDefaultOptions, opt);
}

export default CodeMirrorWrapper;
