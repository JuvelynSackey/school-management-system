import { useRef, useState } from 'react';
import Reveal from '../components/Reveal';

// Two real, separately-recorded clips (real login, real dashboard, real
// navigation through an actual seeded demo school — genuine footage, not a
// mockup) played back-to-back as one experience. If a single continuous
// jesmanage-demo.mp4 is supplied later, this can collapse to one <source>
// and drop the two-part logic below with zero changes elsewhere on the page.
const PARTS = [
  '/assets/demo/jesmanage-demo-part1.webm',
  '/assets/demo/jesmanage-demo-part2.webm',
];

// Real timestamps from the actual recording, not aspirational chapter marks.
const CHAPTERS = [
  { part: 0, time: 0, label: 'Home & Login' },
  { part: 0, time: 8, label: 'Admin Dashboard' },
  { part: 0, time: 11, label: 'Student Management' },
  { part: 0, time: 17, label: 'Terminal Reports' },
  { part: 0, time: 20, label: 'Attendance' },
  { part: 0, time: 22, label: 'Fees' },
  { part: 1, time: 0, label: 'Teacher Login' },
  { part: 1, time: 7, label: 'Score Entry' },
  { part: 1, time: 11, label: 'JesManage Intelligence' },
];

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const ROLE_PANELS = [
  { role: 'Admin', desc: 'Setup, approvals, fees, and analytics.', part: 0, time: 8 },
  { role: 'Teacher', desc: 'Score entry, offline mode, remarks.', part: 1, time: 7 },
  { role: 'Parent', desc: 'Results, attendance, fees, and reports.', part: 0, time: 17 },
  { role: 'Student', desc: 'Results, attendance, and school information.', part: 0, time: 17 },
];

export default function Demo() {
  const videoRef = useRef(null);
  const pendingSeek = useRef(null);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [part, setPart] = useState(0);

  const seekTo = (chapter) => {
    const el = videoRef.current;
    if (!el || !videoAvailable) return;
    if (chapter.part !== part) {
      pendingSeek.current = chapter.time;
      setPart(chapter.part);
    } else {
      el.currentTime = chapter.time;
      el.play();
      setPlaying(true);
    }
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    if (pendingSeek.current != null) {
      el.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
    el.play();
    setPlaying(true);
  };

  const handleEnded = () => {
    if (part === 0) {
      setPart(1);
    } else {
      setPlaying(false);
    }
  };

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-6 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          See JesManage in action.
        </Reveal>
        <Reveal as="p" delay={100} className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Product demonstration &middot; real interface, real demo account
        </Reveal>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <Reveal delay={150} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-xl dark:border-gray-800">
          {videoAvailable ? (
            <video
              ref={videoRef}
              key={part}
              className="h-full w-full"
              controls
              playsInline
              poster="/logo.png"
              onError={() => setVideoAvailable(false)}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={handleEnded}
            >
              <source src={PARTS[part]} type="video/webm" />
              <track kind="captions" label="English" default />
            </video>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white">
              <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl opacity-80" />
              <p className="text-sm font-medium">Demo video coming soon</p>
              <p className="max-w-xs text-xs text-gray-400">
                Drop a file at <code className="rounded bg-white/10 px-1.5 py-0.5">/assets/demo/jesmanage-demo.mp4</code> — this page picks it up automatically.
              </p>
            </div>
          )}
          {!playing && videoAvailable && (
            <button
              type="button"
              onClick={() => { videoRef.current?.play(); setPlaying(true); }}
              aria-label="Play demo video"
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-cyan-700 shadow-lg">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </button>
          )}
        </Reveal>

        <Reveal delay={220} className="mt-5 flex flex-wrap justify-center gap-2">
          {CHAPTERS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => seekTo(c)}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-cyan-800 dark:hover:text-cyan-400"
            >
              <span className="text-gray-400 dark:text-gray-600">{formatTime(c.time)}</span> — {c.label}
            </button>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Reveal as="h2" className="text-center text-xl font-bold text-gray-900 dark:text-white">Explore the experience</Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_PANELS.map((p, i) => (
            <Reveal key={p.role} delay={i * 70}>
              <button
                type="button"
                onClick={() => seekTo(p)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-cyan-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-cyan-800"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.role}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-500">{p.desc}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
