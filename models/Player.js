var mongoose = require('mongoose');
const crypto = require('crypto');


const playerSchema = new mongoose.Schema({
  name: {type: String, unique: true},
  eloRating: { type: Number, default: 1000 },
  account: {type: mongoose.Schema.Types.ObjectId, ref:  'User' }
})

playerSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.name) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash('md5').update(this.name).digest('hex');
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};
const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
