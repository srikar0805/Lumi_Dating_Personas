function jaccard(a = [], b = []) {
  if (!a.length && !b.length) return 0;
  const setA = new Set(a.map(x => String(x).toLowerCase()));
  const setB = new Set(b.map(x => String(x).toLowerCase()));
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function computeMatch(a, b) {
  const traitOverlap = Math.round(jaccard(a.traits, b.traits) * 100);
  const interestSimilarity = Math.round(jaccard(a.interests, b.interests) * 100);
  const goalAlignment = a.connectionGoal && a.connectionGoal === b.connectionGoal ? 100 : 30;
  const sameMood = (a.moodTag || '').toLowerCase() === (b.moodTag || '').toLowerCase()
    && !!(a.moodTag || '').trim();
  const moodAlignment = sameMood ? 100 : 30;
  const score = Math.round(
    0.35 * traitOverlap +
    0.35 * interestSimilarity +
    0.15 * goalAlignment +
    0.15 * moodAlignment
  );
  return { score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment };
}

module.exports = { computeMatch, jaccard };
