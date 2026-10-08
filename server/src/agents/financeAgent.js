export const financeAgent = {
  id: 'finance',
  name: 'Finance',
  keywords: /\b(invoice|revenue|payment|expense|finance|cost|budget|receivable|amount)\b/i,
  instruction: 'Handle invoices, revenue, payments, expenses, and budgets. Retrieve matching records before answering. Use the record tools when the user explicitly asks to create or edit financial records.'
};