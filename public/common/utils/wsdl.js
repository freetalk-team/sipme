
const parser = new DOMParser();

const SchemaNS = 'http://www.w3.org/2001/XMLSchema';

export class WSDL {

	static async load(options, url) {
		if (typeof url === "function") {
		   done = url;
		   url = null;
		}
	   
		if (typeof options === "string") {
		   url = options;
		   options = null;
		}
	
		var wsdl = new WSDL(options);
	
		typeof url == 'string' && url.startsWith('http')
		   ? await wsdl.load(url)
		   : await wsdl.loadFromFile(url)
		   ; 

		return wsdl;
	   }

	constructor(options) {
		options = options || {};

		this.messageHandlers = [];
		this.partHandlers = [];
		this.portTypeHandlers = [];
		this.bindingHandlers = [];
		this.operationHandlers = [];
		this.serviceHandlers = [];
		this.portHandlers = [];

		if (options.messageHandlers) {
			this.messageHandlers = this.messageHandlers.concat(options.messageHandlers);
		}

		if (options.partHandlers) {
			this.partHandlers = this.partHandlers.concat(options.partHandlers);
		}

		if (options.portTypeHandlers) {
			this.portTypeHandlers = this.portTypeHandlers.concat(options.portTypeHandlers);
		}

		if (options.bindingHandlers) {
			this.bindingHandlers = this.bindingHandlers.concat(options.bindingHandlers);
		}

		if (options.operationHandlers) {
			this.operationHandlers = this.operationHandlers.concat(options.operationHandlers);
		}

		if (options.serviceHandlers) {
			this.serviceHandlers = this.serviceHandlers.concat(options.serviceHandlers);
		}

		if (options.portHandlers) {
			this.portHandlers = this.portHandlers.concat(options.portHandlers);
		}

		if (options.request) {
			this._request = options.request;
		}

		this.messages = [];
		this.portTypes = [];
		this.bindings = [];
		this.services = [];
		this.elements = [];

		this.state = {
			targetNamespace: [],
		};
	}

	
	
	addMessageHandler(messageHandler) {
		this.messageHandlers.push(messageHandler);
	}

	addPartHandler(partHandler) {
		this.partHandlers.push(partHandler);
	}

	addPortTypeHandler(portTypeHandler) {
		this.portTypeHandlers.push(portTypeHandler);
	}

	addOperationHandler(operationHandler) {
		this.operationHandlers.push(operationHandler);
	}

	addPortHandler(portHandler) {
		this.portHandlers.push(portHandler);
	}

	messageFromXML(element) {
		var name = element.getAttribute("name");
	   
		var message = {
		   name: [this.state.targetNamespace[0], name],
		   parts: [],
		};
	   
		var i;
	   
		for (i=0;i<this.messageHandlers.length;++i) {
		   this.messageHandlers[i].call(null, message, element);
		}
	   
		var parts = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "part");
	   
		for (i=0;i<parts.length;++i) {
		   message.parts.push(this.partFromXML(parts[i]));
		}
	   
