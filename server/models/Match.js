const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  personaAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true, index: true },
  personaBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true, index: true },
  score: { type: Number, required: true },
  traitOverlap: { type: Number, default: 0 },
  interestSimilarity: { type: Number, default: 0 },
  goalAlignment: { type: Number, default: 0 },
  moodAlignment: { type: Number, default: 0 },
  aiReport: { type: String, default: '' },
  matchedAt: { type: Date, default: Date.now },
});

matchSchema.index({ personaAId: 1, personaBId: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
