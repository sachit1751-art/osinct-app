import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import gsap from 'gsap'
import { useAuthActions, useConvexAuth, useMutation, useQuery } from './features/convex/convex-bridge.ts'
import { api } from '../convex/_generated/api'
import './App.css'
import { SearchError, type SearchState } from './features/search/search.types.ts'
import { createSearchService, getSearchServiceConfig } from './features/search/search.service.ts'
import { validateQuery } from './features/search/search.validation.ts'
import { DecryptedText } from './components/ui/DecryptedText.tsx'
import { ShinyText } from './components/ui/ShinyText.tsx'

const DEFAULT_MAINTENANCE_MESSAGE = 'The website is currently under maintenance. Please wait for service to resume.'
const CINEMATIC_EASE = 'power3.out'
const searchConfig = getSearchServiceConfig(import.meta.env as Record<string, string | boolean | undefined>)
const searchService = createSearchService(searchConfig)

function Icon({ name, size = 18 }: { name: 'search' | 'arrow' | 'shield' | 'alert' | 'refresh' | 'spinner' | 'close'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2"/></>,
    spinner: <path d="M21 12a9 9 0 1 1-6.2-8.6"/>,
    close: <><path d="m18 6-12 12"/><path d="m6 6 12 12"/></>,
  }
  return <svg {...common} className={name === 'spinner' ? 'spin-icon' : undefined}>{paths[name]}</svg>
}

function ScreenTransition({ children, transitionKey }: { children: React.ReactNode; transitionKey: string }) {
  const screenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!screenRef.current) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    gsap.fromTo(
      screenRef.current,
      { opacity: 0, y: 14, scale: 0.995 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: CINEMATIC_EASE },
    )
  }, [transitionKey])

  return (
    <div ref={screenRef} className="screen-transition-container" key={transitionKey}>
      {children}
    </div>
  )
}

function AuthScreen() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    formData.set('flow', flow)
    try { await signIn('password', formData) }
    catch {
      setError(flow === 'signIn'
        ? 'Sign-in failed. Check your email and password.'
        : 'Account creation failed. Check your email and use a password with at least 8 characters.')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <a className="brand" href="#top" aria-label="Osinct home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">osinct<span className="brand-period">.</span></span>
        </a>
        <span className="auth-secure-label">
          <ShinyText text="SECURE ACCESS · OSINCT" speed={3.5} />
        </span>
      </header>
      <main className="auth-layout">
        <section className="auth-copy">
          <div className="eyebrow">OSINCT / SECURE ACCESS</div>
          <h1>
            <DecryptedText text="One workspace. Clear access." speed={30} />
          </h1>
          <p>Sign in with your user or administrator account to access the search workspace.</p>
          <div className="auth-note"><span className="env-dot" /> Administrator permissions are assigned server-side.</div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-kicker">YOUR ACCOUNT</div>
          <h2 id="auth-title">{flow === 'signIn' ? 'Sign in' : 'Create account'}</h2>
          <p className="auth-card-description">{flow === 'signIn' ? 'Enter your account details to continue.' : 'Create a user account with your email.'}</p>
          <form onSubmit={(event) => void submit(event)} className="auth-form">
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" name="password" type="password" autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} required />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={16} />
            </button>
          </form>
          <div className="auth-switch">
            {flow === 'signIn' ? 'Need a user account?' : 'Already registered?'}{' '}
            <button type="button" onClick={() => { setFlow(flow === 'signIn' ? 'signUp' : 'signIn'); setError('') }} disabled={busy}>
              {flow === 'signIn' ? 'Create account' : 'Sign in'}
            </button>
          </div>
          <p className="auth-footnote">Admin rights are not granted by choosing a login option; they are assigned to the configured administrator account.</p>
        </section>
      </main>
      <footer className="auth-footer">
        <span>OSINCT · SECURE WORKSPACE</span>
        <span><ShinyText text="AUTHENTICATED ACCESS" speed={4} /></span>
      </footer>
    </div>
  )
}

