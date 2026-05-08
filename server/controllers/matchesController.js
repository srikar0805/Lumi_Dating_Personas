const Match = require('../models/Match');
const Persona = require('../models/Persona');
const Swipe = require('../models/Swipe');
const { computeMatch } = require('../utils/matching');

function proximityTier(meCity, meState, themCity, themState) {
  const mc = (meCity || '').toLowerCase().trim();
  const ms = (meState || '').toLowerCase().trim();
  const tc = (themCity || '').toLowerCase().trim();
  const ts = (themState || '').toLowerCase().trim();
  if (mc && tc && mc === tc && ms === ts) return { tier: 0, label: 'Same city' };
  if (ms && ts && ms === ts) return { tier: 1, label: 'Same state' };
  if (ts) return { tier: 2, label: 'Out of state' };
  return { tier: 3, label: 'Unknown' };
}

exports.list = async (req, res) => {
  const userPersonas = await Persona.find({ userId: req.userId }).select('_id');
  const ids = userPersonas.map(p => p._id);
  const matches = await Match
    .find({ $or: [{ personaAId: { $in: ids } }, { personaBId: { $in: ids } }] })
    .sort({ score: -1 })
    .populate([
      { path: 'personaAId', populate: { path: 'userId', select: 'name' } },
      { path: 'personaBId', populate: { path: 'userId', select: 'name' } },
    ]);
  res.json(matches);
};

exports.rescoreAll = async (req, res) => {
  const personas = await Persona.find({});
  const ops = [];
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i], b = personas[j];
      const { score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment } = computeMatch(a, b);
      ops.push(Match.findOneAndUpdate(
        { personaAId: a._id, personaBId: b._id },
        { $set: { score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment, matchedAt: new Date() } },
        { upsert: true, new: true }
      ));
    }
  }
  await Promise.all(ops);
  res.json({ ok: true, rescored: ops.length });
};

exports.report = async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json({ report: match.aiReport });
};

exports.connectStack = async (req, res) => {
  try {
    const { personaId } = req.query;
    if (!personaId) return res.status(400).json({ error: 'personaId required' });

    const myPersona = await Persona.findOne({ _id: personaId, userId: req.userId }).populate('userId', 'city state name');
    if (!myPersona) return res.status(404).json({ error: 'Persona not found' });

    const swiped = await Swipe.find({ fromPersonaId: personaId }).select('toPersonaId');
    const swipedIds = new Set(swiped.map(s => s.toPersonaId.toString()));

    const candidates = await Persona
      .find({ userId: { $ne: req.userId } })
      .populate('userId', 'name city state');

    const me = myPersona.userId;
    const enriched = candidates
      .filter(p => !swipedIds.has(p._id.toString()))
      .map(p => {
        const m = computeMatch(myPersona, p);
        const prox = proximityTier(me?.city, me?.state, p.userId?.city, p.userId?.state);
        return {
          persona: {
            _id: p._id,
            name: p.name,
            traits: p.traits,
            interests: p.interests,
            connectionGoal: p.connectionGoal,
            moodTag: p.moodTag,
            bio: p.bio,
          },
          owner: {
            _id: p.userId?._id,
            name: p.userId?.name || '',
            city: p.userId?.city || '',
            state: p.userId?.state || '',
          },
          score: m.score,
          traitOverlap: m.traitOverlap,
          interestSimilarity: m.interestSimilarity,
          goalAlignment: m.goalAlignment,
          moodAlignment: m.moodAlignment,
          proximity: prox,
        };
      })
      .sort((a, b) => {
        if (a.proximity.tier !== b.proximity.tier) return a.proximity.tier - b.proximity.tier;
        return b.score - a.score;
      });

    res.json({
      fromPersona: { _id: myPersona._id, name: myPersona.name },
      me: { city: me?.city || '', state: me?.state || '' },
      candidates: enriched.slice(0, 30),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSwipe = async (req, res) => {
  try {
    const { fromPersonaId, toPersonaId } = req.query;
    if (!fromPersonaId || !toPersonaId) {
      return res.status(400).json({ error: 'fromPersonaId and toPersonaId required' });
    }
    const from = await Persona.findOne({ _id: fromPersonaId, userId: req.userId });
    if (!from) return res.status(404).json({ error: 'From persona not found' });
    const r = await Swipe.findOneAndDelete({ fromPersonaId, toPersonaId });
    res.json({ ok: true, removed: !!r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.swipe = async (req, res) => {
  try {
    const { fromPersonaId, toPersonaId, direction } = req.body;
    if (!fromPersonaId || !toPersonaId || !['right', 'left'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid swipe payload' });
    }

    const [from, to] = await Promise.all([
      Persona.findOne({ _id: fromPersonaId, userId: req.userId }),
      Persona.findById(toPersonaId),
    ]);
    if (!from) return res.status(404).json({ error: 'From persona not found' });
    if (!to) return res.status(404).json({ error: 'Target persona not found' });

    await Swipe.findOneAndUpdate(
      { fromPersonaId, toPersonaId },
      { $set: { userId: req.userId, fromPersonaId, toPersonaId, toUserId: to.userId, direction } },
      { upsert: true, new: true }
    );

    let mutual = false;
    if (direction === 'right') {
      const back = await Swipe.findOne({ fromPersonaId: toPersonaId, toPersonaId: fromPersonaId, direction: 'right' });
      mutual = !!back;
    }

    res.json({ ok: true, mutual });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
