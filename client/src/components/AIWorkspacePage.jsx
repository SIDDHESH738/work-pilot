import { useEffect, useRef } from 'react';
import { Activity, ArrowUp, Bot, Check, FileSearch, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const agentNames = {
  analytics: 'Analytics',
  finance: 'Finance',
  sales: 'Sales',
  hr: 'HR',
  knowledge: 'Knowledge'
};

const suggestions = [
  'Summarize the latest uploaded data',
  'Which tasks are overdue or still open?',
  'What invoices need attention?'
];
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export function AIWorkspacePage({ message, setMessage, runAI, busy, messages, error, activeAgent, insights }) {
  const transcriptRef = useRef(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="chat-workspace">
      <section className="panel-card chat-panel">
        <header className="chat-header">
          <div className="chat-title-icon"><Bot size={19} /></div>
          <div>
            <h1>Business chat</h1>
            <p>Ask questions about your workspace and imported files.</p>
          </div>
          <div className="status-bubble"><span className="pulse-dot" /> Ready</div>
        </header>

        <div className="agent-status-strip" aria-label="Agent status">
          {Object.entries(agentNames).map(([key, name]) => {
            const isActive = key === activeAgent;
            let status = 'Ready';
            if (isActive) status = busy ? 'Working' : 'Used';
            return (
              <div className={busy && isActive ? 'agent-status active' : 'agent-status'} key={key}>
                <span className="pulse-dot" />
                <strong>{name}</strong>
                <small>{status}</small>
              </div>
            );
          })}
        </div>

        <div className="chat-transcript" ref={transcriptRef} aria-live="polite">
          {!messages.length && (
            <div className="chat-empty">
              <div className="chat-empty-icon"><Bot size={23} /></div>
              <h2>What would you like to know?</h2>
              <p>Answers use your saved business records. Imported data is included after you approve it.</p>
              <div className="chat-suggestions">
                {suggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => setMessage(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((entry) => (
            <article className={`chat-message ${entry.role}`} key={entry.id}>
              <div className="chat-message-avatar">{entry.role === 'assistant' ? <Bot size={16} /> : 'You'}</div>
              <div className="chat-message-body">
                <div className="chat-message-label">{entry.role === 'assistant' ? 'Work Pilot assistant' : 'You'}</div>
                <div className="chat-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown></div>
                {entry.role === 'assistant' && entry.meta && (
                  <div className="answer-meta">
                    <span><Activity size={13} /> {agentNames[entry.meta.agent] || 'Analytics'} agent</span>
                    <span><FileSearch size={13} /> Used {entry.meta.usedRecordCount} records</span>
                  </div>
                )}
                {entry.role === 'assistant' && entry.meta?.actions?.length > 0 && (
                  <div className="chat-actions">
                    {entry.meta.actions.map((action, index) => (
                      <div className="chat-action" key={`${action.type}-${action.title}-${index}`}>
                        <Check size={14} />
                        <span>{action.type === 'created' ? 'Created' : 'Updated'} {action.kind}: <strong>{action.title}</strong>{action.category ? ` · ${action.category}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}

          {busy && (
            <div className="chat-message assistant">
              <div className="chat-message-avatar"><Bot size={16} /></div>
              <div className="chat-message-body">
                <div className="chat-message-label">{agentNames[activeAgent] || 'Analytics'} agent · working</div>
                <p className="typing-indicator"><i /><i /><i /></p>
              </div>
            </div>
          )}
        </div>

        {insights && (
          <aside className="chat-insights">
            <div className="insight-heading"><FileSearch size={15} /><strong>Workspace data used</strong></div>
            <div className="insight-values">
              <span>{insights.recordCount} records</span>
              <span>{insights.importedCount} imported</span>
              <span>{insights.openTasks} open tasks</span>
              <span>{insights.invoiceCount} invoices</span>
              <span>{formatCurrency(insights.invoiceValue)} invoice value</span>
            </div>
          </aside>
        )}

        {error && <p className="inline-error chat-error" role="alert">{error}</p>}

        <form className="chat-composer" onSubmit={runAI}>
          <textarea
            aria-label="Message the business assistant"
            placeholder="Ask about customers, invoices, tasks, or imported data…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={busy}
          />
          <button type="submit" className="primary-btn chat-send" disabled={busy || !message.trim()} aria-label={busy ? 'Assistant is working' : 'Send message'} title="Send message">
            {busy ? <RotateCcw size={17} className="spin-icon" /> : <ArrowUp size={18} />}
          </button>
        </form>
        <p className="chat-footnote">The assistant uses saved workspace records and may make mistakes. Verify important figures.</p>
      </section>
    </div>
  );
}