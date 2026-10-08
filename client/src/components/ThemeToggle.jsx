export function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} type="button">
      <span>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
    </button>
  );
}
