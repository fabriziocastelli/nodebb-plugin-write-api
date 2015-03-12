'use strict';
/* globals module, require */

var passport = require.main.require('passport'),
	user = require.main.require('./src/user'),
	errorHandler = require('./lib/errorHandler'),

	Middleware = {};

Middleware.requireUser = function(req, res, next) {
	passport.authenticate('bearer', { session: false }, function(err, user) {
		if (err) { return next(err); }
		if (!user) { return errorHandler.respond(401, res); }

		// If the token received was a master token, a _uid must also be present for all calls
		if (user.hasOwnProperty('uid')) {
			req.login(user, function(err) {
				if (err) { return errorHandler.respond(500, res); }
				next();
			});
		} else if (user.hasOwnProperty('master') && user.master === true) {
			if (req.body.hasOwnProperty('_uid') || req.query.hasOwnProperty('_uid')) {
				user.uid = req.body._uid || req.query._uid;
				delete user.master;

				req.login(user, function(err) {
					if (err) { return errorHandler.respond(500, res); }
					next();
				});
			} else {
				res.status(400).json(errorHandler.generate(
					400, 'params-missing',
					'Required parameters were missing from this API call, please see the "params" property',
					['_uid']
				));
			}
		} else {
			return errorHandler.respond(500, res);
		}
	})(req, res, next);
};

Middleware.requireAdmin = function(req, res, next) {
	if (!req.user) {
		return errorHandler.respond(401, res);
	}

	user.isAdministrator(req.user.uid, function(err, isAdmin) {
		if (err || !isAdmin) {
			return errorHandler.respond(401, res);
		}

		next();
	});
};

Middleware.exposeUid = function(req, res, next) {
	if (req.params.hasOwnProperty('userslug')) {
		user.getUidByUserslug(req.params.userslug, function(err, uid) {
			if (err) {
				return errorHandler.respond(500, res);
			} else if (uid === null) {
				// If exposed uid is null, then that *specifically* means that the passed in userslug is garbage
				return errorHandler.respond(404, res);
			}

			res.locals.uid = uid;
			next();
		})
	} else {
		next();
	}
};

module.exports = Middleware;