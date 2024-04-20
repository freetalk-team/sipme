
function getCode(ussd) {
	const r = ussd.match(/^\*([0-9]+)(.*?)#$/);
	if (!r) throw new Error('Invalid ussd code: ' + ussd);

	return r.length > 2 ? [r[1], r[2].split('*').slice(1)] : [r[1], ''];
}

module.exports = {
	getCode
}