const ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

function buildMessages(a, b, match) {
  const system = 'You are a relationship compatibility analyst. Write a short narrative (3-4 sentences) covering which traits align between two personas, where friction may arise, and what dynamic to expect. Be specific and concrete. Do not restate the scores; describe the relationship.';
  const user = `Persona A — ${a.name}
Connection goal: ${a.connectionGoal}
Mood: ${a.moodTag}
Traits: ${(a.traits || []).join(', ')}
Interests: ${(a.interests || []).join(', ')}

Persona B — ${b.name}
Connection goal: ${b.connectionGoal}
Mood: ${b.moodTag}
Traits: ${(b.traits || []).join(', ')}
Interests: ${(b.interests || []).join(', ')}

Sub-scores: trait overlap ${match.traitOverlap}, interest similarity ${match.interestSimilarity}, goal alignment ${match.goalAlignment}, mood alignment ${match.moodAlignment ?? 0}, overall ${match.score}.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function generateCompatibilityReport(a, b, match) {
  const token = process.env.HF_API_TOKEN;
  const model = process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
  if (!token) throw new Error('HF_API_TOKEN not set');

  const resp = await fetch(ROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(a, b, match),
      max_tokens: 260,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HF ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return text.trim();
}

module.exports = { generateCompatibilityReport, buildMessages };
