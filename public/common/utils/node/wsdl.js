
const fs = require('fs').promises,
	xmldom = require("xmldom")
	;

global.DOMParser = xmldom.DOMParser;

global.fileX = {
	async readFile(path) {
		const data = await fs.readFile(path);
		return data.toString();
	} 
}


require = require('esm')(module);
module.exports = require('../wsdl');
