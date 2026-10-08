export const knowledgeAgent = {
  id: 'knowledge',
  name: 'Knowledge',
  keywords: /\b(document|policy|knowledge|sop|upload|file|procedure)\b/i,
  instruction: 'Handle reference documents and uploaded business knowledge. Retrieve matching documents before answering; create or edit a document record only when asked.'
};