		return message;
	}

	partFromXML(element) {
		var name = element.getAttribute("name"),
			elementName = element.getAttribute("element");
	   
		elementName = elementName.split(":");
	   
		if (elementName.length > 1) {
		   elementName[0] = element.lookupNamespaceURI(elementName[0]);
		} else {
		   elementName.unshift(null);
		}
	   
		var part = {
		   name: name,
		   element: elementName,
		};
	   
		for (var i=0;i<this.partHandlers.length;++i) {
		   this.partHandlers[i].call(null, part, element);
		}
	   
		return part;
	}

	portTypeFromXML(element) {
		var name = element.getAttribute("name");
	   
		var portType = {
		   name: [this.state.targetNamespace[0], name],
		   operations: [],
		};
	   
		var i;
	   
		for (i=0;i<this.portTypeHandlers.length;++i) {
		   this.portTypeHandlers[i].call(null, portType, element);
		}
	   
		var operations = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "operation");
	   
		for (i=0;i<operations.length;++i) {
		   portType.operations.push(this.operationFromXML(operations[i]));
		}
	   
		return portType;
	}


	bindingFromXML(element) {
		var name = element.getAttribute("name"),
			typeName = element.getAttribute("type");
	   
		typeName = typeName.split(":");
	   
		if (typeName.length > 1) {
		   typeName[0] = element.lookupNamespaceURI(typeName[0]);
		} else {
		   typeName.unshift(null);
		}
	   
		var i;
	   
		var binding = {
		   name: [this.state.targetNamespace[0], name],
		   type: typeName,
		   operations: [],
		};
	   
		for (i=0;i<this.bindingHandlers.length;++i) {
		   this.bindingHandlers[i].call(null, binding, element);
		}
	   
		var operations = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "operation");
	   
		for (i=0;i<operations.length;++i) {
		   binding.operations.push(this.operationFromXML(operations[i]));
		}
	   
		return binding;
	}

	operationFromXML(element) {
		var name = element.getAttribute("name");
	   
		var operation = {
		   name,
		};
	   
		var input = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "input");
	   
		if (input && input.length) {
		   operation.input = {};
	   
		   if (input[0].hasAttribute("name")) {
			operation.input.name = input[0].getAttribute("name");
		   }
	   
		   if (input[0].hasAttribute("message")) {
	   
			var typeName = input[0].getAttribute("message");
	   
			// console.debug('GOT INPUT:', typeName);
			typeName = typeName.split(":");
	   
			if (typeName.length > 1) {
			   typeName[0] = input[0].lookupNamespaceURI(typeName[0]);
			} else {
			   typeName.unshift(null);
			}
	   
			operation.input.message = typeName;
		   }
		}
	   
		var output = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "output");
		if (output && output.length) {
		   operation.output = {};
	   
		   if (output[0].hasAttribute("name")) {
			operation.output.name = output[0].getAttribute("name");
		   }
	   
		   if (output[0].hasAttribute("message")) {
			var typeName = output[0].getAttribute("message");
	   
			typeName = typeName.split(":");
	   
			if (typeName.length > 1) {
			   typeName[0] = output[0].lookupNamespaceURI(typeName[0]);
			} else {
			   typeName.unshift(null);
			}
	   
			operation.output.message = typeName;
		   }
		}
	   
		var fault = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "fault");
		if (fault && fault.length) {
		   operation.fault = {};
	   
		   if (fault[0].hasAttribute("name")) {
			operation.fault.name = fault[0].getAttribute("name");
		   }
	   
		   if (fault[0].hasAttribute("message")) {
			var typeName = element.getAttribute("message");
	   
			typeName = typeName.split(":");
	   
			if (typeName.length > 1) {
			   typeName[0] = element.lookupNamespaceURI(typeName[0]);
			} else {
			   typeName.unshift(null);
			}
	   
			operation.fault.message = typeName;
		   }
		}
	   
		for (var i=0;i<this.operationHandlers.length;++i) {
		   this.operationHandlers[i].call(null, operation, element);
		}
	   
		return operation;
	}

	serviceFromXML(element) {
		var name = element.getAttribute("name");
	   
		var service = {
		   name: [this.state.targetNamespace[0], name],
		   ports: [],
		};
	   
		var i;
	   
		for (i=0;i<this.serviceHandlers.length;++i) {
		   this.serviceHandlers[i].call(null, portType, element);
		}
	   
		var ports = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "port");
	   
		for (i=0;i<ports.length;++i) {
		   service.ports.push(this.portFromXML(ports[i]));
		}
	   
		return service;
	}

	portFromXML(element) {
		var name = element.getAttribute("name"),
			binding = element.getAttribute("binding");
	   
		binding = binding.split(":");
	   
		if (binding.length > 1) {
		   binding[0] = element.lookupNamespaceURI(binding[0]);
		} else {
		   binding.unshift(null);
		}
	   
		var port = {
		   name: name,
		   binding: binding,
		};
	   
		for (var i=0;i<this.portHandlers.length;++i) {
		   this.portHandlers[i].call(null, port, element);
		}
	   
		return port;
	}

	elementFromXML(element) {

		const childs = element.childNodes;
		if (childs.length == 0) {
		   // primitive type
	   
		   // console.debug('Parsing primitive element');
	   
		   const data = {};
	   
		   let a;
	   
	   
		   a = element.getAttribute('name');
		   if (a) data.name = a;
	   
		   a = element.getAttribute('minOccurs');
		   data.min = a ? parseInt(a) : 0;
	   
		   a = element.getAttribute('maxOccurs');
		   if (a) data.max = a == 'unbounded' ? 100 : parseInt(a);
	   
		   a = element.getAttribute('type');
		   if (a) {
			const type = a.indexOf(':') != -1 ? a.split(':')[1] : a;

			data.type = type;
			// if (isPrimitive(type) || type == 'enum')
				this.elements.push(data);

		   }

		   return data;
		}
	   
		const complex = element.getElementsByTagNameNS("http://www.w3.org/2001/XMLSchema", "complexType");
		const name = element.getAttribute('name');
	   
		if (complex) {
	   
		   console.debug('Complex found:', complex.length);
	   
		   const e = this.complexTypeFromXML(complex[0]);
		   // if (name)
		   //   e.name = name;
	   
		   return e;
		}
	   
	}

	complexTypeFromXML(element) {
		// console.debug(element.localName);

		const content = element.getElementsByTagNameNS(SchemaNS, "complexContent");
		if (content && content.length == 1) {
			return this.complexContentFromXML(content[0]);
		}
	   
		const sequence = element.getElementsByTagNameNS(SchemaNS, "sequence");
		if (sequence && sequence.length == 1) {
		   const childs = Array.from(sequence[0].childNodes).filter(i => i.nodeType == 1);
		   return childs.map(i => this.elementFromXML(i));
		}
	
		return { };
	}

	complexContentFromXML(element) {
		const ext = element.getElementsByTagNameNS(SchemaNS, "extension");
		if (ext && ext.length == 1) {

			const e = ext[0];

			const [ns, type] = e.getAttribute('base').split(':');

			const r = { ns, type };

			const sequence = e.getElementsByTagNameNS(SchemaNS, "sequence");
			if (sequence && sequence.length == 1) {
		   		const childs = Array.from(sequence[0].childNodes).filter(i => i.nodeType == 1);
				r.childs = childs.map(i => this.elementFromXML(i));
			}

			// TODO
			/*
			<s:extension base="tns:CUA_Client">
            <s:sequence>
              <s:element minOccurs="0" maxOccurs="1" name="RelationToProposer" type="s:string" />
              <s:element minOccurs="0" maxOccurs="1" name="VehicleUse" type="s:string" />
            </s:sequence>
          </s:extension>
			*/

			return r;
		}
	}

	simpleTypeFromXML(element) {

		const e = {};

		const anotation = getElement(element, 'annotation');
		if (anotation) {
			const doc = getElement(anotation, "documentation");
			if (doc)	
				e.desc = doc.textContent;
		}

		const maxLength = getElement(element, "maxLength");
		if (maxLength) {
			const value = maxLength.getAttribute('value');
			if (value)
				e.maxLength = parseInt(value);
		}

		const restriction = getElement(element, 'restriction');
		if (restriction) {
			const base = restriction.getAttribute('base');
			if (base) 
				e.type = getType(base);
			
			
			const enums = getElements(restriction, 'enumeration');
			if (enums.length > 0) {

				e.enum = [];

				for (const i of enums) {

					const value = i.getAttribute('value');
					const d = { value };

					const anotation = getElement(i, 'annotation');
					if (anotation) {
						const doc = getElement(anotation, "documentation");
						if (doc)	
							d.desc = doc.textContent;
					}

					e.enum.push(d);

				}

			}
		}

		return e;
	}

	load(url, done) {
		var self = this;
	   
		this._request.call(null, url, function(err, res, data) {
		   if (err) {
			return done(err);
		   }
	   
		   this.loadFromString(data);
	   
		   return done();
		});
	}

	async loadFromFile(file) {
		const text = await fileX.readFile(file);

		return this.loadFromString(text);
	}

	async loadFromString(text) {

		console.debug('FROM STRING:', text);

		const xml = text
			.replace(/(\r\n)|\n/g, '')
			.replace(/>\s+</g, '><')
			;

		console.debug(xml);
		
		var doc = parser.parseFromString(xml, 'text/xml');
		 
		//console.debug(doc);
	
		var definition = doc.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "definitions");
		if (!definition || definition.length !== 1) {
			throw new Error("couldn't find root definitions object");
		}
		definition = definition[0];
	
		var targetNamespace = definition.getAttribute("targetNamespace");
	
		this.state.targetNamespace.push(targetNamespace);
	
		var i;
	
		var messages = definition.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "message");
	
		for (i=0;i<messages.length;++i) {
			this.messages.push(this.messageFromXML(messages[i]));
		}
	
		var portTypes = definition.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "portType");
	
		for (i=0;i<portTypes.length;++i) {
			this.portTypes.push(this.portTypeFromXML(portTypes[i]));
		}
	
		var bindings = definition.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "binding");
	
		for (i=0;i<bindings.length;++i) {
			this.bindings.push(this.bindingFromXML(bindings[i]));
		}
	
		var services = definition.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "service");
	
		for (i=0;i<services.length;++i) {
			this.services.push(this.serviceFromXML(services[i]));
		}
	
		this.state.targetNamespace.pop();
		this.doc = doc;
		
	}

	getMessage(name) {
		if (name.length === 1) {
		   name.unshift("");
		}
	   
		return this.message.filter(function(e) {
		   return e.name[0] === name[0] && e.name[1] === name[1];
		}).shift();
	}

	getPortType(name) {
		if (name.length === 1) {
		   name.unshift("");
		}
	   
		return this.portTypes.filter(function(e) {
		   return e.name[0] === name[0] && e.name[1] === name[1];
		}).shift();
	}

	getBinding(name) {
		if (name.length === 1) {
		   name.unshift("");
		}
	   
		return this.bindings.filter(function(e) {
		   return e.name[0] === name[0] && e.name[1] === name[1];
		}).shift();
	}

	getService(name) {
		if (name.length === 1) {
		   name.unshift("");
		}
	   
		return this.services.filter(function(e) {
		   return e.name[0] === name[0] && e.name[1] === name[1];
		}).shift();
	}
}

