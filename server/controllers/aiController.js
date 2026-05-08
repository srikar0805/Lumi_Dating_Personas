const Match = require('../models/Match');
const Persona = require('../models/Persona');
const { generateCompatibilityReport } = require('../utils/huggingFace');

exports.report = async (req, res) => {
  try {
    const { matchId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (match.aiReport) {
      return res.json({ report: match.aiReport, cached: true });
    }

    const [a, b] = await Promise.all([
      Persona.findById(match.personaAId),
      Persona.findById(match.personaBId),
    ]);
    if (!a || !b) return res.status(404).json({ error: 'Persona missing' });

    try {
      const report = await generateCompatibilityReport(a, b, match);
      match.aiReport = report;
      await match.save();
      res.json({ report, cached: false });
    } catch (aiErr) {
      console.error('AI generation failed:', aiErr.message);
      res.status(502).json({ error: 'AI generation failed', detail: aiErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
