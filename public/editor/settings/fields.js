
const Fields = {

	string(opt={}) {
		check(opt);
		return Object.assign({
			type: 'string'
			, value: i => i.value
			, valid: v => true
		}, opt);
	},

	time(opt={}) {
		check(opt);
		return Object.assign({
			type: 'time'
			, value: i => i.value
			, valid: v => true
		}, opt);
	},

	integer(opt={}) {
		check(opt);
		return Object.assign({
			type: 'number'
			, value: (i) => Number(i.value)
			, valid: v => true
		}, opt)
	},

	option(opt={}) {
		check(opt);
		return Object.assign({ 
			type: 'option'
			, value: i => i.value.toLowerCase()
		}, opt);
	},

	variant(opt={}) {
		check(opt);
		return Object.assign({
			type: 'variant'
			, value: i => i.value.toLowerCase()
			, valid: v => true
		}, opt);
	},

	text(opt={}) {
		check(opt);
		return Object.assign({
			type: 'text'
			, value: i => i.value
			, valid: v => true
		}, opt);
	},

	radio(opt={}) {
		check(opt);
		return Object.assign({ 
			type: 'radio'
			, value: i => i.value.toLowerCase()
			, valid: v => true
		}, opt);
	}

	, list(opt={}) {
		check(opt);
		return Object.assign({
			type: 'list'
		}, opt);
	}

	, content(opt={}) {
		check(opt);
		return Object.assign({ type: 'content'}, opt);
	}

	, required(o) {
		const t = { ...o };
		t.required = true;
		return t;
	}

	, name: {
		type: 'string'
		, name: 'name'
		, title: 'Name'
		, value: i => i.value
		, check: v => v.length > 2
		, noedit: true
	}

	, firstname: {
		type: 'string'
		, name: 'firstname'
		, value: i => i.value
		, check: v => v.length > 2
	}

	, lastname: {
		type: 'string'
		, name: 'lastname'
		, value: i => i.value
		, check: v => v.length >= 2
	}

	, desc: {
		type: 'text'
		, name: 'desc'
		, title: 'Description'
		, value: i => i.value
		, valid: v => true
	}

	, email: {
		type: 'string'
		, name: 'email'
		, title: 'Email'
		, value: i => i.value
		, check: validate.email
	}

	, ns: {
		type: 'string'
		, name: 'ns'
		, title: 'Namespace'
		, value: i => i.value
		, check: v => v.length > 3
	}

	, domain: {
		type: 'string'
		, name: 'domain'
		, title: 'Domain'
		, value: i => i.value
		, check: validate.domain
	}

	, url: {
		type: 'string'
		, name: 'url'
		, title: 'Url'
		, value: i => i.value
		, check: validate.url
	}

	, role: {
		type: 'option'
		, name: 'role'
		, title: 'Role'
		, options: ['User', 'Site admin', 'Admin']
		, value: i => i.value.toLowerCase().replace(/ /g, '')
		, valid: i => true
	}

	, access: {
		type: 'option'
		, name: 'access'
		, title: 'Access'
		, options: ['Public', 'Private']
		, value: (i) => i.value.toLowerCase()
		, valid: i => true
	},

	perm: {
		type: 'option'
		, name: 'perm'
		, title: 'Permission'
		, options: ['Full', 'Read only']
		, value: (i) => i.value.toLowerCase().replace(/ /g, '')
		, valid: v => true
	}

	, channel: {
		type: 'option'
		, name: 'channel'
		, title: 'Channel'
		, options: () => app.contacts.getChannels()
		, value: (i) => Number(i.value)
		, valid: v => true
	}

	, comp: {
		type: 'option'
		, name: 'comp'
		, title: 'Component'
		, options: () => app.contacts.getComponents()
		, value: (i) => Number(i.value)
		, valid: v => true
	}
	
	, timeout: {
		type: 'number'
		, name: 'timeout'
		, title: 'Timeout'
		, value: (i) => Number(i.value)
		, valid: i => true
	}

	, tls: {
		type: 'boolean'
		, name: 'tls'
		, title: 'Tls'
		, value: (i) => i.checked
		, valid: v => true
	}

	// , runner: {
	// 	type: 'option'
	// 	, name: 'runner'
	// 	, title: 'Runner'
	// 	, options: ['None', 'Daily', 'Weekly', 'Monthly', 'Full']
	// 	, value: (i) => i.value.toLowerCase().replace(/ /g, '')
	// 	, valid: v => true
	// }

	

	, category: {
		type: 'option'
		, name: 'category'
		, title: 'Category'
		, options: ['News', 'Social', 'Sport', 'Education', 'Fun']
		, value: i => i.value.toLowerCase()
		, valid: v => true
	},

	region: {
		type: 'region'
		, name: 'region'
		, title: 'Region'
		, options: ['EU', 'Bulgaria']
		, value: i => i.value.toLowerCase()
		, valid: v => true
	},

	tag: {
		type: 'string'
		, name: 'tag'
		, title: 'Tag'
		, value: i => i.value.toLowerCase()
		, valid: v => v.length > 2
	},

	
};

function check(opt) {
	if (!opt.title) {
		opt.title = opt.name.capitalizeFirstLetter();
		opt.name = opt.name.toLowerCase();
	}
}

export {
	Fields
}