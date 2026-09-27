/**
 * Compute weighted_total for each evaluation:
 * sum(score * weight) / sum(weights), normalized on a 0–10 scale.
 */
function addWeightedTotals(evaluations, weightedCriteria) {
  const criteria = Array.isArray(weightedCriteria) ? weightedCriteria : [];
  const totalWeight = criteria.reduce(
    (sum, c) => sum + (Number(c.weight) || 0),
    0
  );

  return (evaluations || []).map((ev) => {
    const scores = ev.scores || {};
    let weightedSum = 0;

    if (totalWeight > 0) {
      for (const c of criteria) {
        const name = c.name;
        const weight = Number(c.weight) || 0;
        const score = Number(scores[name]);
        if (!Number.isNaN(score)) {
          weightedSum += score * weight;
        }
      }
      const weighted_total = Math.round((weightedSum / totalWeight) * 100) / 100;
      return { ...ev, weighted_total };
    }

    // No weights: average of available scores
    const values = Object.values(scores)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const avg =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
          100
        : 0;
    return { ...ev, weighted_total: avg };
  });
}

module.exports = { addWeightedTotals };
