
function init(size=1024*1024*1024) {
	return new Promise((resolve, reject) => {
		navigator.webkitPersistentStorage.requestQuota(size, grantedSize => webkitRequestFileSystem(window.PERSISTENT, grantedSize, resolve, reject));
	});

	/*

	if (navigator.storage && navigator.storage.estimate) {
		const quota = await navigator.storage.estimate();
		// quota.usage -> Number of bytes used.
		// quota.quota -> Maximum number of bytes available.
		const percentageUsed = (quota.usage / quota.quota) * 100;
		console.log(`You've used ${percentageUsed}% of the available storage.`);
		const remaining = quota.quota - quota.usage;
		console.log(`You can write up to ${remaining} more bytes.`);
	}

	// Check if site's storage has been marked as persistent
	if (navigator.storage && navigator.storage.persist) {
		const isPersisted = await navigator.storage.persisted();
		console.log(`Persisted storage granted: ${isPersisted}`);
	}

	// Request persistent storage for site
	if (navigator.storage && navigator.storage.persist) {
		const isPersisted = await navigator.storage.persist();
		console.log(`Persisted storage granted: ${isPersisted}`);
	}

	*/
}

function directory(parent, name, opt={}) {
	return new Promise((resolve, reject) => parent.getDirectory(name, opt, resolve, reject));
}

function ls(dir) {

	return new Promise((resolve, reject) => {

		const reader = dir.createReader();
		reader.readEntries(function (results) {
			resolve(results);
		});
	});
	
}

function writer(dir, name, exclusive=false) {
	return new Promise((resolve, reject) => {
		dir.getFile(name, {create: true, exclusive }, function(entry) {

			entry.createWriter(function(writer) {
				resolve(writer);
			});
		}, reject);
	});
}

function reader(dir, name) {
	return new Promise((resolve, reject) => {
		dir.getFile(name, {}, function(entry) {

			entry.file(function(file) {

				const reader = new FileReader;
				reader.file = file;

				resolve(reader);

			}, reject);

		}, reject);
	});
}

function write(writer, data) {
	return new Promise((resolve, reject) => {

		writer.onwriteend = resolve;
		writer.onerror = reject;

		// const blob = new Blob(data);
		const blob = new Blob(Array.isArray(data) ? data : [data]);
		writer.write(blob);
	});
}

function truncate(writer, length) {
	return new Promise((resolve, reject) => {
		writer.onwriteend = resolve;
		writer.onerror = reject;
		writer.truncate(length);
	});
}

function read(reader, offset=0, length) {
	return new Promise((resolve, reject) => {

		reader.onloadend = function(e) {
			resolve(this.result);
		}
		reader.onerror = reject;

		let blob = reader.file;
		if (length) {
			blob = blob.slice(offset, offset + length);
		}

		reader.readAsArrayBuffer(blob);

	});
}

async function readFile(dir, name) {
	const r = await reader(dir, name);
	return read(r);
}

function metadata(fileEntry) {
	return new Promise((resolve, reject) => {
		fileEntry.getMetadata(resolve, reject);
	});
}

function getFile(dir, name) {
	return new Promise((resolve, reject) => {
		dir.getFile(name, {}, function(entry) {

			entry.file((file) => resolve(file), reject);

		}, reject);
	});
}

function rm(entry) {
	return new Promise((resolve, reject) => entry.remove(resolve, reject));
}

async function rmdir(parent, path) {
	const dir = await directory(parent, path);
	const files = await ls(dir);

	for (const i of files)
		await rm(i);

	return rm(dir);
}

async function save(root, path) {

	const handle = await showSaveFilePicker();
	const w = await handle.createWritable();

	const r = await reader(root, path);
	const blob = await read(r);

	await w.write(blob);
	await w.close();
}

function dump(dir) {
	return new Promise((resolve, reject) => {
		const reader = dir.createReader();
		reader.readEntries(function (results) {
			resolve(results.map(i => i.name));
		});
	});
} 

window.fs = {
	init,
	ls,
	directory,
	rmdir,
	save,

	writer,
	write,
	truncate,

	read,
	reader,
	readFile,
	getFile,

	metadata,
	dump,
};