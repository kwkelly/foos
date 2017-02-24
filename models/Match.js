var mongoose = require('mongoose');


const matchSchema = new mongoose.Schema({
	red1:   { type: Schema.Types.ObjectId, ref: 'Player' },
	red2:   { type: Schema.Types.ObjectId, ref: 'Player' },
	black1: { type: Schema.Types.ObjectId, ref: 'Player' },
	black2: { type: Schema.Types.ObjectId, ref: 'Player' },
	date: { type: Date, default: Date.now },
	winner: String
})

matchSchema.methods.getWinners = function() {
	if (winner == "red") {
		return [this.red1, this.red2]
	}
	else {
		return [this.black1, this.black2]
	}
};

matchSchema.methods.getLosers = function() {
	if (winner == "black") {
		return [this.red1, this.red2]
	}
	else {
		return [this.black1, this.black2]
	}
};

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
