

function getMsisdn(cfg, msisdn) {
	const len = cfg.length;

	for (const i of cfg.matches) {

		const m = msisdn.match(i);

		//console.debug('##', m);

		if (m) return m[1];
	}

	return undefined;
}

function normalizeMsisdn(cfg, msisdn) {
	//const len = cfg.length;

	//console.debug('Normalizing MSISDN:', msisdn, cfg);

	for (const p of Object.values(cfg.prefix)) {
		//console.debug('#### ', p, msisdn.length, len + p.length, msisdn.startsWith(p), msisdn);

		if (/*msisdn.length == len + p.length &&*/ msisdn.startsWith(p))
			return msisdn.slice(p.length); 
	}

	return msisdn;
}

module.exports = {
	normalizeMsisdn
	, getMsisdn
}