export async function loadFromFile(file) {

	const options = {
		portHandlers: [function(port, element) {
		  var soapAddresses = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/soap/", "address");
	   
		  if (soapAddresses.length === 1) {
		    port.soap = {
			 address: {
			   location: soapAddresses[0].getAttribute("location"),
			 },
		    };
		  }
		}],
		bindingHandlers: [function(binding, element) {
		  var soapBindings = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/soap/", "binding");
	   
		  if (soapBindings.length === 1) {
		    binding.soap = {
			 binding: {
			   style: soapBindings[0].getAttribute("style"),
			   transport: soapBindings[0].getAttribute("transport"),
			 },
		    };
		  }
		}],
		operationHandlers: [function(operation, element) {
		  var soapOperations = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/soap/", "operation");
	   
		  if (soapOperations.length === 1) {
		    operation.soapOperation = {
			 soapAction: soapOperations[0].getAttribute("soapAction"),
		    };
		  }
	   
		  var inputElement = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "input");
		  if (inputElement.length) {
		    inputElement = inputElement[0];
	   
		    var inputBodyElement = inputElement.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/soap/", "body");
		    if (inputBodyElement.length) {
			 inputBodyElement = inputBodyElement[0];
	   
			 operation.input.soap = {};
	   
			 if (inputBodyElement.hasAttribute("parts")) {
			   operation.input.soap.parts = inputBodyElement.getAttribute("parts");
			 }
	   
			 if (inputBodyElement.hasAttribute("use")) {
			   operation.input.soap.use = inputBodyElement.getAttribute("use");
			 }
	   
			 if (inputBodyElement.hasAttribute("namespace")) {
			   operation.input.soap.namespace = inputBodyElement.getAttribute("namespace");
			 }
	   
			 if (inputBodyElement.hasAttribute("encodingStyle")) {
			   operation.input.soap.encodingStyle = inputBodyElement.getAttribute("encodingStyle");
			 }
		    }
		  }
	   
		  //console.debug('####', operation);
	   
		  var outputElement = element.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/", "output");
		  if (outputElement.length) {
		    outputElement = outputElement[0];
	   
		    var outputBodyElement = outputElement.getElementsByTagNameNS("http://schemas.xmlsoap.org/wsdl/soap/", "body");
		    if (outputBodyElement.length) {
			 outputBodyElement = outputBodyElement[0];
	   
			 operation.output.soap = {};
	   
			 if (outputBodyElement.hasAttribute("parts")) {
			   operation.output.soap.parts = outputBodyElement.getAttribute("parts");
			 }
	   
			 if (outputBodyElement.hasAttribute("use")) {
			   operation.output.soap.use = outputBodyElement.getAttribute("use");
			 }
	   
			 if (outputBodyElement.hasAttribute("namespace")) {
			   operation.output.soap.namespace = outputBodyElement.getAttribute("namespace");
			 }
	   
			 if (outputBodyElement.hasAttribute("encodingStyle")) {
			   operation.output.soap.encodingStyle = outputBodyElement.getAttribute("encodingStyle");
			 }
		    }
		  }
		}],
	}

	const wsdl = await WSDL.load(options, file);
   
	var a = {}, schema = { root: {}, types: {}, simpleTypes: {} };
   
	//console.debug(JSON.stringify(wsdl.messages, null, 2));
	
   
	const portTypes = wsdl.portTypes.map(i => ({ name: i.name[1], operations: i.operations }));
	//console.log(portTypes);
   
	// for (const p of wsdl.portTypes) {
   
	//   for (const op of p) {
   
	//     a[op.name] 
	//   } 
	// }
   
	const e = getElements( wsdl.doc, 'schema');
	// console.debug('SCHEMA', typeof e, Object.keys(e));
   
	// console.debug(e.$$length);
   
	for (const node of e) {
   
	  console.debug('##########################################');
	  //console.debug(node);
   
	  // const elements = node.getElementsByTagNameNS("http://www.w3.org/2001/XMLSchema", "element");
	  // for (let i = 0; i < elements.length; ++i) {
	  //   const e = wsdl.elementFromXML(elements[i]);
	  //   console.log('ELEMENT:', e.length, e);
	  // }
   
	  // const complexTypes = node.getElementsByTagNameNS("http://www.w3.org/2001/XMLSchema", "complexType");
	  // for (let i = 0; i < complexTypes.length; ++i) {
	  //   const complexType = complexTypes[i];
	  //   const e = wsdl.complexTypeFromXML(complexType);
   
	  //   const name = complexType.getAttribute('name');
	  //   if (name) e.name = name;
   
	  //   console.log('COMPLEX:', e);
	  // }

   
	  const elements = Array.from(node.childNodes).filter(i => i.nodeType == 1);
	  for (const i of elements) {
	    const tag = i.localName;

	    console.debug('SCHEMA node:', tag)
   
	    switch (tag) {
   
		 case 'element': {
		   const e = wsdl.elementFromXML(i);
		   const name = i.getAttribute('name');
   
		   if (name)
			schema.root[name] = e;
		   //console.log('ELEMENT:', e.length, e);
		 }
		 break;
   
		 case 'complexType': {
		   const e = wsdl.complexTypeFromXML(i);

		//    if (typeof e == 'object') {

		// 	if (e.type) {



		// 	}

		//    }
   
		   const name = i.getAttribute('name');
		   if (name)
			schema.types[name] = e;
   
		   //console.log('COMPLEX:', e.length, e);
		 }
		 break;

		 case 'simpleType': {

			const e = wsdl.simpleTypeFromXML(i);
			const name = i.getAttribute('name');

			if (name) {
				e.name = name;
				schema.simpleTypes[name] = e;;
			}
		 }
		 break;
	    }
	  }

	}



	for (const [type, e] of Object.entries(schema.types)) {

		if (!Array.isArray(e)) {

			if (e.type) {

				const T = [...schema.types[e.type] ];

				if (e.childs)
					T.push(...e.childs);

				schema.types[type] = T;

			}

		}

	}
   
	console.log(schema.root);
   
	wsdl.services.forEach(function(service) {
   
	  console.debug('SERVICE:', JSON.stringify(service, null, 2));
   
	  service.ports.forEach(function(port) {
	    if (!port || !port.soap || !port.soap.address || !port.soap.address.location) {
		 return;
	    }
   
	    //console.debug('PORT:', port.name, port.operations);
   
	    const portType = portTypes.find(i => i.name == port.name);
	    if (portType) 
		 port.operations = portType.operations;
   
	    //console.debug('OPERATIONS:', port.operations);
   
   
	    var binding = wsdl.bindings.filter(function(binding) {
		 return binding.name[0] === port.binding[0] && binding.name[1] === port.binding[1];
	    }).shift();
   
	    if (!binding) {
		 return;
	    }
   
	    //console.debug('BINDING:', binding.name[1], 'port=', port.name);
   
	    binding.operations.forEach(function(operation) {
   
		 //console.debug(" => OP:", operation.name );
   
		 // if (!operation || !operation.input || !operation.input.soap || !operation.input.soap.namespace) {
		 //   return;
		 // }
   
		 // if (!operation || !operation.soapOperation || !operation.soapOperation.soapAction) {
		 //   return;
		 // }
   
   
		 const portOperation = port.operations.find(i => i.name == operation.name);
		 if (portOperation) {
   
		   //console.debug('PORT OP FOUND', portOperation);
   
		   if (portOperation.input) {
			const input = Object.assign({}, portOperation.input, operation.input);
			operation.input = input;
		   } 
   
		   if (portOperation.output) {
			const output = Object.assign({}, portOperation.output, operation.output);
			operation.output = output;
		   } 
		   
		 }
   
		 //console.debug('##', operation);
   
		 let inputNamespace = operation.input.soap.namespace;
		 let inputOperation = operation.input.name;
   
		 if (!inputOperation && operation.input.message) {
		   const [ns, name] = operation.input.message;
		   const message = wsdl.messages.find(i => i.name[1] == name);
   
		   if (message && message.parts.length > 0) {
			const part = message.parts[0];
			if (part.element) 
			  [ inputNamespace, inputOperation ] = part.element;
		   }
		 }
   
		 let outputNamespace = operation.output.soap.namespace;
		 let outputOperation = operation.output.name;
   
		 if (!outputOperation && operation.output.message) {
		   const [ns, name] = operation.output.message;
		   const message = wsdl.messages.find(i => i.name[1] == name);
   
		   if (message && message.parts.length > 0) {
			const part = message.parts[0];
			if (part.element) 
			  [ outputNamespace, outputOperation ] = part.element;
		   }
		 }
   
		 a[operation.name] = {
		   uri: port.soap.address.location,
		   action: operation.soapOperation.soapAction,
		   request: [inputNamespace, inputOperation],
		   response: [outputNamespace, outputOperation],
		 };
   
	    });
   
   
	  });
	});
   
   
	console.log(JSON.stringify(a, null, 2));
 
	for (const [name, params] of Object.entries(a) ) {
 
		console.log('Loading operation:', name);

		if (params.request) {
			const [url, name] = params.request;
			schema.request = { url, name };
		}

		if (params.response) {
			const [url, name] = params.response;
			schema.response = { url, name };
		}

	}

	schema.elements = wsdl.elements;
   
	return schema;
}

