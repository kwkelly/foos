const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Player = require('../models/Player');
const User = require('../models/User');
const Match = require('../models/Match');


function getExpectation(rating_1, rating_2){
  var calc = (1.0 / (1.0 + Math.pow(10, ((rating_2 - rating_1) / 1000))));
  return calc;
};

function modifyRating(oldRating, expected, result, kFactor){
  var newRating = (oldRating + kFactor * (result - expected));
  return newRating;
};

/**
 * get /admin
 * Load the main admin panel
 */
exports.getAdmin  = (req, res) => {
  res.render('admin/main', {
    title: 'Admin Panel'
  });
};

/**
 * POST /admin/recalcElo
 * Load the main admin panel
 */
exports.recalcElo = (req, res, next) => {
  Player.find({}, (err, players) => {
    if (err) { return next(err); }
    // first reset all the players
    players.map((p) => {
      p.eloRating = 1000;
      p.gamesPlayed = 0;
      p.wins = 0;
      p.save((err) => {
        if (err) { return next(err); }
      });
      // then loop through all matches and update elo
    });
    Match.find({})
      .populate('red1 red2 black1 black2')
      .exec((err, matches) => {
        if (err) { return next(err); }
        async.eachSeries(matches,function(match, cb){
          Player.findOne({_id: match.red1}, (err, red1) => {
            if (err) { return next(err); }
            if (!red1) {
              req.flash('errors', { msg: 'Could not find player with name ' + req.body.red1 });
              return res.redirect('/admin');
            }
            Player.findOne({_id : match.red2}, (err, red2) => {
              if (err) { return next(err); }
              if (!red2) {
                req.flash('errors', { msg: 'Could not find player with name ' + req.body.red2 });
                return res.redirect('/admin');
              }
              Player.findOne({_id: match.black1}, (err, black1) => {
                if (err) { return next(err); }
                if (!black1) {
                  req.flash('errors', { msg: 'Could not find player with name ' + req.body.black1 });
                  return res.redirect('/admin');
                }
                Player.findOne({_id : match.black2}, (err, black2) => {
                  if (err) { return next(err); }
                  if (!black2) {
                    req.flash('errors', { msg: 'Could not find player with name ' + req.body.black2 });
                    return res.redirect('/admin');
                  }
                  red1.gamesPlayed++;
                  red2.gamesPlayed++;
                  black1.gamesPlayed++;
                  black2.gamesPlayed++;
                  if(match.winner == "black"){
                    var winnerAvg = (black1.eloRating + black2.eloRating)/2;
                    var loserAvg = (red1.eloRating + red2.eloRating)/2;
                    var winnerExp = getExpectation(winnerAvg, loserAvg);
                    var loserExp = getExpectation(loserAvg, winnerAvg);
                    black1.eloRating = modifyRating(black1.eloRating, winnerExp, 1, 50);
                    black2.eloRating = modifyRating(black2.eloRating, winnerExp, 1, 50);
                    red1.eloRating = modifyRating(red1.eloRating, loserExp, 0, 50);
                    red2.eloRating = modifyRating(red2.eloRating, loserExp, 0, 50);
                    black1.wins++;
                    black2.wins++;
                  }
                  if(match.winner == "red"){
                    var winnerAvg = (red1.eloRating + red2.eloRating)/2;
                    var loserAvg = (black1.eloRating + black2.eloRating)/2;
                    var winnerExp = getExpectation(winnerAvg, loserAvg);
                    var loserExp = getExpectation(loserAvg, winnerAvg);
                    black1.eloRating = modifyRating(black1.eloRating,loserExp, 0, 50);
                    black2.eloRating = modifyRating(black2.eloRating, loserExp, 0, 50);
                    red1.eloRating = modifyRating(red1.eloRating, winnerExp, 1, 50);
                    red2.eloRating = modifyRating(red2.eloRating, winnerExp, 1, 50);
                    red1.wins++;
                    red2.wins++;
                  }
                  red1.save((err) => {
                    if (err) { return next(err); }
                    red2.save((err) => {
                      if (err) { return next(err); }
                      black1.save((err) => {
                        if (err) { return next(err); }
                        black2.save((err) => {
                          if (err) { return next(err); }
                          cb(null);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
  });
        req.flash('success',{msg : 'scores updated'})
        return res.redirect('/admin')
};
