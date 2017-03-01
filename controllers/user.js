const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const Player = require('../models/Player');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    user.save((err) => {
      if (err) { return next(err); }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        res.redirect('/');
      });
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
	Player.find({})
	//.where({account: {$ne: null}})
		.or([{account: { $exists: false }}, {account: {$eq: null}}])
		.exec((err, players) => {
			Player.findOne({account: req.user.id}, (err, player) =>
				{
					res.render('account/profile', {
						title: 'Account Management',
						players: players,
						player: player
					});
				});
		});
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/linkplayer
 * Link player to account
 */
exports.postLinkPlayer = (req, res, next) => {
	/* first check to see if that player is linked */
	User.findOne({ player: req.body.linkplayer }, (err, user) => {
		if (err) { return next(err); }
		if (user) {
			req.flash('errors', { msg: 'That player is already linked to an account.' });
			return res.redirect('/account');
		}
		/* Check if the user currently has a player linked */
		User.findById(req.user.id, (err, user) => {
			if (err) { return next(err); }
			if(user.player != null) {
				req.flash('errors', { msg: 'There is already a player linked to this account.' });
				return res.redirect('/account');
			}
			/* link 'em */
			Player.findById(req.body.linkplayer, (err, player) => {
				if (err) { return next(err); }
				player.account = req.user.id;
				player.save((err) => {
					if (err) { return next(err); }
				});
			});
			User.findById(req.user.id, (err, user) => {
				if (err) { return next(err); }
				user.player = req.body.linkplayer;
				user.save((err) => {
					if(err) {return next(err); }
				});
			});
			req.flash('success', { msg: 'Accounts have been linked.' });
			res.redirect('/account');
		});
	});
};

/**
 * POST /account/unlinkplayer
 * Unlink a player from an account
 */
exports.postUnlinkPlayer = (req, res, next) => {
	Player.findOne({account: req.user.id}, (err, player) => {
		if (err) { return next(err); }
		if(player == null) {
			req.flash('errors', { msg: 'Could not find the player linked to your account. That is our bad.' });
			return res.redirect('/account');
		}
		if(player.id != req.user.player){
			req.flash('errors', { msg: 'Your account does not seem to point to that player. That is not right. That is our mistake' });
			return res.redirect('/account');
		}
		player.account = undefined;
		req.user.player = undefined;
		player.save((err) => {
			if (err) { return next(err); }
		});
		req.user.save((err) => {
			if (err) { return next(err); }
		});
		req.flash('success', { msg: 'The player has been unlinked from your account.' });
		res.redirect('/account');
	});
};

/**
 * POST /account/renameplayer
 * Rename the player linked to your account
 */
exports.postRenamePlayer = (req, res, next) => {
	/* first check to see if that player is linked */
	Player.findOne({name: req.body.currentname}, (err, player) => {
		if(err) { next(err); }
		if(player == null) {
			req.flash('errors', { msg: 'Could not find player. Opps' });
			return res.redirect('/account');
		}
		if(player.account != req.user.id) {
			req.flash('errors', { msg: 'That player is not linked to your account so you cannot change the name.' });
			return res.redirect('/account');
		}
		player.name = req.body.renameplayer;
		player.save((err) => {
			if (err) { return next(err); }
		});
		req.flash('success', { msg: 'Your player has been renamed.' });
		res.redirect('/account');
	});
};

/**
 * POST /account/addplayer
 * Add player to account
 */
exports.postAddPlayer = (req, res, next) => {
	/* first check to see if that player is linked */
  req.assert('addplayer', 'Name must be at least 4 characters long').len(4);
  const errors = req.validationErrors();
  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  const player = new Player({
    name: req.body.addplayer
  });

	Player.findOne({ name: req.body.addplayer }, (err, existingPlayer) => {
		if (err) { return next(err); }
		if (existingPlayer) {
			req.flash('errors', { msg: 'Player with that name address already exists.' });
			return res.redirect('/player');
		}
		User.findById(req.user.id, (err, user) => {
			if (err) { return next(err); }
			if(user.player != null) {
				req.flash('errors', { msg: 'There is already a player linked to this account.' });
				return res.redirect('/account');
			}
			player.account = req.user.id;
			player.save((err) => {
				if (err) { return next(err); }
			});
			User.findById(req.user.id, (err, user) => {
				if (err) { return next(err); }
				user.player = player.id;
				user.save((err) => {
					if(err) {return next(err); }
				});
			});
			req.flash('success', { msg: 'Accounts have been linked.' });
			return res.redirect('/account');
		});
	});
};


/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} account has been unlinked.` });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  async.waterfall([
    function resetPassword(done) {
      User
        .findOne({ passwordResetToken: req.params.token })
        .where('passwordResetExpires').gt(Date.now())
        .exec((err, user) => {
          if (err) { return next(err); }
          if (!user) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save((err) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
    },
    function sendResetPasswordEmail(user, done) {
      const transporter = nodemailer.createTransport({
        service: 'mailgun',
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: 'noreply',
        subject: 'Your FoosKeeper password has been changed',
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  async.waterfall([
    function createRandomToken(done) {
      crypto.randomBytes(16, (err, buf) => {
        const token = buf.toString('hex');
        done(err, token);
      });
    },
    function setRandomToken(token, done) {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (err) { return done(err); }
        if (!user) {
          req.flash('errors', { msg: 'Account with that email address does not exist.' });
          return res.redirect('/forgot');
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user.save((err) => {
          done(err, token, user);
        });
      });
    },
    function sendForgotPasswordEmail(token, user, done) {
      const transporter = nodemailer.createTransport({
        service: 'mailgun',
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: 'noreply',
        subject: 'Reset your password on FoosKeeper',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect('/forgot');
  });
};
