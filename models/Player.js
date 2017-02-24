var mongoose = require('mongoose');


const playerSchema = new mongoose.Schema({
  name: {type: String, unique: true},
	eloRating: { type: Number, default: 1000 },
	account: {type: mongoose.Schema.Types.ObjectId, ref:  'User' }
})

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
