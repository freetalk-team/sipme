
function setupUser(user) {
	user.username = user.email.split('@')[0];
	user.complete = user.state != 'initial';
	user.su = user.id == 'su';
	user.refreshToken = user.refreshToken || user.token;

	const data = typeof user.data == 'string' ? JSON.parse(user.data) : user.data;

	Object.assign(user, data);
	delete user.data;
}

function sessionChecker(req, res, next) {
	next();
}

function sessionCheckerAdmin(req, res, next) {

	next();
	return;
	
	if (!req.session.user || !req.cookies.user_sid || !req.session.user.su) {
		console.error('Session check failed', req.path);
		res.redirect('/');
	} else {
		next();
	} 
}


module.exports = {
	setupUser,
	sessionChecker,
	sessionCheckerAdmin
}