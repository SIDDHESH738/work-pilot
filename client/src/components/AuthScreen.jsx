export function AuthScreen({ register, setRegister, form, setForm, submitAuth, socialLogin, error }) {
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="brandmark large"><span>✦</span></div>
        <p className="eyebrow">AGENTIC ERP</p>
        <h1>{register ? 'Create your workspace' : 'Welcome back'}</h1>
        <p className="helper-text">Use your company email or continue with Google.</p>

        <div className="oauth-row single-provider">
          <button type="button" className="oauth-btn google" onClick={() => socialLogin('google')}>
            Continue with Google
          </button>
        </div>

        <div className="divider"><span>or use email</span></div>

        <form className="auth-form" onSubmit={submitAuth}>
          {register && (
            <input
              type="text"
              placeholder="Company name"
              autoComplete="organization"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="Work email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={register ? 8 : undefined}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />

          {error && <p className="inline-error">{error}</p>}

          <button type="submit" className="primary-btn full-width">
            {register ? 'Create account' : 'Login to dashboard'}
          </button>
        </form>

        <button type="button" className="switch-link" onClick={() => setRegister(!register)}>
          {register ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </button>
      </div>
    </div>
  );
}