function isPrimitiveType(type) {
	return ['string', 'int', 'boolean', 'date', 'decimal'].includes(type);
}

function getElement(element, tag) {
	const elements = element.getElementsByTagNameNS(SchemaNS, tag);
	
	return elements.length > 0 ? elements[0] : null;
}

function getElements(element, tag) {
	return Array.from(element.getElementsByTagNameNS(SchemaNS, tag));
}

function getType(a) {
	return a.indexOf(':') != -1 ? a.split(':')[1] : a;
}

export class Request {

	#schema;
	#wsdl;
	#vars;
	#values;
	#enums;
	#code;

	#mandatory = [];

	get errors() { return this.#mandatory.slice(0, 5).join(','); }

	constructor({ wsdl, schema, mapping, code }) {

		const { vars, enums } = mapping;

		this.#schema = schema;
		this.#wsdl = wsdl;
		this.#vars = Object.flipEntries(vars);
		this.#values = vars;
		this.#enums = enums;
		this.#code = code;
	}

	build(data) {

		// const { claims } = data;
		// data = { claims };

		this.#mandatory = [];


		data = this.#convert(data);

		if (this.#code) {
			this.#code.evalCtx({ req: data }, false);

			console.debug('# DATA', data);
		}

		for (const [name, type] of Object.entries(this.#wsdl.root)) {

			console.debug('APPLY MAPPING', data);

			const payload = this.#applyMapping(type, data);
			const request = {};
			
			request[name] = payload;

			return request;
		}

	}

	parse(response) {

		const data = {};

		for (const [name, i] of Object.entries(response)) {

			this.#applyInverseMapping(i, data);
		}

		return data;
	}

	#applyMapping(elements, data) {

		const r = {};


		const ctx = data;

		// for (const i of elements) {
		// 	if (!(i.name in ctx))
		// 		ctx[i.name] = undefined;
		// }
	
		for (const i of elements) {

			// console.debug('#', i.name);

			let value;
	
			if (isPrimitiveType(i.type)) {
				value = data[i.name];
				
				if (value == undefined) {

					const v = this.#values[i.name];

					// console.debug('###$$$', v, i.name);

					if (v && v.isExpression()) 
						value = v.evalExpression(ctx);
				}
			}
			else {

				let type;

				type = this.#enums[i.name];
				if (type) {

					value = data[i.name];

					if (type && value) 
						value = type[value] || value;
				}
				else {
					const type = this.#wsdl.types[i._type || i.type];
					if (type) {


						if (Array.isArray(data)) {

							const values = [];

							for (const i of data) {
								const o = this.#applyMapping(type, i);
								if (Object.keys(o).length > 0)
									values.push(o);
							}

							if (values.length > 0)
								value = values;
						}
						else {

							let r = data[i.name];

							if (!r && i.type != 'array') {
								r = data;
							}

							if (r) {
								const o = this.#applyMapping(type, r);
								if (Object.keys(o).length > 0)
									value = o;
							}
						}
					}
				}
			}

			if (value == undefined) {

				if (i.min)
					this.#mandatory.push(i.name);

				continue;
			}

			// if (typeof value == 'string') {

			// 	// check is expression
			// 	if (value.startsWith('$$')) {
			// 		const exp = value.substr(2).trim();
			// 		value = exp.evalInContext(data);
			// 	}

			// }
		
			// r[i.name] = typeof value == 'string' ? value.replacex(data) : value;
			r[i.name] = value;
			
		}
	
		return r;
	}

	#convert(data) {
		const converted = {};

		for (let [name, value] of Object.entries(data)) {

			if (Array.isArray(value)) {
				value = value.map(i => this.#convert(i));
			}
			
			const v = this.#vars[name];
			if (v) {
				converted[v] = value;
			}
			
		}

		return converted;
	}

	#applyInverseMapping(r, data) {

		const fields = this.#schema.fields

		for (const [name, v] of Object.entries(r)) {

			const id = this.#values[name];

			if (typeof v == 'object') {

				if (Array.isArray(v)) {
					// todo
				}
				else if (id) {

					const field = fields[id];
					//const isarray = /.*[\d+]/.test(field.type);
					
					if (field.array) {

						const values = Object.values(v);

						// usually array are wraped
						if (values.length == 1) {

							const i0 = values[0];
							if (Array.isArray(i0)) {

								const vals = [];

								for (const j of i0) {

									const r = {};
									this.#applyInverseMapping(j, r);

									vals.push(r);
								}

								data[id] = vals;
							}

						}

					}

				}
				else {

					

					this.#applyInverseMapping(v, data);
				}

			}
			else {
				const id = this.#values[name];
				if (id) {
					// todo: apply translations
					data[id] = v;
				}
			}

			

		}

	}
}

