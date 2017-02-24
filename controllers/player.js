const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Player = require('../models/Player');
const User = require('../models/User');

/**
 * get /player
 * Load the form to add a player
 */
exports.getPlayer = (req, res) => {
  res.render('player', {
    title: 'Create Player'
  });
};

/**
 * POST /player
 * Add a player
 */
exports.postPlayer = (req, res, next) => {
  req.assert('name', 'Name must be at least 4 characters long').len(4);
  const errors = req.validationErrors();
  console.log(req.body.name)
  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/player');
  }

  const player = new Player({
    name: req.body.name
  });

  Player.findOne({ name: req.body.name }, (err, existingPlayer) => {
    if (err) { return next(err); }
    if (existingPlayer) {
      req.flash('errors', { msg: 'Player with that name address already exists.' });
      return res.redirect('/player');
    }
    player.save((err) => {
      if (err) { return next(err); }
			else {return res.redirect(/profile/+req.body.name)}
    });
  });
};

/**
 * get /profile/:name
 * Load the form to add a player
 */
exports.getProfile = (req, res) => {
  Player
    .findOne({ name: req.params.name }, (err, player) => {
      res.render('profile', {player: player});
    })
};

/**
 * GET /players
 * List all the players
 */
exports.getPlayers = (req, res) => {
  Player.find({}, function(err, players) {
    res.render('players', {players: players});
  });
};

exports.getUsers = (req, res) => {
  User.find({}, function(err, users) {
    var userMap = {};

    users.forEach(function(user) {
      userMap[user._id] = user;
    });

    res.render('users', {users: users});
  });
};
