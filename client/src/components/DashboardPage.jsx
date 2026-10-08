import { ArrowUpRight, BookOpen, BriefcaseBusiness, Receipt, Users } from 'lucide-react';

const recordGroups = [
  ['Customers', 'customer', Users],
  ['Leads', 'lead', BriefcaseBusiness],
  ['Invoices', 'invoice', Receipt],
  ['Employees', 'employee', Users],
  ['Tasks', 'task', BriefcaseBusiness],
  ['Documents', 'document', BookOpen]
];

const formatAmount = (amount) => new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0
}).format(amount || 0);

export function DashboardPage({ items, setPage, loadError }) {
  const openTasks = items.filter((item) => item.kind === 'task' && !['done', 'completed', 'closed', 'cancelled'].includes(String(item.status).toLowerCase()));
  const invoices = items.filter((item) => item.kind === 'invoice');
  const invoiceValue = invoices.reduce((total, invoice) => total + (Number(invoice.amount) || 0), 0);
  const importedCount = items.filter((item) => item.details?.source === 'document-import').length;
  const metrics = [
    { label: 'Customers', value: loadError ? '—' : items.filter((item) => item.kind === 'customer').length },
    { label: 'Open tasks', value: loadError ? '—' : openTasks.length },
    { label: 'Invoice amount recorded', value: loadError ? '—' : formatAmount(invoiceValue) },
    { label: 'Imported records', value: loadError ? '—' : importedCount }
  ];
  const recentItems = [...items].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 6);
  let recentRecordsContent;
  if (loadError) {
    recentRecordsContent = <div className="empty-state">Records are unavailable until the API connection is restored.</div>;
  } else if (recentItems.length) {
    recentRecordsContent = (
      <div className="mini-table">
        {recentItems.map((item) => (
          <div key={item._id} className="mini-row">
            <div>
              <strong>{item.title}</strong>
              <small>{item.kind}{item.details?.category ? ` · ${item.details.category}` : ''}</small>
            </div>
            <span className="tag-status">{item.status}</span>
          </div>
        ))}
      </div>
    );
  } else {
    recentRecordsContent = <div className="empty-state">No records have been added to this workspace.</div>;
  }

  return (
    <>
      <div className="hero-panel">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1>Your business records</h1>
          <p>Figures below are calculated from records saved in this workspace.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setPage('AI Workspace')}>
          Open business chat <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <div className="metric-header"><span>{metric.label}</span></div>
            <h3>{metric.value}</h3>
          </article>
        ))}
      </div>

      {loadError && <p className="inline-error" role="alert">{loadError}</p>}

      <div className="split-grid">
        <section className="panel-card">
          <div className="panel-header"><h3>Records by type</h3></div>
          <div className="mini-table">
            {recordGroups.map(([label, kind, Icon]) => {
              const count = items.filter((item) => item.kind === kind).length;
              return (
                <div key={kind} className="mini-row">
                  <div className="record-group-label"><Icon size={16} /><strong>{label}</strong></div>
                  <span className="tag-status">{loadError ? '—' : count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-header"><h3>Recent records</h3></div>
          {recentRecordsContent}
        </section>
      </div>

      {!items.length && !loadError && (
        <section className="panel-card dashboard-empty-action">
          <p>Your dashboard will fill in as you add your business data.</p>
          <button type="button" className="subtle-btn" onClick={() => setPage('Import Data')}>Import records</button>
        </section>
      )}
    </>
  );
}