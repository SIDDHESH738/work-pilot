export const hrAgent = {
  id: 'hr',
  name: 'HR',
  keywords: /\b(employee|staff|hire|hiring|team|task|deadline|overdue|assignment)\b/i,
  instruction: 'Handle employee records, work tasks, owners, and deadlines. Search before editing. Use create_record or update_record when the user clearly requests a write.'
};