import { useRef, useState } from 'react';
import { Check, FileSpreadsheet, FileText, FileUp, Sparkles } from 'lucide-react';

const acceptedExtensions = new Set(['.xlsx', '.docx', '.pdf']);
const fileExtension = (fileName) => fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

export function DataImportPage({ request, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    if (!acceptedExtensions.has(fileExtension(nextFile.name))) {
      setError('Choose an Excel .xlsx, Word .docx, or text-based PDF file.');
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setError('Files must be 5 MB or smaller.');
      return;
    }
    setFile(nextFile);
    setAnalysis(null);
    setSelected(new Set());
    setError('');
    setNotice('');
  };

  const analyzeFile = async (event) => {
    event.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await request('/import/analyze', 'POST', formData);
      setAnalysis(result);
      setSelected(new Set(result.items.map((item) => item.id)));
      if (!result.items.length) setNotice('The agents found no records or actionable tasks in this file.');
    } catch (analyzeError) {
      setError(analyzeError.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSuggestion = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importSelected = async () => {
    if (!analysis || !selected.size) return;
    const selectedItems = analysis.items.filter((item) => selected.has(item.id));
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await request('/import/commit', 'POST', {
        sourceFile: analysis.filename,
        items: selectedItems
      });
      setNotice(`Imported ${result.imported} ${result.imported === 1 ? 'record' : 'records'} from ${analysis.filename}.`);
      setFile(null);
      setAnalysis(null);
      setSelected(new Set());
      await onImported();
    } catch (importError) {
      setError(importError.message);
    } finally {
      setBusy(false);
    }
  };

  const allSelected = Boolean(analysis?.items.length) && selected.size === analysis.items.length;

  return (
    <div className="page-main import-page">
      <section className="hero-panel import-hero">
        <div>
          <p className="eyebrow">TEAM DATA INTAKE</p>
          <h1>Import a business document</h1>
          <p>Finance, sales, HR, and knowledge agents will sort useful records and tasks. Review suggestions before adding them to your workspace.</p>
        </div>
        <div className="import-format-icons" aria-label="Supported formats: Excel, Word, and PDF">
          <FileSpreadsheet size={22} />
          <FileText size={22} />
          <FileUp size={22} />
        </div>
      </section>

      <section className="panel-card import-panel">
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".xlsx,.docx,.pdf"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <button
          type="button"
          className="import-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFile(event.dataTransfer.files?.[0]);
          }}
        >
          <span className="import-upload-icon"><FileUp size={22} /></span>
          <strong>{file ? file.name : 'Choose a file or drop it here'}</strong>
          <span>Excel .xlsx, Word .docx, or PDF · up to 5 MB</span>
        </button>

        <div className="import-actions">
          <button type="button" className="subtle-btn" onClick={() => inputRef.current?.click()}>
            Select file
          </button>
          <button type="button" className="primary-btn" onClick={analyzeFile} disabled={!file || busy}>
            <Sparkles size={16} /> {busy ? 'Analyzing…' : 'Analyze with agents'}
          </button>
        </div>

        {error && <p className="inline-error" role="alert">{error}</p>}
        {notice && <output className="import-notice"><Check size={16} /> {notice}</output>}
      </section>

      {analysis && (
        <section className="panel-card import-results">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AGENT REVIEW</p>
              <h3>{analysis.items.length} suggestions</h3>
            </div>
            {analysis.items.length > 0 && (
              <button
                type="button"
                className="subtle-btn"
                onClick={() => setSelected(allSelected ? new Set() : new Set(analysis.items.map((item) => item.id)))}
              >
                {allSelected ? 'Select none' : 'Select all'}
              </button>
            )}
          </div>
          <p className="import-summary">{analysis.summary}</p>

          {analysis.items.length > 0 && (
            <>
              <div className="suggestion-list">
                {analysis.items.map((item) => (
                  <label key={item.id} className="suggestion-row">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSuggestion(item.id)}
                    />
                    <span className="suggestion-copy">
                      <strong>{item.title}</strong>
                      <small>{item.kind} · {item.status}{item.amount ? ` · ${Number(item.amount).toLocaleString()}` : ''}</small>
                    </span>
                    <span className={`agent-tag agent-${item.assignedAgent}`}>{item.assignedAgent}</span>
                  </label>
                ))}
              </div>
              <div className="import-actions import-confirm-row">
                <span className="muted-icon">{selected.size} selected</span>
                <button type="button" className="primary-btn" onClick={importSelected} disabled={!selected.size || busy}>
                  <Check size={16} /> {busy ? 'Importing…' : 'Add selected records'}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}