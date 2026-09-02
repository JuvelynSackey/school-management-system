// Renders the exact server-side trace aiQuery.controller.js's runQuery
// attaches when an admin opts into includeInspector: true — nothing here
// is simulated or pre-scripted; every field comes straight off that
// request's own response. See INTENT_SERVICE_FN and buildInspector there.
export default function IntelligenceInspector({ inspector }) {
  if (!inspector) return null;
  const {
    rawQuery, classifiedIntent, extractedParameters, rbac, tenantBoundary, executedService, sanitization, executionTimeMs,
  } = inspector;

  return (
    <div className="inspector-panel">
      <h3>🧪 Intelligence Inspector</h3>

      <div className="inspector-step">
        <div className="inspector-step-title">1. User Query</div>
        <div className="inspector-step-body">&quot;{rawQuery}&quot;</div>
      </div>

      <div className="inspector-step">
        <div className="inspector-step-title">2. Intent Classifier</div>
        <div className="inspector-step-body">
          <span className="inspector-code">{classifiedIntent}</span>
          {Object.keys(extractedParameters || {}).length > 0 && (
            <div style={{ marginTop: 4 }}>params: <span className="inspector-code">{JSON.stringify(extractedParameters)}</span></div>
          )}
        </div>
      </div>

      <div className={`inspector-step inspector-step--${rbac.passed ? 'pass' : 'fail'}`}>
        <div className="inspector-step-title">3. Permission &amp; Tenant Boundary</div>
        <div className="inspector-step-body">
          <div>
            <span className={`inspector-check inspector-check--${rbac.passed ? 'pass' : 'fail'}`}>{rbac.passed ? '✓' : '✕'}</span>
            {' '}Role &quot;{rbac.userRole}&quot; {rbac.passed ? 'allowed' : 'NOT allowed'} — requires one of [{rbac.requiredRoles.join(', ') || '—'}]
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="inspector-check inspector-check--pass">✓</span>
            {' '}Tenant scoped to school <span className="inspector-code">{tenantBoundary.activeSchoolId}</span>
          </div>
        </div>
      </div>

      <div className="inspector-step">
        <div className="inspector-step-title">4. Pre-Approved Service Dispatch</div>
        <div className="inspector-step-body">
          {executedService ? <span className="inspector-code">{executedService}</span> : <span className="muted">— not reached (request stopped above)</span>}
        </div>
      </div>

      <div className="inspector-step">
        <div className="inspector-step-title">5. Data Sanitization</div>
        <div className="inspector-step-body">
          {sanitization ? (
            <>
              <div>{sanitization.approach}</div>
              <div style={{ marginTop: 4 }}>
                fields returned: <span className="inspector-code">{sanitization.fieldsReturnedPerRow.join(', ') || '(no rows)'}</span>
              </div>
            </>
          ) : <span className="muted">— not reached (request stopped above)</span>}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 0 }}>{executionTimeMs}ms end-to-end</p>
    </div>
  );
}