export function buildSchemaData(schema, { fields, enums, types }, mapping={ vars: {}, enums: {}}) {

	let data;

	console.debug('ROOT ELEMENTS:', Object.keys(schema.root));

	// const request = schema.root.find(i => i.name == schema.request.name);
	const request = schema.root[schema.request.name];
	if (!request) {
		console.error('Request element not found');
		return;
	}

	const response = schema.root[schema.response.name];
	if (!response) {
		console.error('Response element not found');
		return;
	}


	data = { name: schema.request.name, 
		request: { url: schema.request.url, sections: buildSections(schema, request) },
		response: { url: schema.response.url, sections: buildSections(schema, response) }
	};

	

	const elements = [
		...schema.elements.filter(complexFilter.bind(schema.types)),
		// ...Object.values(schema.simpleTypes).map(i => Object({
		// 	name: i.name,
		// 	desc: i.desc || i.name.splitByCapital(),
		// 	type: i.name
		// })),
		// ...Object.values(schema.types).map(i => Object({
		// 	name: i.name,
		// 	desc: i.desc || i.name.splitByCapital(),
		// 	type: i.name
		// }))
	];

	const matches = {};
	const vars = {}, vals = {};
	// const fieldMap = new Map(fields.map(i => [i.name, i]));

	let found;

	// match mapping
	for (const i of elements) {

		const name = mapping.vars[i.name];
		
		if (name) {

			if (name.isExpression()) {
				i.value = name.expressionValue();
				i.exp = true;
				continue;
			}

			found = fields[name];
		}
		else {
			found = matchField.bind(Object.values(fields))(i);
		}

		if (found) {

			if (!isPrimitiveType(found.type) && isPrimitiveType(i.type)) {
				// not compatible
				continue;
			} 

			i.value = found.display || found.name.splitByCapital().capitalizeFirstLetter();
			i.mapped = found.name;

			vars[i.name] = found.name;
			// vars[found.name] = i.name;

			if (!isPrimitiveType(i.type)) {

				if (i.type == 'enum')
					matches[i._type] = enums[found.type];
			}
		}
	}

	elements.sort((a,b) => a.name.localeCompare(b.name));

	data.elements = elements;

	const simpleTypes = Object.values(schema.simpleTypes);
	for (const i of simpleTypes) {

		const m = matches[i.name];

		if (m) {

			const values = { };

			for (const item of i.enum) {

				if (!item.desc) continue;

				const v = m.find(j => j.name.localeCompareNocase(item.desc) == 0);

				// found constant
				if (v) {
					item.constant = v.display || v.name
					item.val = v.value;

					values[i.value] = v.value;
				}
			}

			vals[i.name] = values;
		}

	}

	data.simpleTypes = simpleTypes;
	data.mapping = { vars, enums: vals };

	return data;
}

