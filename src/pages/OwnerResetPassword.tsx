import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function OwnerResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!supabase) { setError('Password recovery is not configured.'); return }
    if (password.length < 12) { setError('Use at least 12 characters for the new password.'); return }
    if (password !== confirmation) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) setError('This recovery link may have expired. Request a new owner password link and try again.')
      else setComplete(true)
    } catch {
      setError('Password could not be updated. Request a new owner recovery link and try again.')
    } finally { setBusy(false) }
  }

  return <main className="owner-login-page"><header className="login-top"><Link to="/owner" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Owner sign-in</Link><span className="brand-lockup"><span className="brand-monogram">PS</span><span><strong>PURITY SKIN</strong><small>OWNER WORKSPACE</small></span></span></header><section className="login-panel"><div className="login-icon"><LockKeyhole size={20} aria-hidden="true" /></div><p className="section-kicker">ACCOUNT RECOVERY</p><h1 aria-label="Choose a new password">Choose a new<br />password.</h1>{!supabase ? <p className="notice-block" role="status">Owner access is not connected yet. Password recovery is unavailable until the reviewed Supabase project is configured.</p> : complete ? <div className="page-stack"><p className="notice-block" role="status">Your password has been updated. Sign in using your new password.</p><Link className="button button-primary" to="/owner">Back to owner sign-in</Link></div> : <form className="login-form" onSubmit={submit}><p className="login-intro">Use a unique password of at least 12 characters. This link is for the invited owner account only.</p><label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary login-submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button><p className="login-footnote">Never share your recovery link or password. The shop and owner workspace use separate access.</p></form>}</section><footer className="login-footer">PURITY SKIN · Private owner access</footer></main>
}
