
class Runner {

	constructor(name) {
		this.name_ = name;
	}

	get type() { return 'dummy'; }
	get name() { return this.name_; }

	addWorker() { console.warn('Worker assigned to dummy runner'); }
	start() {}
	stop() {}
}

const kStartHour = 7;
const kDuration = 14;	

class DailyRunner extends Runner {


	constructor(name) {
		super(name);

		this.running = false;
		this.workers = [];
	}

	get type() { return 'daily'; }
	get startTime() { 
		const t = new Date;
		t.setHours(kStartHour, 0, 0, 0);
		return t;
	}

	get endTime() {
		const t = this.startTime;
		t.setHours(t.getHours() + kDuration);
		return t;
	}

	addWorker(worker) {
		this.workers.push(worker);
	}

	start() {
		if (this.running) return;

		this.running = true;

		const now = new Date;
		const s = this.startTime;
		const e = this.endTime;

		if (now > s && now < e) {
			this.#doStart();
		}
		else {

			if (s < now) {
				s.setDate(s.getDate() + 1);
			}

			const ms = s.getTime() - now.getTime();
			console.log('Starting in:', Math.floor(ms / 3600000), 'hours');

			this.timeout_ = setTimeout(() => this.#doStart(), ms);
		}
	}

	stop() {
		if (!this.running) return;

		this.running = false;

		if (this.timeout_) {
			clearTimeout(this.timeout_);
			delete this.timeout_;
		}

		this.#doStop();
	}

	onStart() {
		for (const i of this.workers) {
			// i.start();
			i.start(true);
		}
	}

	onStop() {
		for (const i of this.workers) {
			i.stop();
		}
	}

	#doStart() {

		const now = new Date;
		const e = this.endTime;

		const ts = e.getTime() - now.getTime();

		console.log('Starting Daily runner for ~', Math.floor(ts / 3600000), 'hours', now.toTimeString());

		this.timeout_ = setTimeout(() => this.#doStop(), ts);

		this.onStart();
	}

	#doStop() {
		this.onStop();

		if (this.running) {
			const now = new Date;
			const s = this.startTime;
			s.setDate(s.getDate() + 1);

			const ms = s.getTime() - now.getTime();

			this.timeout_ = setTimeout(() => this.#doStart(), ms);
		}
	}
}

class DailyExecutor extends DailyRunner {

	constructor(name, opt={}) {
		super(name);

		this.opt = opt;
	}

	get startTime() {
		const s = this.opt.start;
		if (!s) return super.startTime;

		const h = s.getHours();
		const m = s.getMinutes();
		const sec = Math.floor(Math.random() * 60);

		const t = new Date;
		t.setHours(h, m, sec, 0);

		return t;
	}

	get endTime() {
		const e = this.opt.end;
		if (!e) return super.endTime;

		const h = e.getHours();
		const m = e.getMinutes();

		const t = new Date;
		t.setHours(h, m, 0, 0);

		return t;
	}

	get interval() {
		const i = this.opt.interval || 7200;
		return i;
	}

	onStart() {
		if (this.int_) {
			console.log('Executor already running:', this.name_);
			return;
		}

		this.execute();

		const timeout = this.interval * 1000;

		this.int_ = setInterval(() => this.execute(), timeout);
	}

	onStop() {
		if (!this.int_) return;

		clearInterval(this.int_);
		delete this.int_;
	}

	// override
	execute() {
		// console.warn('Not implemented runner execute');
		for (const i of this.workers)
			i.execute();
	}

	static getTimeFromHours(hours, minutes=0) {
		const t = new Date;
		t.setHours(hours, minutes, 0, 0);
		return t;
	}
}

class PeriodicExecutor extends Runner {

	constructor(name, interval=3600) {
		super(name);

		this.interval = interval * 1000;
	}

	get type() { return 'periodic'; }
	get running() { return !!this.timeout_; }

	start() {
		if (this.timeout_) return;

		this.timeout_ = setInterval(() => this.execute(), this.interval);

		this.onStart();
	}

	stop() {
		if (this.timeout_) 
			clearInterval(this.timeout_);
	}

	reset() {
		if (this.timeout_) 
			clearInterval(this.timeout_);

		this.timeout_ = setInterval(() => this.execute(), this.interval);
	}

	// override
	onStart() {}
	execute() {}
}

const Factory = {
	create(type, name, ...args) {

		switch (type) {
			case 'daily':
			return new DailyExecutor(name, ...args);
		}

		return new Runner(...args);
	}
};

class TaskRunner {

	#queue = [];
	#interval;
	#opt;
	#suspended = false;

	constructor(opt={ interval: 30 }) {
		this.#opt = opt;
	}

	setTimeout(seconds, callback, repeat=false, offset=seconds) {

		const cb =  {
			callback,

			cancel() {
				this.queue.delete(this);
			},

			execute() {
				this.forced = true;
				this.callback(this);
			}
		};

		if (repeat)
			cb.interval = seconds;

		this.#push(offset, cb);

		if (!this.#suspended)
			this.#start();

		return cb;
	}	

	suspend() {
		this.#suspended = true;
		this.#stop();
	}

	resume() {
		this.#suspended = false;
		this.#start();
	}

	#push(seconds, cb) {
		let i = Math.round(seconds / this.#opt.interval);

		if (i == 0) i = 1;

		let callbacks = this.#queue[i];
		if (callbacks) callbacks.add(cb);
		else this.#queue[i] = new Set([ cb ]);

		cb.queue = this.#queue[i];
	}

	#start() {
		if (this.#interval) return;

		this.#interval = setInterval(() => {

			const tasks = this.#queue[0];

			if (tasks) {
				for (const i of tasks) {

					if (i.forced)
						delete i.forced;
					else 
						i.callback(i);
				
					if (i.interval)
						this.#push(i.interval, i);
				}
			}

			this.#queue.shift();

			if (this.#queue.length == 0) {
				clearInterval(this.#interval);
				this.#interval = undefined;
			}

		}, this.#opt.interval * 1000);
	}

	#stop() {
		// console.log('STOPING runner');
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = undefined;
		}
	}
}


export {
	DailyRunner
	, DailyExecutor
	, PeriodicExecutor
	, Factory as Runner
	, TaskRunner
}
