
const kDay = 24 * 60 * 60;
const kLocalOffset = new Date().getTimezoneOffset() * 60;

Date.prototype.toLocalDateString = function(locale, options) {
	switch (locale) {
		case 'bg': {

			let s = '';


			if (options.weekday) {
				const kWeekday = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
				const i = this.getDay();

				s += options.weekday == 'short' ? (kWeekday[i].slice(3) + '.') : kWeekday[i]; 
				s += ' ';
			}

			if (options.day) {
				s += this.getDate().toString();
				s += ' ';
			}

			if (options.month) {
				if (options.month == 'numeric') {

				} else {

					const kMonth = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември' ];

					const i = this.getMonth();
					const month = kMonth[i];

					s += options.month == 'short' && month.length > 4 ? (month.slice(0, 3) + '.') : month;
					s += ' ';
				}
			}

			return s.trimEnd();

		}
		break;

		default:
		return this.toLocaleDateString(`${locale}-${locale.toUpperCase()}`, options);
	}
}

Date.prototype.toLocalDateStringShort = function(locale, opt={ weekday: 'long', month: 'short', day: 'numeric' }) {
	return this.toLocalDateString(locale, opt);
}

Date.prototype.seconds = function() {
	return Date.toSeconds(this.getTime());
}

Date.prototype.age = function(d=new Date) {
	return d.getFullYear() - this.getFullYear();
}

Date.seconds = function(align=1) { 
	const now = new Date().seconds();
	return Math.floor(now / align) * align;
}

Date.toSeconds = function(ts=new Date) {
	if (typeof ts == 'string') 
		ts = new Date(ts);

	if (ts instanceof Date)
		ts = ts.getTime();

	return Math.floor(ts / 1000);
}

Date.fromSeconds = function(ts) {
	return new Date(ts * 1000);
}

Date.daysToSeconds = function(days) { return days * 24 * 60 * 60; } 
Date.secondsToString = function(sec) { return new Date(sec*1000).toISOString(); }

Date.prototype.offsetFrom = function(ts=Date.now(), suffix='') {

	const s = Math.floor((ts - this.getTime()) / 1000);

	let i, t;

	if (s < 3600) {

		// offset in minutes

		i = Math.floor( (s + 40) / 60);
		t = i == 0 ? 'now' : `${i} min`;


	} 

	else if (s < 86400) {
		// offset in hours

		i = Math.floor(s / 3600);
		t =  `${i} h`;
	}

	else if (s < 604800) {
		// offset in days week scope
		i = Math.floor(s / 86400);
		t =  `${i} d`;
	}
	else {
		suffix = null;
		t = this.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	if (suffix)
		t += ' ' + suffix;

	return t;
}

Date.timeElapsed = function(ts, from=Date.now()) {
	const d = new Date(ts);
	return d.offsetFrom(from);
}

Date.timeElapsedLong = function(ts, from=Date.now()) {
	const d = new Date(ts);
	return d.offsetFrom(from, 'ago');
}

Date.secondsElapsed = function(ts=Date.seconds(), from=Date.now()) { 
	return Date.timeElapsed(ts * 1000, from); 
} 

Date.prototype.formatTimeDate = function() {
	return `${('0' + this.getHours()).slice(-2)}:${("0" + this.getMinutes()).slice(-2)} ${this.toLocaleString('default', { month: 'short' })} ${('0' + this.getDate()).slice(-2)}`;
}

Date.formatTimeDate = function(ts=Date.seconds()) {
	const d = getDate(ts);
	return d.formatTimeDate();
}

Date.formatDate = function(ts=Date.seconds()) {
	const d = getDate(ts);
	return d.toDateString();
}

Date.formatDateShort = function(ts=Date.seconds()) {
	const d = getDate(ts);
	return d.toLocalDateStringShort('en');
}

Date.formatDateShorter = function(ts=Date.seconds()) {
	const d = getDate(ts);
	return d.toLocalDateStringShort('en', { month: 'short', day: 'numeric' });
}

Date.todayUTC = function(ts=new Date) {

	if (typeof ts == 'number')
		ts = new Date(ts * 1000);

	const t = ts.setUTCHours(0, 0, 0, 0);

	return Date.toSeconds(t);
}

Date.today = function(ts=new Date) {

	if (typeof ts == 'number')
		ts = new Date(ts * 1000);

	const t = ts.setHours(0, 0, 0, 0);

	return Date.toSeconds(t);
}

Date.dayStartSeconds = function(now=Date.seconds(), dayOffset=0) {
	const offset = new Date().getTimezoneOffset() * 60;
	const ts = Math.floor(now / kDay) * kDay + dayOffset*kDay + offset;
	return ts;
}

Date.tomorrowSeconds = function() {
	return Date.dayStartSeconds(Date.seconds(), 1);
}

Date.days = function(d, now=Date.now()) {
	const ts = now + d * 24 * 3600 * 1000;
	return new Date(ts);
}

function getDate(ts) {
	return ts instanceof Date ? ts 
	: (typeof ts == 'string' ? new Date(ts) : new Date(ts * 1000));
}
