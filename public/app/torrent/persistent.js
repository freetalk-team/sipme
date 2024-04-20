
import { FileStorage } from './file.js';

class ChunkMap {

	#blocks = [];

	get blocks() { return this.#blocks; }

	put(index) {

		for (let i = 0; i < this.#blocks.length; ++i) {

			const block = this.#blocks[i];
			const b = block[0], e = block[1];

			if (index + 1 == b) {
				// extending
				--block[0];

				if (i > 0)
					this.#merge(i - 1, i);

				return;
			}

			if (index == e + 1) {
				++block[1];

				if (i < this.#blocks.length - 1)
					this.#merge(i, i + 1);

				return;
			}

			if (index < b) {
				this.#blocks.splice(i, 0, [index, index]);
				return;
			}

		}

		this.#blocks.push([index, index]);
	}

	store() {

		const buffer = new Uint32Array(this.#blocks.length * 2);

		for (let i = 0; i < this.#blocks.length; ++i) {

			const block = this.#blocks[i];

			buffer.set(block, i * 2);
		}

		// console.debug('Storing blocks:', this.#blocks);

		return buffer;
	}

	load(buffer) {

		const view = new Uint32Array(buffer);
		console.log('Loading blocks from buffer:', buffer);

		for (let i = 0; i < view.length; i += 2)
			this.#blocks.push([view[i], view[i+1]]);

		console.log('BLOCKS loaded:', this.#blocks);
	}

	count() {
		let n = 0;
		for (const [s,e] of this.#blocks)
			n += e - s + 1;

		return n;
	}

	done(last) {

		return this.#blocks.length == 1 && this.#blocks[0][1] == last;
	}

	dump() {
		console.log('Number of blocks:', this.#blocks.length);
		for (const i of this.#blocks)
			console.log('\t', i);
	}

	#merge(a, b) {

		const b1 = this.#blocks[a];
		const b2 = this.#blocks[b];

		if (b1[1] + 1 == b2[0]) {

			b1[1] = b2[1];
			this.#blocks.splice(b, 1);

			console.debug('BLOCKS merged:', this.#blocks.length, this.#blocks);
		}

	}
}

class ChunkMapWriter extends ChunkMap {

	#writer;
	#count = 0;
	#writing = false;
	#pending = false;

	constructor(w) {
		super();
		this.#writer = w; 
	}

	async put(index) {
		super.put(index);
		
		if (++this.#count % 10 == 0)
			return this.store();
	}

	async store() {

		if (this.#writing) {
			this.#pending = true;
			return;
		}

		this.#writing = true;

		do {

			this.#pending = false;

			const buffer = super.store();
			await fs.truncate(this.#writer, buffer.byteLength);

			this.#writer.seek(0);
			await fs.write(this.#writer, buffer);

		} while (this.#pending);

		this.#writing = false;
	}

	async load(dir, last) {
		try {
			const meta = await fs.readFile(dir, '.meta');
			super.load(meta);
		}
		catch (e) {
			console.log('Meta information not found');
		}

		if (!this.done(last)) {

			this.#writer = await fs.writer(dir, '.meta');
			return false;
		}

		return true;

	}

	
}

class PersistentChunkStore extends ChunkMapWriter {

	#chunkSize = 1024;
	#storage;
	#name;
	#count = 0;
	#total = 0;

	get chunkLength() { return this.#chunkSize; }
	get lastPiece() { return this.#storage.lastPieceIndex; }

	constructor (chunklen, opt) {
		super();

		this.#chunkSize = chunklen;

		console.log('Creating peristent storage chunk store', chunklen, opt);

		// this.#files = opt.files.map(i => new FileWrapper(null, i, this.#chunkSize));
		this.#storage = new FileStorage(opt.files, this.#chunkSize);
		// this.#name = opt.name;
		this.#name = opt.torrent.name;
	}

	async load() {

		const last = this.lastPiece;

		const root = await app.getRootDirectory('Torrents');

		const dir = await fs.directory(root, this.#name, { create: true });
		const done = await super.load(dir, last);

		if (!done) {
			this.#total = last + 1;
			this.#count = this.count();
		}

		this.#storage.dir = dir;
	}

	async verifyPieces(torrent, cb) {

		try {

			await this.load();
		}
		catch (e) {
			console.error('Failed to load torrent', e);
			cb(e);
		}

		for (const [b, e] of this.blocks) {
			for (let i = b; i <= e; ++i)
				torrent._markVerified(i);
		}

		cb();
	}

	async get(index, opt, cb) {

		if (typeof opt == 'function') {
			cb = opt;
			opt = null;
		}
		
		try {
			
			const data = await this.#storage.get(index, opt);

			cb(null, data);
		}
		catch (e) {
			cb(e || 'Failed to read from file');
		}
	}

	async put(index, data, cb) {

		// console.debug('PUT', index, data.length);

		try {

			// console.log('Persistent storage put', index);
			await this.#storage.put(index, data);

			super.put(index);
			this.#count++;

			if (this.#count == this.#total)
				super.store();

			// console.log('Persistent storage put DONE');

			cb();
		}
		catch (e) {
			cb(e || 'Failed to write file');
		}
	}

	destory(cb) {

	}

	close() {}
}

export {
	PersistentChunkStore
}