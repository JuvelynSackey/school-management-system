// Shared branded loading indicator — replaces the plain "Loading..." text
// that was duplicated across every data-fetching page. Same accent-ring
// recipe as the QR verification page's spinner, just theme-aware (accent
// tokens instead of a hardcoded light-mode color) since this one is used
// throughout the themed app shell, not the fixed-style verify page.
export default function LoadingSpinner({ label = 'Loading…', size = 28 }) {
  return (
    <div className="loading-spinner-wrap" role="status" aria-live="polite">
      <span className="loading-spinner" style={{ width: size, height: size }} />
      {label && <span className="muted" style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );
}
