import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import './App.css'
import { SearchError, type SearchMode, type SearchRecord, type SearchState } from './features/search/search.types.ts'
import { validateQuery } from './features/search/search.validation.ts'

const DEFAULT_MAINTENANCE_MESSAGE = 'The website is currently under maintenance. Please wait for service to resume.'

function Icon({ name, size = 18 }: { name: 'search' | 'arrow' | 'shield' | 'copy' | 'database' | 'clock' | 'check' | 'close' | 'alert' | 'refresh' | 'spinner' | 'phone' | 'id'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m18 6-12 12"/><path d="m6 6 12 12"/></>,
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2"/></>,
    spinner: <><path d="M21 12a9 9 0 1 1-6.2-8.6"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></>,
    id: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 5 0M13 10h5M13 14h5"/></>,
  }
  return <svg {...common} className={name === 'spinner' ? 'spin-icon' : undefined}>{paths[name]}</svg>
}

function RecordCard({ record, onCopy, copied }: { record: SearchRecord; onCopy: (value: string) => void; copied: boolean }) {
  const verified = record.status.toLowerCase() === 'verified'
  return <article className="record-card">
    <div className="record-top">
      <div className="record-symbol"><Icon name="database" size={19} /></div>
      <div className="record-title"><div className="record-id">{record.id}</div><h3>{record.title}</h3></div>
      <span className={verified ? 'status-pill verified' : 'status-pill review'}><span />{record.status}</span>
      <button className="copy-record" type="button" onClick={() => onCopy(record.id)} aria-label={`Copy record ID ${record.id}`} title={copied ? 'Copied' : 'Copy record ID'}>{copied ? <Icon name="check" size={16} /> : <Icon name="copy" size={16} />}</button>
    </div>
    <p className="record-description">{record.description}</p>
    <div className="record-details">
      <div><span>Category</span><strong>{record.category}</strong></div><div><span>Responsible team</span><strong>{record.owner}</strong></div><div><span>Region</span><strong>{record.region}</strong></div><div><span>Last updated</span><strong>{record.updatedAt}</strong></div>
    </div>
    <div className="record-bottom"><span><Icon name="check" size={14} /> Fictional demo record</span><button type="button" onClick={() => onCopy(record.id)}>{copied ? 'Copied' : 'Copy reference'} <Icon name={copied ? 'check' : 'copy'} size={14} /></button></div>
  </article>
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
    try {
      await signIn('password', formData)
    } catch {
      setError(flow === 'signIn'
        ? 'We could not sign you in with those details. Check your email and password, or create an account.'
        : 'We could not create the account. Use a valid email and a password with at least 8 characters.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-shell">
    <header className="auth-topbar"><a className="brand" href="#top" aria-label="Osinct home"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">osinct<span className="brand-period">.</span></span></a><span className="auth-secure-label">PRIVATE WORKSPACE · SIGN IN REQUIRED</span></header>
    <main className="auth-layout">
      <section className="auth-copy"><div className="eyebrow">OSINCT / SECURE ACCESS</div><h1>Good work starts with <span>clear access.</span></h1><p>Sign in to open your workspace. Search access follows the live service status.</p><div className="auth-note"><span className="env-dot" /> Account access is protected by Convex authentication.</div></section>
      <section className="auth-card" aria-labelledby="auth-title"><div className="auth-card-kicker">YOUR ACCOUNT</div><h2 id="auth-title">{flow === 'signIn' ? 'Welcome back' : 'Create an account'}</h2><p className="auth-card-description">{flow === 'signIn' ? 'Use your email and password to continue.' : 'Set up your Osinct login with an email and password.'}</p>
        <form onSubmit={(event) => void submit(event)} className="auth-form">
          <label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={16} /></button>
        </form>
        <div className="auth-switch">{flow === 'signIn' ? 'New to Osinct?' : 'Already have an account?'} <button type="button" onClick={() => { setFlow(flow === 'signIn' ? 'signUp' : 'signIn'); setError('') }} disabled={busy}>{flow === 'signIn' ? 'Create account' : 'Sign in instead'}</button></div>
        <p className="auth-footnote">Use an email address you control. Passwords are handled by the authentication service and are not stored by this page.</p>
      </section>
    </main>
    <footer className="auth-footer"><span>OSINCT · SECURE WORKSPACE</span><span>DEMO DATA ONLY</span></footer>
  </div>
}

function Workspace() {
  const convex = useConvex()
  const { signOut } = useAuthActions()
  const maintenance = useQuery(api.maintenance.getStatus, {})
  const adminStatus = useQuery(api.maintenance.getAdminStatus, {})
  const updateMaintenance = useMutation(api.maintenance.updateStatus)
  const [mode, setMode] = useState<SearchMode>('phone')
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const [copyMessage, setCopyMessage] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [maintenanceDraft, setMaintenanceDraft] = useState<{ enabled: boolean; message: string } | null>(null)
  const [maintenanceSaveBusy, setMaintenanceSaveBusy] = useState(false)
  const [maintenanceFeedback, setMaintenanceFeedback] = useState('')
  const activeController = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const maintenanceEnabledDraft = maintenanceDraft?.enabled ?? maintenance?.enabled ?? false
  const maintenanceMessageDraft = maintenanceDraft?.message ?? maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE

  useEffect(() => () => activeController.current?.abort(), [])

  async function saveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMaintenanceSaveBusy(true)
    setMaintenanceFeedback('')
    try {
      const nextSettings = { enabled: maintenanceEnabledDraft, message: maintenanceMessageDraft }
      if (nextSettings.enabled) {
        activeController.current?.abort()
        activeController.current = null
        setState({ status: 'idle' })
      }
      await updateMaintenance(nextSettings)
      setMaintenanceDraft(nextSettings)
      setMaintenanceFeedback('Maintenance settings saved.')
    } catch (cause) {
      setMaintenanceFeedback(cause instanceof Error ? cause.message : 'Could not save the settings. Check admin access and try again.')
    } finally {
      setMaintenanceSaveBusy(false)
    }
  }

  async function performSearch(nextQuery = query, nextMode = mode) {
    if (maintenance?.enabled) {
      setState({ status: 'idle' })
      return
    }
    if (activeController.current) return
    const controller = new AbortController()
    activeController.current = controller
    setCopyMessage('')
    setState({ status: 'loading', mode: nextMode })
    try {
      const validatedQuery = validateQuery(nextMode, nextQuery)
      const records = await convex.query(api.search.searchRecords, { mode: nextMode, query: validatedQuery })
      if (controller.signal.aborted || activeController.current !== controller) return
      setState(records.length ? { status: 'success', records, mode: nextMode, query: nextQuery.trim() } : { status: 'empty', mode: nextMode, query: nextQuery.trim() })
    } catch (cause) {
      if (controller.signal.aborted || activeController.current !== controller) return
      if (maintenance?.enabled || (cause instanceof Error && cause.message.includes('MAINTENANCE:'))) {
        setState({ status: 'idle' })
        return
      }
      const error = cause instanceof SearchError ? cause : new SearchError('network', 'Something unexpected interrupted the search. Try again.', { retryable: true })
      setState({ status: 'error', message: error.message, retryable: error.retryable, mode: nextMode, query: nextQuery.trim(), diagnostic: `${error.code}${error.status ? ` · HTTP ${error.status}` : ''}` })
    } finally {
      if (activeController.current === controller) activeController.current = null
    }
  }

  function cancelSearch() {
    activeController.current?.abort()
    activeController.current = null
    setState({ status: 'idle' })
  }

  function changeMode(nextMode: SearchMode) {
    activeController.current?.abort()
    activeController.current = null
    setMode(nextMode)
    setQuery('')
    setState({ status: 'idle' })
    setCopyMessage('')
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function copyValue(value: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const temporary = document.createElement('textarea')
        temporary.value = value
        temporary.setAttribute('readonly', '')
        temporary.style.position = 'fixed'
        temporary.style.opacity = '0'
        document.body.append(temporary)
        temporary.select()
        const copied = document.execCommand('copy')
        temporary.remove()
        if (!copied) throw new Error('Clipboard unavailable')
      }
      setCopyMessage(`Copied ${value}`)
    } catch {
      setCopyMessage('Copy is unavailable in this browser. Select the record ID and copy it manually.')
    }
  }

  const loading = state.status === 'loading'
  const isError = state.status === 'error'
  const liveSelected = false
  const liveEnabled = false
  const copiedId = copyMessage.startsWith('Copied ') ? copyMessage.slice(7) : ''
  const quickSearches = mode === 'phone'
    ? [{ label: '202-555-0101', value: '202-555-0101' }, { label: '202-555-0102', value: '202-555-0102' }]
    : [{ label: 'DEMO-ID-0001', value: 'DEMO-ID-0001' }, { label: 'DEMO-ID-0002', value: 'DEMO-ID-0002' }]

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Osinct home"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">osinct<span className="brand-period">.</span></span></a>
      <nav className="topnav" aria-label="Main navigation"><a className="nav-active" href="#workspace">Workspace</a><a href="#about">About</a><button className={adminOpen ? 'nav-button nav-button-active' : 'nav-button'} type="button" onClick={() => setAdminOpen(!adminOpen)}>Admin dashboard</button></nav>
      <div className="topbar-right"><span className="env-dot" /><span>Demo mode</span><span className="topbar-divider" /><span className="topbar-secure"><Icon name="shield" size={14} /> Signed in</span><button className="signout-button" type="button" onClick={() => void signOut()}>Sign out</button></div>
    </header>

    <main id="top">
      <section className="intro-row" id="workspace"><div><div className="eyebrow">OSINCT / RECORD SEARCH</div><h1>Search records</h1><p className="intro-copy">Search the local demo index, or connect an authorized data source.</p></div><div className="intro-meta"><span className="env-dot" /><div><strong>{liveEnabled ? 'API adapter enabled' : 'Demo data only'}</strong><span>{liveEnabled ? 'Check your configured service before use' : 'Uses fictional sample records'}</span></div></div></section>

      {maintenance?.enabled && <section className="maintenance-alert" role="alert" aria-live="assertive"><span className="maintenance-alert-icon"><Icon name="alert" size={20} /></span><div><strong>Service temporarily unavailable</strong><p>{maintenance.message}</p></div><span className="maintenance-live">MAINTENANCE</span></section>}

      {adminOpen && <section className="admin-panel" aria-labelledby="admin-title">
        <div className="admin-panel-header"><div><div className="section-kicker">OSINCT / CONTROL PLANE</div><h2 id="admin-title">Maintenance controls</h2><p>Pause all search requests and publish a message to signed-in users.</p></div><span className={maintenance?.enabled ? 'admin-status-pill is-maintenance' : 'admin-status-pill'}><span />{maintenance?.enabled ? 'Maintenance on' : 'Service active'}</span></div>
        {adminStatus === undefined ? <p className="admin-info">Checking account permissions…</p> : !adminStatus.adminConfigured ? <div className="admin-notice"><h3>Admin access needs setup</h3><p>For security, admin rights are tied to a specific Convex user ID—not an unverified email address. Sign in with the account that should own Osinct, then set <code>OSINCT_ADMIN_USER_ID</code> on this Convex deployment to the ID below.</p><div className="admin-id-row"><code>{adminStatus.userId ?? 'No authenticated user ID'}</code>{adminStatus.userId && <button type="button" onClick={() => void copyValue(adminStatus.userId!)}>Copy account ID</button>}</div><p className="admin-command">Run in the project folder: <code>npx convex env set OSINCT_ADMIN_USER_ID "{adminStatus.userId ?? 'YOUR_USER_ID'}"</code></p></div> : !adminStatus.isAdmin ? <div className="admin-notice"><h3>This account is not an administrator</h3><p>Only the account configured by the project owner can change maintenance settings. Your account ID is shown for reference.</p><div className="admin-id-row"><code>{adminStatus.userId ?? 'No authenticated user ID'}</code>{adminStatus.userId && <button type="button" onClick={() => void copyValue(adminStatus.userId!)}>Copy account ID</button>}</div></div> : <form className="admin-form" onSubmit={(event) => void saveMaintenance(event)}>
          <label className="maintenance-toggle"><input type="checkbox" checked={maintenanceEnabledDraft} onChange={(event) => setMaintenanceDraft({ enabled: event.target.checked, message: maintenanceMessageDraft })} /><span className="toggle-track"><span /></span><span><strong>Enable maintenance mode</strong><small>When enabled, the backend rejects every search request.</small></span></label>
          <label className="admin-message-label" htmlFor="maintenance-message">Maintenance message <span>{maintenanceMessageDraft.length}/500</span></label>
          <textarea id="maintenance-message" value={maintenanceMessageDraft} onChange={(event) => setMaintenanceDraft({ enabled: maintenanceEnabledDraft, message: event.target.value })} minLength={5} maxLength={500} rows={3} required />
          <div className="admin-form-footer"><p role="status" aria-live="polite">{maintenanceFeedback || 'Changes take effect as soon as they are saved.'}</p><button className="admin-save-button" type="submit" disabled={maintenanceSaveBusy || maintenanceMessageDraft.trim().length < 5 || maintenanceMessageDraft.length > 500}>{maintenanceSaveBusy ? 'Saving…' : 'Save settings'} <Icon name="arrow" size={15} /></button></div>
        </form>}
      </section>}

      <section className="search-panel" aria-labelledby="search-title"><div className="panel-topline"><div className="panel-heading"><div><h2 id="search-title">Search</h2><p>Choose a field and enter a value.</p></div></div><span className="demo-badge">{liveEnabled ? 'API ENABLED' : liveSelected ? 'API DISABLED' : 'DEMO MODE'}</span></div>
        <form onSubmit={(event) => { event.preventDefault(); void performSearch() }} noValidate>
          <fieldset className="mode-fieldset"><legend>Search type</legend><div className="mode-switch">
            <button className={mode === 'phone' ? 'mode-option selected' : 'mode-option'} type="button" onClick={() => changeMode('phone')} aria-pressed={mode === 'phone'} disabled={loading || maintenance?.enabled}><span className="mode-icon"><Icon name="phone" size={16} /></span><span>Phone number</span>{mode === 'phone' && <span className="mode-check"><Icon name="check" size={13} /></span>}</button>
            <button className={mode === 'identity' ? 'mode-option selected' : 'mode-option'} type="button" onClick={() => changeMode('identity')} aria-pressed={mode === 'identity'} disabled={loading || maintenance?.enabled}><span className="mode-icon"><Icon name="id" size={16} /></span><span>Identity reference</span>{mode === 'identity' && <span className="mode-check"><Icon name="check" size={13} /></span>}</button>
          </div></fieldset>
          <label className="query-label" htmlFor="query">Search query <span>Required</span></label>
          <div className={isError && state.diagnostic === 'invalid_input' ? 'input-wrap input-error' : 'input-wrap'}><Icon name="search" size={19} /><input ref={inputRef} id="query" name="query" value={query} onChange={(event) => { setQuery(event.target.value); if (state.status === 'error') setState({ status: 'idle' }) }} placeholder={mode === 'phone' ? 'Try 202-555-0101 (fictional demo value)' : 'Try DEMO-ID-0001 (fictional reference)'} autoComplete="off" spellCheck={false} maxLength={80} required aria-invalid={isError && state.diagnostic === 'invalid_input'} aria-describedby="query-help" disabled={loading || maintenance?.enabled} /><button className="clear-input" type="button" onClick={() => { setQuery(''); setState({ status: 'idle' }); setCopyMessage(''); inputRef.current?.focus() }} aria-label="Clear search" disabled={!query || loading || maintenance?.enabled}><Icon name="close" size={16} /></button><button className="search-button" type="submit" disabled={loading || maintenance?.enabled}>{loading ? <><Icon name="spinner" size={16} /> Searching</> : maintenance?.enabled ? 'Unavailable' : <>Search <Icon name="arrow" size={17} /></>}</button></div>
          <p className={maintenance?.enabled ? 'form-message error-message' : isError ? 'form-message error-message' : 'form-hint'} id="query-help" role={isError || maintenance?.enabled ? 'alert' : undefined}>{maintenance?.enabled ? 'Search is disabled while maintenance mode is active.' : isError ? state.message : <><Icon name="shield" size={14} /> Searches use fictional sample records. Live personal-record lookup is not connected.</>}</p>
          {loading && <div className="cancel-row"><span><span className="loading-dot" /> Search in progress</span><button type="button" onClick={cancelSearch}>Cancel request <Icon name="close" size={13} /></button></div>}
        </form>
        <div className="suggestion-row"><span>QUICK TRY</span>{quickSearches.map((item) => <button type="button" key={item.value} disabled={loading || maintenance?.enabled} onClick={() => { setQuery(item.value); void performSearch(item.value, mode) }}>{item.label} <Icon name="arrow" size={12} /></button>)}</div>
      </section>

      <section className="results-section" aria-live="polite" aria-busy={loading}><div className="results-heading"><div><h2>{state.status === 'success' ? 'Results' : state.status === 'empty' ? 'No matching records' : isError ? 'Search failed' : loading ? 'Searching…' : 'Results'}</h2></div>{state.status === 'success' && <span className="result-count">{state.records.length} {state.records.length === 1 ? 'match' : 'matches'}</span>}</div>
        {state.status === 'idle' && <div className="empty-state"><h3>No search yet</h3><p>Results will appear here after you run a search.</p></div>}
        {loading && <div className="loading-state"><span className="loading-ring"><Icon name="spinner" size={24} /></span><h3>Searching the selected source</h3><p>Your query stays in this page; it is not added to analytics or search history.</p></div>}
        {state.status === 'empty' && <div className="no-results"><div className="no-results-icon"><Icon name="search" size={21} /></div><div><h3>No matching demo records</h3><p>Nothing in the synthetic index matches this query. Check the value or try a sample above.</p></div><button type="button" onClick={() => { setQuery(''); setState({ status: 'idle' }); inputRef.current?.focus() }}>Clear search</button></div>}
        {state.status === 'error' && <div className="error-state"><div className="error-state-icon"><Icon name="alert" size={20} /></div><div className="error-state-content"><h3>We couldn’t complete that search</h3><p>{state.message}</p><span className="diagnostic">Diagnostic: {state.diagnostic ?? 'search_error'}</span></div>{state.retryable && <button type="button" onClick={() => void performSearch(state.query, state.mode)} disabled={loading || maintenance?.enabled}><Icon name="refresh" size={14} /> Retry</button>}</div>}
        {state.status === 'success' && <div className="record-list">{state.records.map((record) => <RecordCard key={record.id} record={record} copied={copiedId === record.id} onCopy={(value) => void copyValue(value)} />)}</div>}
      </section>

      <div className="copy-announcement" role="status" aria-live="polite">{copyMessage}</div>
      <section className="trust-strip" id="about"><div><strong>Data source</strong><p>{liveEnabled ? 'The configured API adapter is enabled. Confirm that the endpoint is authorized and returns the expected schema.' : 'This build searches fictional sample records only. A live source needs an authorized API and a verified response format.'}</p></div></section>
    </main>

    <footer className="footer"><a className="footer-brand" href="#top">osinct<span>.</span></a><span>Search workspace <i>·</i> Build 0.2.0</span><span className="footer-right"><span className="footer-status" /> {liveEnabled ? 'API adapter enabled' : liveSelected ? 'Live adapter disabled' : 'Demo data only'}</span></footer>
  </div>
}

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  if (isLoading) return <div className="auth-loading"><span className="loading-ring"><Icon name="spinner" size={24} /></span><p>Checking secure access…</p></div>
  return isAuthenticated ? <Workspace /> : <AuthScreen />
}

export default App