function Workspace() {
  const { signOut } = useAuthActions()
  const maintenance = useQuery(api.maintenance.getStatus, {})
  const adminStatus = useQuery(api.maintenance.getAdminStatus, {})
  const updateMaintenance = useMutation(api.maintenance.updateStatus)
  const enableMaintenanceByCode = useMutation(api.maintenance.enableByCode)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const [adminOpen, setAdminOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [maintenanceDraft, setMaintenanceDraft] = useState<{ enabled: boolean; message: string } | null>(null)
  const [maintenanceSaveBusy, setMaintenanceSaveBusy] = useState(false)
  const [maintenanceFeedback, setMaintenanceFeedback] = useState('')
  const activeController = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLElement>(null)
  const maintenanceEnabledDraft = maintenanceDraft?.enabled ?? maintenance?.enabled ?? false
  const maintenanceMessageDraft = maintenanceDraft?.message ?? maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE
  const liveEnabled = searchConfig.http.enabled

  useEffect(() => () => activeController.current?.abort(), [])

  // Staggered entrance animation for search results container using consistent cinematic easing
  useEffect(() => {
    if (!resultsContainerRef.current) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const items = resultsContainerRef.current.querySelectorAll('.stagger-target')
    if (items.length > 0) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 16, filter: 'blur(3px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          stagger: 0.08,
          ease: CINEMATIC_EASE,
        },
      )
    }
  }, [state.status, state])

  async function saveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMaintenanceSaveBusy(true)
    setMaintenanceFeedback('')
    try {
      const next = { enabled: maintenanceEnabledDraft, message: maintenanceMessageDraft }
      if (next.enabled) { activeController.current?.abort(); activeController.current = null; setState({ status: 'idle' }) }
      await updateMaintenance(next)
      setMaintenanceDraft(next)
      setMaintenanceFeedback('Maintenance settings saved.')
    } catch (cause) {
      setMaintenanceFeedback(cause instanceof Error ? cause.message : 'Could not save settings. Verify administrator access.')
    } finally { setMaintenanceSaveBusy(false) }
  }

  async function performSearch(nextQuery = query) {
    if (maintenance === undefined || activeController.current) return
    if (nextQuery.trim() === '192008') {
      setMaintenanceFeedback('')
      try {
        await enableMaintenanceByCode({ code: nextQuery.trim() })
        setState({ status: 'idle' })
        setQuery('')
      } catch (cause) {
        setState({ status: 'error', message: cause instanceof Error ? cause.message : 'Could not enable maintenance mode.', retryable: false, query: nextQuery.trim(), diagnostic: 'maintenance_code_invalid' })
      }
      return
    }
    if (maintenance.enabled) return
    const controller = new AbortController()
    activeController.current = controller
    setState({ status: 'loading' })
    try {
      const validated = validateQuery(nextQuery)
      const response = await searchService.search(validated, controller.signal)
      if (controller.signal.aborted || activeController.current !== controller) return
      setState({ status: 'success', response, query: validated })
    } catch (cause) {
      if (controller.signal.aborted || activeController.current !== controller) return
      const error = cause instanceof SearchError ? cause : new SearchError('network', 'The request could not be completed.', { retryable: true })
      setState({ status: 'error', message: error.message, retryable: error.retryable, query: nextQuery.trim(), diagnostic: `${error.code}${error.status ? ` · HTTP ${error.status}` : ''}` })
    } finally { if (activeController.current === controller) activeController.current = null }
  }

  function cancelSearch() {
    activeController.current?.abort()
    activeController.current = null
    setState({ status: 'idle' })
  }

  const loading = state.status === 'loading'
  const isError = state.status === 'error'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Osinct home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">osinct<span className="brand-period">.</span></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <a className="nav-active" href="#workspace">Search</a>
          {adminStatus?.isAdmin && (
            <button
              className={adminOpen ? 'nav-button nav-button-active' : 'nav-button'}
              type="button"
              onClick={() => setAdminOpen(!adminOpen)}
            >
              Admin
            </button>
          )}
        </nav>
        <div className="topbar-right">
          <span className="topbar-secure">
            <Icon name="shield" size={14} />{' '}
            <ShinyText text={adminStatus?.isAdmin ? 'ADMINISTRATOR' : 'SECURE ACCESS'} speed={3.5} />
          </span>
          <button className="signout-button" type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>
      <main id="top">
        <section className="intro-row" id="workspace">
          <div>
            <div className="eyebrow">OSINCT / INTEL WORKSPACE</div>
            <h1>
              <DecryptedText text="OSINCT — Intelligence Search Workspace" speed={24} />
            </h1>
            <p className="intro-copy">Enter a query, phone number, or authorized maintenance code to inspect the response.</p>
          </div>
        </section>
        {maintenance?.enabled && (
          <section className="maintenance-alert" role="alert">
            <span className="maintenance-alert-icon"><Icon name="alert" size={20} /></span>
            <div>
              <strong>Service temporarily unavailable</strong>
              <p>{maintenance.message}</p>
            </div>
          </section>
        )}

        {adminOpen && adminStatus?.isAdmin && (
          <section className="admin-panel" aria-labelledby="admin-title">
            <div className="admin-panel-header">
              <div>
                <div className="section-kicker">OSINCT / ADMIN</div>
                <h2 id="admin-title">Maintenance controls</h2>
                <p>Only the server-configured administrator can change these settings.</p>
              </div>
              <span className={maintenance?.enabled ? 'admin-status-pill is-maintenance' : 'admin-status-pill'}>
                <span />
                {maintenance?.enabled ? 'Maintenance on' : 'Service active'}
              </span>
            </div>
            {adminStatus === undefined ? (
              <p className="admin-info">Checking account permissions…</p>
            ) : !adminStatus.adminConfigured ? (
              <div className="admin-notice">
                <h3>Admin account not configured</h3>
                <p>To make the currently signed-in account the administrator, copy its account ID below and set it as the server-side Convex environment variable <code>OSINCT_ADMIN_USER_ID</code>.</p>
                <p><code>{adminStatus.userId ?? 'No authenticated account ID'}</code></p>
                <p className="admin-command">Run: <code>npx convex env set OSINCT_ADMIN_USER_ID "PASTE_ACCOUNT_ID_HERE"</code></p>
                <p>Only the project owner should run this command in a trusted environment.</p>
              </div>
            ) : !adminStatus.isAdmin ? (
              <div className="admin-notice">
                <h3>Administrator access required</h3>
                <p>This account can search but cannot change maintenance settings.</p>
              </div>
            ) : (
              <form className="admin-form" onSubmit={(event) => void saveMaintenance(event)}>
                <label className="maintenance-toggle">
                  <input
                    type="checkbox"
                    checked={maintenanceEnabledDraft}
                    onChange={(event) => setMaintenanceDraft({ enabled: event.target.checked, message: maintenanceMessageDraft })}
                  />
                  <span className="toggle-track"><span /></span>
                  <span>
                    <strong>Enable maintenance mode</strong>
                    <small>Blocks searches in this workspace. The API must enforce access independently.</small>
                  </span>
                </label>
                <label className="admin-message-label" htmlFor="maintenance-message">
                  Maintenance message <span>{maintenanceMessageDraft.length}/500</span>
                </label>
                <textarea
                  id="maintenance-message"
                  value={maintenanceMessageDraft}
                  onChange={(event) => setMaintenanceDraft({ enabled: maintenanceEnabledDraft, message: event.target.value })}
                  minLength={5}
                  maxLength={500}
                  rows={3}
                  required
                />
                <div className="admin-form-footer">
                  <p role="status" aria-live="polite">{maintenanceFeedback || 'Changes take effect when saved.'}</p>
                  <button className="admin-save-button" type="submit" disabled={maintenanceSaveBusy || maintenanceMessageDraft.trim().length < 5 || maintenanceMessageDraft.length > 500}>
                    {maintenanceSaveBusy ? 'Saving…' : 'Save settings'} <Icon name="arrow" size={15} />
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="search-panel" aria-labelledby="search-title">
          <div className="panel-topline">
            <div className="panel-heading">
              <div>
                <h2 id="search-title">Number Info</h2>
                <p>Enter a query or the authorized maintenance code.</p>
              </div>
            </div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void performSearch() }} noValidate>
            <label className="query-label" htmlFor="query">
              Query <span>Required</span>
            </label>
            <div className={isError && state.diagnostic === 'invalid_input' ? 'input-wrap input-error' : 'input-wrap'}>
              <Icon name="search" size={19} />
              <input
                ref={inputRef}
                id="query"
                name="query"
                value={query}
                onChange={(event) => { setQuery(event.target.value); if (state.status === 'error') setState({ status: 'idle' }) }}
                placeholder="Enter a query or maintenance code"
                autoComplete="off"
                spellCheck={false}
                maxLength={500}
                required
                disabled={loading}
                aria-invalid={isError && state.diagnostic === 'invalid_input'}
              />
              <button
                className="clear-input"
                type="button"
                onClick={() => { setQuery(''); setState({ status: 'idle' }); inputRef.current?.focus() }}
                aria-label="Clear query"
                disabled={!query || loading}
              >
                <Icon name="close" size={16} />
              </button>
              <button
                className="search-button"
                type="submit"
                disabled={loading || (maintenance?.enabled && query.trim() !== '192008') || (!liveEnabled && query.trim() !== '192008')}
              >
                {loading ? <><Icon name="spinner" size={16} /> Searching</> : maintenance?.enabled ? 'Unavailable' : <>Search <Icon name="arrow" size={17} /></>}
              </button>
            </div>
            <p className={maintenance?.enabled || isError ? 'form-message error-message' : 'form-hint'} role={isError || maintenance?.enabled ? 'alert' : undefined}>
              {maintenance?.enabled ? 'Search is disabled during maintenance.' : isError ? state.message : liveEnabled ? 'The API response is displayed as JSON and is not stored in Convex.' : 'Configure an authorized, non-sensitive API endpoint to enable requests.'}
            </p>
            {loading && (
              <div className="cancel-row">
                <span><span className="loading-dot" /> Request in progress</span>
                <button type="button" onClick={cancelSearch}>Cancel <Icon name="close" size={13} /></button>
              </div>
            )}
          </form>
        </section>

        <section ref={resultsContainerRef} className="results-section" aria-live="polite" aria-busy={loading}>
          <div className="results-heading stagger-target">
            <div>
              <h2>{state.status === 'success' ? 'API response' : isError ? 'Request failed' : loading ? 'Requesting…' : 'Response'}</h2>
            </div>
            {state.status === 'success' && (
              <div className="results-actions">
                <button
                  type="button"
                  className="copy-json-btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(JSON.stringify(state.response, null, 2))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? 'Copied payload' : 'Copy JSON'}
                </button>
              </div>
            )}
          </div>
          {maintenance?.enabled ? (
            <div className="maintenance-alert maintenance-alert-result stagger-target" role="alert">
              <span className="maintenance-alert-icon"><Icon name="alert" size={20} /></span>
              <div>
                <strong>Website is currently in maintenance mode</strong>
                <p>{maintenance.message || DEFAULT_MAINTENANCE_MESSAGE}</p>
              </div>
            </div>
          ) : state.status === 'idle' ? (
            <div className="empty-state stagger-target">
              <h3>No response yet</h3>
              <p>The actual JSON response will appear here after a successful request.</p>
            </div>
          ) : null}
          {loading && (
            <div className="loading-state stagger-target">
              <span className="loading-ring"><Icon name="spinner" size={24} /></span>
              <h3>Waiting for API response</h3>
            </div>
          )}
          {state.status === 'error' && (
            <div className="error-state stagger-target">
              <div className="error-state-icon"><Icon name="alert" size={20} /></div>
              <div className="error-state-content">
                <h3>Could not complete the request</h3>
                <p>{state.message}</p>
                <span className="diagnostic">{state.diagnostic ?? 'request_error'}</span>
              </div>
              {state.retryable && (
                <button type="button" onClick={() => void performSearch(state.query)} disabled={loading}>
                  <Icon name="refresh" size={14} /> Retry
                </button>
              )}
            </div>
          )}
          {state.status === 'success' && (
            <div className="api-response-wrapper stagger-target">
              <div className="payload-meta-bar">
                <span><Icon name="shield" size={13} /> JSON PAYLOAD</span>
                <span>{new Blob([JSON.stringify(state.response)]).size} BYTES</span>
              </div>
              <pre className="api-response" aria-label="Raw API JSON response">
                {JSON.stringify(state.response, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <a className="footer-brand" href="#top">osinct<span>.</span></a>
        <span>API workspace</span>
      </footer>
    </div>
  )
}

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  if (isLoading) return <div className="auth-loading"><span className="loading-ring"><Icon name="spinner" size={24} /></span><p>Checking secure access…</p></div>
  return (
    <ScreenTransition transitionKey={isAuthenticated ? 'workspace' : 'auth'}>
      {isAuthenticated ? <Workspace /> : <AuthScreen />}
    </ScreenTransition>
  )
}

export default App
