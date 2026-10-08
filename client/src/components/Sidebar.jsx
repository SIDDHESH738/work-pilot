import { LayoutDashboard, Sparkles, Users, Receipt, BriefcaseBusiness, CheckSquare, BookOpen, ChartNoAxesCombined, LogOut, UserRound, ShieldCheck, FileUp } from 'lucide-react';

const navItems = [
  ['Overview', LayoutDashboard],
  ['AI Workspace', Sparkles],
  ['Import Data', FileUp],
  ['Customers', Users, 'customer'],
  ['Leads', BriefcaseBusiness, 'lead'],
  ['Finance', Receipt, 'invoice'],
  ['Employees', Users, 'employee'],
  ['Tasks', CheckSquare, 'task'],
  ['Knowledge', BookOpen, 'document'],
  ['Analytics', ChartNoAxesCombined],
  ['Profile', UserRound]
];

export function Sidebar({ page, setPage, onSignOut, mobile, setMobile }) {
  return (
    <aside className={mobile ? 'sidebar show' : 'sidebar'}>
      <div className="logo-wrap">
        <div className="brandmark"><Sparkles size={18} /></div>
        <div>
          <strong>Work Pilot</strong>
          <small>INTELLIGENT ERP</small>
        </div>
      </div>

      <div className="nav-label">Workspace</div>
      <nav className="sidebar-nav">
        {navItems.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            className={page === name ? 'nav-btn active' : 'nav-btn'}
            onClick={() => {
              setPage(name);
              setMobile(false);
            }}
          >
            <Icon size={18} />
            <span>{name}</span>
            {name === 'AI Workspace' && <span className="ai-pill">AI</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="security-badge"><ShieldCheck size={16} /> Private company workspace</div>
        <button type="button" className="signout-btn" onClick={onSignOut}>
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}
