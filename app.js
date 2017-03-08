/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');
const crypto = require('crypto');
const mime = require('mime');

const storage = multer.diskStorage({
  // from: https://github.com/expressjs/multer/issues/170
  destination: './uploads/fullsize',
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
    });
  }
});
const upload = multer({
  //dest: path.join(__dirname, 'public/uploads/fullsize'),
  limits: {
    fileSize: 2097152
  },
  fileFilter: (req, file, cb) => {
    var mimetypes = {
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif'
    };
    var mimetype = file.mimetype;
    console.log(mimetype)
    if(!(mimetype == mimetypes.jpg ||
      mimetype == mimetypes.png ||
      mimetype == mimetypes.gif)){
      console.log(__dirname)
      // fs.unlink('/t', (err) => {
      //   if (err) throw err;
      //   console.log('successfully deleted /tmp/hello');
      // });
      var err= new Error('Please only upload jpg, gif, or png');
      err.code = "WRONG_TYPE";
      return cb(err);
    }
    return cb(null, true);
  },
  storage: storage
});

/**
 * Error handler for teh multer uploader 
 */
var uploadErr = (err, req, res, next) => {
  if(err.code == 'LIMIT_FILE_SIZE'){
    req.flash('errors', { msg: 'That file is too big!' });
    return res.redirect('/account');
  } else if (err.code == 'WRONG_TYPE') {
    req.flash('errors', { msg: 'Please only upload images.' });
    return res.redirect('/account');
  } else {
    req.flash('success', { msg: 'Profile picture updated successfully.' });
    next();
  }
}


/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const playerController = require('./controllers/player');
const matchController = require('./controllers/match');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');
const adminController = require('./controllers/admin');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('error', () => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(bodyParser({limit: '10mb'}));
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  if (req.path === '/api/upload' || req.path.match(/^\/admin/i) || req.path == '/account/profilepicture') {
    next();
  } else {
    lusca.csrf({cookie: "_csrf"})(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== '/login' &&
      req.path !== '/signup' &&
      !req.path.match(/^\/auth/) &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
      req.path == '/account') {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use(express.static(path.join(__dirname, 'uploads'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/about', homeController.about);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/activate/:token', userController.getActivate);
app.post('/activate/:token', userController.postActivate);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/linkplayer', passportConfig.isAuthenticated, userController.postLinkPlayer);
app.post('/account/addplayer', passportConfig.isAuthenticated, userController.postAddPlayer);
app.post('/account/renameplayer', passportConfig.isAuthenticated, userController.postRenamePlayer);
app.post('/account/unlinkplayer', passportConfig.isAuthenticated, userController.postUnlinkPlayer);
app.post('/account/profilepicture', passportConfig.isAuthenticated, upload.single('myFile'), uploadErr, userController.postProfilePicture);
app.post('/account/editedpicture', passportConfig.isAuthenticated, userController.postEditedProfilePicture);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);


app.get('/users', playerController.getUsers);
app.get('/rankings', passportConfig.isAuthenticated, playerController.getRankings)
app.get('/player/:handle', passportConfig.isAuthenticated, playerController.getPlayer)
app.get('/player', passportConfig.isAuthenticated, playerController.getPlayer)
app.post('/player', passportConfig.isAuthenticated, playerController.postPlayer)
app.get('/profile/:name', passportConfig.isAuthenticated, playerController.getProfile)
app.get('/match', passportConfig.isAuthenticated, matchController.getMatch);
app.post('/addmatch', passportConfig.isAuthenticated, matchController.postMatch);

app.get('/matches', passportConfig.isAuthenticated, matchController.getMatches);

app.use( "/about/bylaws", [ passportConfig.isAuthenticated, (req,res,next) => {res.sendFile(path.join(__dirname, '/static/Foosball Underground ByLaws.pdf'))} ] );

/**
 * API examples routes.
 */
app.get('/api/upload', apiController.getFileUpload);
app.post('/api/upload', upload.single('myFile'), apiController.postFileUpload);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/microsoft', passport.authenticate('azuread-openidconnect', { state: 'SOME STATE' }));
app.get('/auth/microsoft/callback', passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});


/**
 * Admin stuff
 */
var mongo_express = require('mongo-express/lib/middleware')
var mongo_express_config = require(process.env.ADMIN_CONFIG)

app.use('/admin/database', passportConfig.isAdmin, mongo_express(mongo_express_config))
app.get('/admin', passportConfig.isAdmin, adminController.getAdmin);
app.post('/admin/recalcElo', passportConfig.isAdmin, adminController.recalcElo);

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); 
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
