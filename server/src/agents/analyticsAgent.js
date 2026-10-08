export const analyticsAgent = {
  id: 'analytics',
  name: 'Analytics',
  keywords: /\b(insight|summary|summarize|trend|report|overview|count|total|compare|data)\b/i,
  instruction: 'Analyze totals, status distributions, and trends from records returned by the ERP tools. Show how each figure was derived. Do not alter records unless the user explicitly requests a change.'
};