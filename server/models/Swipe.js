const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fromPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true, index: true },
  toPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true, index: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  direction: { type: String, enum: ['right', 'left'], required: true },
}, { timestamps: true });

swipeSchema.index({ fromPersonaId: 1, toPersonaId: 1 }, { unique: true });

module.exports = mongoose.model('Swipe', swipeSchema);
