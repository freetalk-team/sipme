
const kRedirectUrl = '/';

function setupUser(user) {
	user.username = user.email.split('@')[0];
	user.complete = user.state == 'complete';
	user.su = user.id == 'su';
	user.refreshToken = user.refreshToken || user.token;

	const data = typeof user.data == 'string' ? JSON.parse(user.data) : user.data;

	Object.assign(user, data);
	delete user.data;
}

function generatePassword(email) {
	return (email.split('@')[0] + '123').md5();
}

function sessionChecker(req, res, next) {

	if (req.session && req.user)
		next();
	else {
		console.error('Session check failed', req.path);
		res.redirect(kRedirectUrl);
	}

}

function sessionCheckerAdmin(req, res, next) {

	if (req.session && req.user && req.user.su)
		next();
	else {
		console.error('Session Admin check failed', req.path);
		res.redirect(kRedirectUrl);
	}
}

module.exports = {
	setupUser,
	generatePassword,
	sessionChecker,
	sessionCheckerAdmin
}
