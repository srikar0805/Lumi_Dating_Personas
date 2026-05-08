const Persona = require('../models/Persona');
const PersonaVersion = require('../models/PersonaVersion');
const Match = require('../models/Match');
const { computeMatch } = require('../utils/matching');

async function rescoreMatchesFor(persona) {
  const others = await Persona.find({ _id: { $ne: persona._id } });
  const ops = others.map(async (other) => {
    const [a, b] = String(persona._id) < String(other._id) ? [persona, other] : [other, persona];
    const { score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment } = computeMatch(a, b);
    await Match.findOneAndUpdate(
      { personaAId: a._id, personaBId: b._id },
      { $set: { score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment, matchedAt: new Date() } },
      { upsert: true, new: true }
    );
  });
  await Promise.all(ops);
}

exports.list = async (req, res) => {
  const personas = await Persona.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(personas);
};

exports.create = async (req, res) => {
  try {
    const count = await Persona.countDocuments({ userId: req.userId });
    if (count >= 5) return res.status(400).json({ error: 'Max 5 personas per user' });

    const persona = await Persona.create({
      ...req.body,
      userId: req.userId,
      currentVersion: 1,
    });
    await PersonaVersion.create({
      personaId: persona._id,
      versionNumber: 1,
      snapshot: persona.toObject(),
    });
    await rescoreMatchesFor(persona);
    res.status(201).json(persona);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await Persona.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) return res.status(404).json({ error: 'Persona not found' });

    const { userId: _skip, currentVersion: _skip2, ...updates } = req.body;
    Object.assign(existing, updates, { currentVersion: existing.currentVersion + 1 });
    await existing.save();

    await PersonaVersion.create({
      personaId: existing._id,
      versionNumber: existing.currentVersion,
      snapshot: existing.toObject(),
    });

    await rescoreMatchesFor(existing);
    res.json(existing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  const existing = await Persona.findOne({ _id: req.params.id, userId: req.userId });
  if (!existing) return res.status(404).json({ error: 'Persona not found' });
  await Match.deleteMany({ $or: [{ personaAId: existing._id }, { personaBId: existing._id }] });
  await PersonaVersion.deleteMany({ personaId: existing._id });
  await existing.deleteOne();
  res.json({ ok: true });
};

exports.history = async (req, res) => {
  const persona = await Persona.findOne({ _id: req.params.id, userId: req.userId });
  if (!persona) return res.status(404).json({ error: 'Persona not found' });
  const versions = await PersonaVersion.find({ personaId: persona._id }).sort({ versionNumber: -1 });
  res.json(versions);
};
