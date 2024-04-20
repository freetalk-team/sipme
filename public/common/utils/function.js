
Object.assign(window, {
	AsyncFunction : Object.getPrototypeOf(async function() {}).constructor
	, GeneratorFunction: Object.getPrototypeOf(function*() {}).constructor
	, AsyncGeneratorFunction: Object.getPrototypeOf(async function*() {}).constructor
});