import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  startAttempt, getMyAttempt, saveAnswer, submitAttempt,
} from '../../api/attempts.api';
import { useOffline } from '../../context/OfflineContext';
import {
  queueWrite, getQueue, removeFromQueue, markConflict, markFailed, isNetworkError,
} from '../../utils/offlineStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const answerKey = (attemptId, questionId) => `attempt-answer:${attemptId}:${questionId}`;

const formatRemaining = (totalSeconds) => {
  if (totalSeconds === null) return null;
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function TakeAssessment() {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();
  const { isOnline, registerFlushHandler, refreshPendingCount } = useOffline();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [orderingArrangements, setOrderingArrangements] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const autoSubmittedRef = useRef(false);

  const applyAttempt = (data) => {
    setAttempt(data);
    setAnswers(Object.fromEntries((data?.answers || []).map((a) => [a.questionId, a.response])));
    const arrangements = {};
    (data?.questions || []).forEach((q) => {
      if (q.type === 'ordering') {
        const existing = (data.answers || []).find((a) => a.questionId === q.id)?.response;
        arrangements[q.id] = Array.isArray(existing) && existing.length === q.items.length
          ? existing.map((originalIndex) => q.items.find((it) => it.index === originalIndex))
          : q.items;
      }
    });
    setOrderingArrangements(arrangements);
  };

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyAttempt(assessmentId);
      applyAttempt(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [assessmentId]);

  const handleStart = async () => {
    setIsLoading(true);
    setError('');
    try {
      applyAttempt(await startAttempt(assessmentId));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start this assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer is display-only -- the server independently enforces deadlineAt on
  // every write, so a manipulated or frozen client clock can't extend time.
  useEffect(() => {
    if (!attempt || attempt.status !== 'InProgress' || !attempt.deadlineAt) { setRemainingSeconds(null); return undefined; }
    const tick = () => {
      const secondsLeft = Math.round((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000);
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        // eslint-disable-next-line no-use-before-define
        handleSubmit();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, attempt?.status, attempt?.deadlineAt]);

  // Registers with OfflineContext so reconnecting anywhere in the app
  // flushes whatever this page queued, not just while it's mounted --
  // exactly the same pattern ResultsEntry.jsx already uses for score entry.
  useEffect(() => registerFlushHandler(async () => {
    const queue = getQueue().filter((entry) => entry.key.startsWith('attempt-answer:') && entry.status === 'pending');
    await Promise.all(queue.map(async (entry) => {
      try {
        await saveAnswer(entry.payload.attemptId, entry.payload.questionId, entry.payload.response);
        removeFromQueue(entry.key);
      } catch (err) {
        if (isNetworkError(err)) return;
        const { code, message: serverMessage } = err.response?.data || {};
        if (code === 'ATTEMPT_LOCKED' || code === 'ATTEMPT_EXPIRED') markConflict(entry.key, { message: serverMessage, code });
        else markFailed(entry.key, serverMessage || err.message);
      }
    }));
  }), [registerFlushHandler]);

  const persistAnswer = async (questionId, response) => {
    if (!isOnline) {
      queueWrite(answerKey(attempt.id, questionId), { attemptId: attempt.id, questionId, response });
      refreshPendingCount();
      setMessage("Saved on this device — will sync when you're back online.");
      return;
    }
    try {
      await saveAnswer(attempt.id, questionId, response);
      setMessage('Saved.');
    } catch (err) {
      if (err.response?.data?.code === 'ATTEMPT_EXPIRED') {
        setError('Time is up — this attempt has been submitted automatically.');
        load();
      } else {
        setError(err.response?.data?.message || 'Failed to save your answer.');
      }
    }
  };

  const setAnswer = (questionId, response) => {
    setAnswers((prev) => ({ ...prev, [questionId]: response }));
    persistAnswer(questionId, response);
  };

  const toggleMultiSelect = (questionId, optionIndex) => {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    const next = current.includes(optionIndex) ? current.filter((i) => i !== optionIndex) : [...current, optionIndex];
    setAnswer(questionId, next);
  };

  const setMatchingAnswer = (questionId, leftIndex, rightIndex, pairCount) => {
    const current = Array.isArray(answers[questionId]) ? [...answers[questionId]] : new Array(pairCount).fill(null);
    current[leftIndex] = rightIndex;
    setAnswer(questionId, current);
  };

  const moveOrderingItem = (questionId, position, direction) => {
    setOrderingArrangements((prev) => {
      const arrangement = [...(prev[questionId] || [])];
      const target = position + direction;
      if (target < 0 || target >= arrangement.length) return prev;
      [arrangement[position], arrangement[target]] = [arrangement[target], arrangement[position]];
      setAnswer(questionId, arrangement.map((item) => item.index));
      return { ...prev, [questionId]: arrangement };
    });
  };

  const setBlankAnswer = (questionId, blankIndex, value, blankCount) => {
    const current = Array.isArray(answers[questionId]) ? [...answers[questionId]] : new Array(blankCount).fill('');
    current[blankIndex] = value;
    setAnswer(questionId, current);
  };

  const handleSubmit = async () => {
    if (!attempt || attempt.status !== 'InProgress') return;
    setIsSubmitting(true);
    setError('');
    try {
      applyAttempt(await submitAttempt(attempt.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit this attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading assessment…" />;
  if (error && !attempt) return <div className="alert-error">{error}</div>;

  if (!attempt) {
    return (
      <div className="panel">
        <h1>Ready to begin?</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Once you start, the timer (if this assessment is timed) begins immediately.
        </p>
        {error && <div className="alert-error">{error}</div>}
        <button type="button" className="btn-primary" onClick={handleStart}>Start Assessment</button>
      </div>
    );
  }

  const isInProgress = attempt.status === 'InProgress';
  const isReleased = attempt.totalScore !== null;

  return (
    <div>
      <div className="toolbar">
        <h1>{attempt.assessment?.title}</h1>
        {isInProgress && remainingSeconds !== null && (
          <span className={`badge ${remainingSeconds < 60 ? 'badge-danger' : 'badge-warning'}`}>
            Time Remaining: {formatRemaining(remainingSeconds)}
          </span>
        )}
      </div>

      {attempt.assessment?.instructions && (
        <div className="panel"><p className="muted">{attempt.assessment.instructions}</p></div>
      )}

      {!isInProgress && (
        <div className="panel">
          <h2 style={{ margin: '0 0 8px' }}>
            {attempt.status === 'AwaitingReview' ? 'Submitted — Awaiting Review' : 'Submitted'}
          </h2>
          {isReleased ? (
            <p style={{ fontSize: 18, fontWeight: 600 }}>
              Score: {attempt.totalScore} / {attempt.totalPossibleMarks}
            </p>
          ) : (
            <p className="muted">Your results will be available once they are released.</p>
          )}
          <button type="button" className="btn-secondary" onClick={() => navigate('/assessments')}>Back to My Assessments</button>
        </div>
      )}

      {message && <p className="muted" style={{ fontSize: 12.5 }}>{message}</p>}

      {(attempt.questions || []).map((q) => (
        <div className="panel" key={q.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{q.topic}</strong>
            <span className="muted" style={{ fontSize: 12 }}>{q.marks} marks</span>
          </div>
          <p style={{ marginBottom: 12 }}>{q.promptText}</p>

          {(q.type === 'mcq' || q.type === 'true_false') && q.options.map((opt) => (
            <label key={opt.index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input
                type="radio"
                name={`q-${q.id}`}
                disabled={!isInProgress}
                checked={answers[q.id] === opt.index}
                onChange={() => setAnswer(q.id, opt.index)}
              />
              {opt.text}
            </label>
          ))}

          {q.type === 'multi_select' && q.options.map((opt) => (
            <label key={opt.index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input
                type="checkbox"
                disabled={!isInProgress}
                checked={Array.isArray(answers[q.id]) && answers[q.id].includes(opt.index)}
                onChange={() => toggleMultiSelect(q.id, opt.index)}
              />
              {opt.text}
            </label>
          ))}

          {q.type === 'matching' && q.leftItems.map((left) => (
            <div key={left.index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{left.text}</span>
              <select
                disabled={!isInProgress}
                value={Array.isArray(answers[q.id]) ? (answers[q.id][left.index] ?? '') : ''}
                onChange={(e) => setMatchingAnswer(q.id, left.index, Number(e.target.value), q.leftItems.length)}
                style={{ flex: 1 }}
              >
                <option value="">Select a match...</option>
                {q.rightItems.map((right) => <option key={right.index} value={right.index}>{right.text}</option>)}
              </select>
            </div>
          ))}

          {q.type === 'ordering' && (orderingArrangements[q.id] || q.items).map((item, position) => (
            <div key={item.index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="muted" style={{ width: 20 }}>{position + 1}.</span>
              <span style={{ flex: 1 }}>{item.text}</span>
              {isInProgress && (
                <>
                  <button type="button" className="link-btn" disabled={position === 0} onClick={() => moveOrderingItem(q.id, position, -1)}>Up</button>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={position === (orderingArrangements[q.id] || q.items).length - 1}
                    onClick={() => moveOrderingItem(q.id, position, 1)}
                  >
                    Down
                  </button>
                </>
              )}
            </div>
          ))}

          {q.type === 'fill_in_blank' && Array.from({ length: q.blankCount }).map((_, blankIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <input
              key={blankIndex}
              disabled={!isInProgress}
              value={(Array.isArray(answers[q.id]) && answers[q.id][blankIndex]) || ''}
              onChange={(e) => {
                const current = Array.isArray(answers[q.id]) ? [...answers[q.id]] : new Array(q.blankCount).fill('');
                current[blankIndex] = e.target.value;
                setAnswers((prev) => ({ ...prev, [q.id]: current }));
              }}
              onBlur={(e) => setBlankAnswer(q.id, blankIndex, e.target.value, q.blankCount)}
              placeholder={`Blank ${blankIndex + 1}`}
              style={{ display: 'block', marginBottom: 6, width: '100%' }}
            />
          ))}

          {q.type === 'essay' && (
            <textarea
              rows={4}
              disabled={!isInProgress}
              defaultValue={answers[q.id] || ''}
              onBlur={(e) => setAnswer(q.id, e.target.value)}
              style={{ width: '100%' }}
            />
          )}

          {q.type === 'file_upload' && (
            <p className="muted">File upload is not yet available in this version — please submit this item separately with your teacher.</p>
          )}
        </div>
      ))}

      {isInProgress && (
        <div className="toolbar">
          <button type="button" className="btn-primary" disabled={isSubmitting || !isOnline} title={!isOnline ? 'Reconnect to submit' : undefined} onClick={handleSubmit}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
      {error && <div className="alert-error">{error}</div>}
    </div>
  );
}
