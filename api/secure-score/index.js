const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await graphRequest('/security/secureScores?$top=1');
    const scores = data.value || [];
    if (!scores.length) {
      context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { score: null, message: 'No secure score data available.' } };
      return;
    }
    const s = scores[0];
    const percentage = s.maxScore > 0 ? Math.round(s.currentScore / s.maxScore * 100) : 0;
    const comparatives = (s.averageComparativeScores || []).reduce((acc, c) => { acc[c.basis] = c.averageScore; return acc; }, {});
    // Top improvement actions sorted by max potential gain
    const improvements = (s.controlScores || [])
      .filter(c => c.scoreInPercentage < 100)
      .sort((a, b) => (b.maxScore - b.score) - (a.maxScore - a.score))
      .slice(0, 10)
      .map(c => ({
        name: c.controlName,
        category: c.controlCategory,
        current: c.score,
        max: c.maxScore,
        description: c.description || ''
      }));

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        currentScore: s.currentScore,
        maxScore: s.maxScore,
        percentage,
        comparatives,
        improvements,
        createdDateTime: s.createdDateTime
      }
    };
  } catch (error) {
    let hint = 'Requires SecurityEvents.Read.All or SecurityActions.Read.All permission.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant SecurityEvents.Read.All (Application) with admin consent.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
