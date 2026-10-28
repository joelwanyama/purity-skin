import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

type Props = { configurationMissing?: boolean }
type LoginMode = 'sign-in' | 'reset'

export function OwnerLogin({ configurationMissing = false }: Props) {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<LoginMode>('sign-in')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function chooseMode(next: LoginMode) { setMode(next); setError(''); setSuccess('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setSuccess(''); setPending(true)
    try {
      if (mode === 'reset') {
        const result = await resetPassword(email.trim())
        if (result) setError('Password recovery could not be started. Try again or contact the account administrator.')
        else setSuccess('If an owner account uses that email, a password recovery link has been sent.')
      } else {
        const result = await signIn(email.trim(), password)
        if (result) setError('We could not sign you in. Check the email and password, then try again.')
      }
    } catch {
      setError(mode === 'reset' ? 'Password recovery could not be started. Try again or contact the account administrator.' : 'We could not sign you in. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return <main className="owner-login-page">
    <header className="login-top"><Link to="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to the shop</Link><span className="brand-lockup"><span className="brand-monogram">PS</span><span><strong>PURITY SKIN</strong><small>OWNER WORKSPACE</small></span></span></header>
    <section className="login-panel" aria-labelledby="login-heading">
      <div className="login-icon"><LockKeyhole size={20} aria-hidden="true" /></div>
      <p className="section-kicker">PRIVATE BUSINESS ACCESS</p>
      <h1 id="login-heading">{mode === 'reset' ? <>Reset your<br />password.</> : <>Sign in to manage<br />PURITY SKIN.</>}</h1>
      <p className="login-intro">This area is for the business owner. Customers can browse the shop without signing in.</p>
      {configurationMissing ? <div className="notice-block" role="status"><strong>Owner access is not connected yet.</strong><span>Connect Supabase and apply the reviewed database migration before creating or signing in to a business account.</span></div> : <form className="login-form" onSubmit={submit}>
        {mode === 'reset' && <p className="form-hint">Enter the verified owner email. For privacy, the confirmation does not reveal whether an account exists.</p>}
        <label className="field"><span>Owner email address</span><input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {mode === 'sign-in' && <label className="field"><span>Password</span><span className="password-wrap"><input type={show ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /><button type="button" className="reveal-button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="notice-block" role="status">{success}</p>}
        <button className="button button-primary login-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : mode === 'reset' ? 'Send recovery link' : 'Sign in securely'}</button>
        {mode === 'sign-in' ? <button type="button" className="button-quiet" onClick={() => chooseMode('reset')}>Forgot your password?</button> : <button type="button" className="button-quiet" onClick={() => chooseMode('sign-in')}>Back to owner sign-in</button>}
        {mode === 'sign-in' && <p className="login-footnote">No customer sign-up is available here. If you need owner access, contact the account administrator.</p>}
      </form>}
    </section>
    <footer className="login-footer">Your customer-facing shop stays separate from this private workspace.</footer>
  </main>
}