function buildSections(schema, root) {

	const sections = [];

	for (const section of root) {

		const s = { name: section.name }

		const items = schema.types[section.type];
		if (items && Array.isArray(items)) {
			// s.items = items.filter(i => ['string', 'int', 'boolean', 'date'].includes(i.type));
			s.items = [ ...items ];
			for (const i of s.items) {

				if (isPrimitiveType(i.type)) {


					continue;
				}

				const simpleType = schema.simpleTypes[i.type];
				if (simpleType) {

					i.name = simpleType.name;
					i.enum = simpleType.enum;
					i._type = i.type;
					i.type = 'enum';

					continue;
				}

				i._type = i.type;
				i.type = 'complex';
			}

			

		} 

		sections.push(s);


	}

	return sections;
}

function matchField(i) {

	const name = i.name;
	const desc = (i.desc || i.name).replace(/[\s_-]/g, '');

	return this.find(j => 
		// j.name.localeCompareNocase(name) == 0 ||
		name.startsWithNocase(j.name) ||
		(j.alias ? j.alias.findIndex(a => name.startsWithNocase(a)) != -1 : false) ||
		(j.display ? j.display.replace(/[\s_-]/g, '').localeCompareNocase(desc) == 0 : false)
	);
}

function complexFilter(element) {

	const type = element._type || element.type;

	if (isPrimitiveType(type) || element.type == 'enum')
		return true;

	const T = this[type];
	if (T && T.length == 1) {
		const ArrayType = T[0];

		// console.debug('FOUND repat', ArrayType);

		if (ArrayType.max > 1) {

			element.type = 'array';
			element._type = type;

			return true;
		}
	}

	return false;
}