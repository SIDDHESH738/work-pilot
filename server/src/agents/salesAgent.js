export const salesAgent = {
  id: 'sales',
  name: 'Sales',
  keywords: /\b(customer|client|lead|sales|prospect|pipeline|renewal|category)\b/i,
  instruction: 'Handle customers, leads, categories, and sales pipeline work. Search existing records to avoid duplicates. Use create_record or update_record for requested customer and lead changes.'
};