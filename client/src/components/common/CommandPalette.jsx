import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Global Ctrl+K / Cmd+K launcher. Two result types share one keyboard-driven
// list rather than being separate UIs: matching NAV_ITEMS (instant, local
// filtering — no network call) and, when enableAI is on, a single "Ask
// JesManage" row that hands the typed text off to the EXISTING AskJesManage
// flow (onAskJesManage) instead of re-implementing intent parsing/results
// rendering here. This component only ever navigates or hands off text —
// it never calls the AI itself.
export default function CommandPalette({ navItems, enableAI, onAskJesManage }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeydown = (e) => {
      const isCombo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCombo) {
        e.preventDefault();
        setIsOpen((open) => !open);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => { setHighlighted(0); }, [query]);

  if (!isOpen) return null;

  const trimmed = query.trim();
  const navMatches = trimmed
    ? navItems.filter((item) => item.label.toLowerCase().includes(trimmed.toLowerCase()))
    : navItems;
  const results = [
    ...navMatches.map((item) => ({ type: 'nav', key: item.to, label: item.label, to: item.to })),
    ...(enableAI && trimmed ? [{ type: 'ask', key: 'ask', label: `Ask JesManage: "${trimmed}"` }] : []),
  ];

  const close = () => setIsOpen(false);

  const activate = (result) => {
    if (!result) return;
    if (result.type === 'nav') {
      navigate(result.to);
    } else if (result.type === 'ask') {
      onAskJesManage(trimmed);
    }
    close();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(results[highlighted]);
    }
  };

  return (
    <div className="command-palette-overlay" onClick={close}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-palette-input"
          placeholder={enableAI ? 'Search pages, or ask a question…' : 'Search pages…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="command-palette-results">
          {results.length === 0 && <p className="muted" style={{ padding: '14px 16px', margin: 0 }}>No matches.</p>}
          {results.map((result, i) => (
            <button
              type="button"
              key={result.key}
              className={`command-palette-item${i === highlighted ? ' is-highlighted' : ''}${result.type === 'ask' ? ' is-ask' : ''}`}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => activate(result)}
            >
              {result.type === 'ask' ? '🔎 ' : ''}{result.label}
            </button>
          ))}
        </div>
        <div className="command-palette-hint">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
