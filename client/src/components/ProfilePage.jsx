import { useEffect, useState } from 'react';
import { Check, Clock3, Mail, MapPin, Pencil, ShieldCheck, X } from 'lucide-react';

export function ProfilePage({ profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    name: profile.name || '',
    title: profile.title || '',
    location: profile.location || '',
    timezone: profile.timezone || ''
  });

  useEffect(() => {
    setDraft({
      name: profile.name || '',
      title: profile.title || '',
      location: profile.location || '',
      timezone: profile.timezone || ''
    });
  }, [profile.name, profile.title, profile.location, profile.timezone]);

  const cancelEdit = () => {
    setDraft({
      name: profile.name || '',
      title: profile.title || '',
      location: profile.location || '',
      timezone: profile.timezone || ''
    });
    setError('');
    setEditing(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile.name || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="profile-grid">
      <section className="panel-card profile-hero">
        <div className="profile-summary">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.title || profile.role}</p>
          </div>
        </div>
        <div className="status-live profile-status"><span className="pulse-dot" /> {profile.status || 'Signed in'}</div>
      </section>

      <section className="panel-card profile-details">
        <div className="panel-header">
          <h3>Personal profile</h3>
          {!editing ? (
            <button type="button" className="subtle-btn profile-edit-btn" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Edit profile
            </button>
          ) : (
            <button type="button" className="subtle-btn profile-edit-btn" onClick={cancelEdit}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>

        {editing ? (
          <form className="profile-edit-form" onSubmit={saveProfile}>
            <label>Display name<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>Job title<input maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>Location<input maxLength={120} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
            <label>Time zone<input maxLength={80} value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} placeholder="e.g. Asia/Kolkata" /></label>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <button type="submit" className="primary-btn full-width" disabled={saving}>
              <Check size={16} /> {saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        ) : (
          <>
            <div className="profile-item"><Mail size={16} /> <span>{profile.email}</span><small>Account email</small></div>
            <div className="profile-item"><MapPin size={16} /> <span>{profile.location || 'Location not set'}</span></div>
            <div className="profile-item"><Clock3 size={16} /> <span>{profile.timezone || 'Time zone not set'}</span></div>
            <div className="profile-item"><ShieldCheck size={16} /> <span>Account role: {profile.accountRole || 'owner'}</span></div>
          </>
        )}
      </section>

      <section className="panel-card profile-preferences">
        <h3>Workspace</h3>
        <ul>
          <li>{profile.company || 'Company workspace'}</li>
          <li>Theme: dark and light mode</li>
          <li>Business chat uses saved company records</li>
        </ul>
      </section>
    </div>
  );
}