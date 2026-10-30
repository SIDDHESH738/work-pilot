import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, RefreshCw } from 'lucide-react';
import './App.css';
import { seedData } from './data/seedData';
import { ThemeToggle } from './components/ThemeToggle';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { DashboardPage } from './components/DashboardPage';
import { ProfilePage } from './components/ProfilePage';
import { DataImportPage } from './components/DataImportPage';

const AIWorkspacePage = lazy(() => import('./components/AIWorkspacePage').then((module) => ({ default: module.AIWorkspacePage })));

const api = async (path, method, body) => {
  const isFormData = body instanceof FormData;
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('erp_token') || ''}`
  };
  const requestMethod = method || 'GET';
  let requestBody;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (isFormData) requestBody = body;
  else if (body) requestBody = JSON.stringify(body);

  const response = await fetch(`/api${path}`, {
    method: requestMethod,
    headers,
    body: requestBody
  });

  const responseText = await response.text();
  let data = {};

  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  if (!responseText.trim()) throw new Error(`Server returned an empty response (HTTP ${response.status}).`);
  return data;
};

const kindMap = {
  Overview: null,
  'AI Workspace': null,
  Customers: 'customer',
  Leads: 'lead',
  Finance: 'invoice',
  Employees: 'employee',
  Tasks: 'task',
  Knowledge: 'document',
  Profile: null
};

function chooseAgent(message) {
  const text = message.toLowerCase();
  if (/invoice|revenue|payment|expense|finance|cost|budget/.test(text)) return 'finance';
  if (/lead|customer|sales|prospect|pipeline|renewal/.test(text)) return 'sales';
  if (/employee|staff|hire|hiring|team|task|deadline|overdue/.test(text)) return 'hr';
  if (/document|policy|knowledge|sop|upload|file/.test(text)) return 'knowledge';
  return 'analytics';
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [auth, setAuth] = useState(Boolean(localStorage.getItem('erp_token')));
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ company: seedData.companyName, email: '', password: '' });
  const [page, setPage] = useState('Overview');
  const [items, setItems] = useState([]);
  const [recordsError, setRecordsError] = useState('');
  const [profile, setProfile] = useState(seedData.profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeAgent, setActiveAgent] = useState('analytics');
  const [insights, setInsights] = useState(null);
  const [draft, setDraft] = useState(null);
  const [mobile, setMobile] = useState(false);
  const oauthHandled = useRef(false);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (oauthHandled.current) return;
    oauthHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oauth_code');
    const oauthError = params.get('oauth_error');
    if (!code && !oauthError) return;

    window.history.replaceState({}, document.title, window.location.pathname);
    if (oauthError) {
      setError(oauthError);
      return;
    }

    api('/auth/oauth/exchange', 'POST', { code })
      .then((data) => {
        localStorage.setItem('erp_token', data.token);
        setProfile((prev) => ({ ...prev, name: data.name || prev.name, email: data.email || prev.email }));
        setAuth(true);
      })
      .catch((oauthExchangeError) => setError(oauthExchangeError.message));
  }, []);

  useEffect(() => {
    if (auth) {
      void refresh();
      void loadProfile();
    }
    else {
      setItems([]);
      setRecordsError('');
    }
  }, [auth]);

  const refresh = async () => {
    try {
      const records = await api('/items');
      setItems(records);
      setRecordsError('');
    } catch {
      setItems([]);
      setRecordsError('Could not load workspace records. Check the API connection and try again.');
    }
  };

  const loadProfile = async () => {
    try {
      const data = await api('/profile');
      const user = data.user;
      setProfile((current) => ({
        ...current,
        name: user.name,
        title: user.title,
        role: user.title || user.role,
        accountRole: user.role,
        email: user.email,
        location: user.location,
        timezone: user.timezone,
        company: data.company.name,
        avatar: user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
      }));
    } catch {
      setError('Could not load your saved profile.');
    }
  };

  const saveProfile = async (values) => {
    const user = await api('/profile', 'PATCH', values);
    setProfile((current) => ({
      ...current,
      name: user.name,
      title: user.title,
      role: user.title || user.role,
      accountRole: user.role,
      location: user.location,
      timezone: user.timezone,
      avatar: user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const data = await api(`/auth/${register ? 'register' : 'login'}`, 'POST', form);
      localStorage.setItem('erp_token', data.token);
      setProfile((prev) => ({ ...prev, name: data.name || prev.name, email: data.email || prev.email }));
      setAuth(true);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  
const socialLogin = (provider) => {
  const company = register ? form.company : '';
  const query = company ? `?company=${encodeURIComponent(company)}` : '';

  window.location.assign(
    `https://mini-erp-api-nql7.onrender.com/api/auth/oauth/${provider}${query}`
  );
};


  const runAI = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    const prompt = message.trim();
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: prompt }]);
    setActiveAgent(chooseAgent(prompt));
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const data = await api('/ai/run', 'POST', { message: prompt, history });
      setActiveAgent(data.agent);
      setInsights(data.insights);
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        meta: { agent: data.agent, usedRecordCount: data.usedRecordCount, actions: data.actions || [] }
      }]);
      if (data.actions?.length) void refresh();
    } catch (agentError) {
      setError(agentError.message);
    } finally {
      setBusy(false);
    }
  };

  const createItem = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await api('/items', 'POST', {
        ...draft,
        title: draft.title.trim() || 'New record',
        amount: Number(draft.amount || 0),
        details: { source: 'manual-entry' }
      });
      setDraft(null);
      void refresh();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('erp_token');
    setAuth(false);
    setError('');
    setMessages([]);
    setInsights(null);
  };

  if (!auth) {
    return (
      <AuthScreen
        register={register}
        setRegister={setRegister}
        form={form}
        setForm={setForm}
        submitAuth={submitAuth}
        socialLogin={socialLogin}
        error={error}
      />
    );
  }

  const recordsForPage = page === 'Overview' || page === 'AI Workspace' || page === 'Profile'
    ? items
    : items.filter((item) => item.kind === kindMap[page]);

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} onSignOut={handleSignOut} mobile={mobile} setMobile={setMobile} />

      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="menu-btn" onClick={() => setMobile(!mobile)}>
              <Menu size={18} />
            </button>
            <div className="breadcrumb">Workspace / <strong>{page}</strong></div>
          </div>

          <div className="topbar-right">
            <button type="button" className="icon-btn" onClick={refresh}>
              <RefreshCw size={16} />
            </button>
            <div className="status-bubble"><span className="pulse-dot" /> Live</div>
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            <div className="user-chip">
              <span className="tiny-avatar">{profile.avatar}</span>
              <div>
                <strong>{profile.name}</strong>
                <small>{profile.role}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <AnimatePresence mode="wait">
            <motion.main
              key={page}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="page-main"
            >
              {page === 'Overview' && (
                <DashboardPage
                  items={items}
                  setPage={setPage}
                  loadError={recordsError}
                />
              )}

              {page === 'AI Workspace' && (
                <Suspense fallback={<section className="panel-card">Loading chat…</section>}>
                  <AIWorkspacePage
                    message={message}
                    setMessage={setMessage}
                    runAI={runAI}
                    busy={busy}
                    messages={messages}
                    activeAgent={activeAgent}
                    insights={insights}
                    error={error}
                  />
                </Suspense>
              )}

              {page === 'Import Data' && <DataImportPage request={api} onImported={refresh} />}

              {page === 'Profile' && <ProfilePage profile={profile} onSave={saveProfile} />}

              {page !== 'Overview' && page !== 'AI Workspace' && page !== 'Import Data' && page !== 'Profile' && (
                <section className="panel-card records-panel">
                  <div className="panel-header">
                    <h3>{page}</h3>
                    <button type="button" className="subtle-btn" onClick={() => setDraft({ kind: kindMap[page] || 'task', title: '', status: 'open', amount: 0 })}>+ New</button>
                  </div>

                  <div className="records-grid">
                    {recordsForPage.length ? (
                      recordsForPage.map((item) => (
                        <article key={item._id} className="record-card">
                          <div className="record-head">
                            <strong>{item.title}</strong>
                            <span className="tag-status">{item.status}</span>
                          </div>
                          <small>{item.kind}{item.details?.category ? ` · ${item.details.category}` : ''}</small>
                          <p>{item.amount ? `₹${Number(item.amount).toLocaleString('en-IN')}` : 'No amount yet'}</p>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">No {page.toLowerCase()} records yet.</div>
                    )}
                  </div>
                </section>
              )}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>

      {draft && (
        <div className="modal-backdrop">
          <button type="button" className="modal-dismiss" aria-label="Close dialog" onClick={() => setDraft(null)} />
          <dialog open className="modal-card" aria-labelledby="record-dialog-title">
            <h3 id="record-dialog-title">Add {draft.kind}</h3>
            <form onSubmit={createItem} className="modal-form">
              <input
                type="text"
                placeholder="Title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Amount"
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              />
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
              </select>
              <button type="submit" className="primary-btn full-width" disabled={busy}>Save record</button>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
