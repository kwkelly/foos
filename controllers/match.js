const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Player = require('../models/Player');
const User = require('../models/User');
const Match = require('../models/Match');
const d3 = require('d3');

function getExpectation(rating_1, rating_2){
  var calc = (1.0 / (1.0 + Math.pow(10, ((rating_2 - rating_1) / 1000))));
  return calc;
};

function modifyRating(oldRating, expected, result, kFactor){
  var newRating = (oldRating + kFactor * (result - expected));
  return newRating;
};

/**
 * GET /match
 * Load the form to add a match
 */
exports.getMatch = (req, res) => {
	Player.find({})
		.populate('account')
		.exec(function(err, players) {
			if (err) { return next(err); }
			Match.find({})
				.populate('red1 red2 black1 black2')
				.sort({'_id': -1})
				.limit(3)
				.exec((err, matches) => {
					if (err) { return next(err); }
					var format = d3.timeFormat('%x');
					async.map(matches, (match, cb) => {
						cb(null, format(d3.isoParse(match.date)));
					}, (err, dates) => {
						console.log(err);
						res.render('match', {
							title: 'Add Match',
							players: players,
							matches: matches,
							dates, dates
						});
					});
				})
		});
};

/**
 * POST /addmatch
 * Load the form to add a player
 */
exports.postMatch = (req, res, next) => {
  // not implementing score checking right now...
  // req.assert('redscore', 'Name must be at least 4 characters long').len(4);
  // const errors = req.validationErrors();
  // if (errors) {
  //   req.flash('errors', errors);
  //   return res.redirect('/player');
  // }
  Player.findOne({name: req.body.red1}, (err, red1) => {
    if (err) { return next(err); }
    if (!red1) {
      req.flash('errors', { msg: 'Could not find player with name ' + req.body.red1 });
      return res.redirect('/match');
    }
    Player.findOne({name: req.body.red2}, (err, red2) => {
      if (err) { return next(err); }
      if (!red2) {
        req.flash('errors', { msg: 'Could not find player with name ' + req.body.red2 });
        return res.redirect('/match');
      }
      Player.findOne({name: req.body.black1}, (err, black1) => {
        if (err) { return next(err); }
        if (!black1) {
          req.flash('errors', { msg: 'Could not find player with name ' + req.body.black1 });
          return res.redirect('/match');
        }
        Player.findOne({name: req.body.black2}, (err, black2) => {
          if (err) { return next(err); }
          if (!black2) {
            req.flash('errors', { msg: 'Could not find player with name ' + req.body.black2 });
            return res.redirect('/match');
          }
          //found everyone!
          var winner;
          var redScore;
          var blackScore;
          if(req.body.redscore == "winner" || req.body.blackscore == "winner"){
            if(req.body.redscore == "winner"){
              winner = "red";
            }
            else if(req.body.blackscore == "winner")
            {
              winner = "black";
            }
          }
          else{
            redScore = parseInt(req.body.redscore);
            blackScore = parseInt(req.body.blackscore);
            if(redScore > blackScore) {
              winner = 'red';
            }
            else if(blackScore > redScore) {
              winner = 'black';
            }
            else {
              winner = "neither"
            }
          }
          const match = new Match({
            red1: red1.id,
            red2: red2.id,
            black1: black1.id,
            black2: black2.id,
            winner: winner,
            date: new Date(req.body.date),
            redScore: redScore,
            blackScore: blackScore
          });
          match.save((err) => {
            if (err) { return next(err); }
          });
          red1.gamesPlayed++;
          red2.gamesPlayed++;
          black1.gamesPlayed++;
          black2.gamesPlayed++;
          if(winner == "black"){
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
          if(winner == "red"){
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
                  req.flash('success', { msg: 'Match added' });
                  return res.redirect('/match')
                });
              });
            });
          });
        });
      });
    });
  });
};


/**
 * GET /matches
 * Load the form to view all matches
 */
exports.getMatches = (req, res) => {
	Match.find({})
		.populate('red1 red2 black2 black1')
		.exec(function(err, matches) {
			var format = d3.timeFormat('%x');
			async.map(matches, (match, cb) => {
				cb(null, format(d3.isoParse(match.date)));
			}, (err, dates) => {
				res.render('matches', {
					title: 'Matches',
					matches: matches,
					dates, dates
				});
			});
		});
};
