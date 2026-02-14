import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import api from '../api/client.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestTimeoutMs = 20000;
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(() => String(location.state?.email || ''));
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resolveRequestError = (err, fallbackMessage) => {
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    return err.response?.data?.message || fallbackMessage;
  };

  const handleSendCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email }, { timeout: requestTimeoutMs });
      setStep('verify');
      setMessage(
        response.data?.message || 'If that email exists, a verification code has been sent.'
      );
    } catch (err) {
      setError(resolveRequestError(err, 'Could not send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email }, { timeout: requestTimeoutMs });
      setMessage(
        response.data?.message || 'If that email exists, a verification code has been sent.'
      );
    } catch (err) {
      setError(resolveRequestError(err, 'Could not resend verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code,
        newPassword
      }, { timeout: requestTimeoutMs });
      setMessage(response.data?.message || 'Password reset successful. Redirecting...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(resolveRequestError(err, 'Could not reset password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (event) => {
    const nextCode = event.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(nextCode);
  };

  return (
    <Layout variant="auth">
      <div className="auth-card">
        {step === 'request' ? (
          <>
            <h1>Reset password</h1>
            <p className="internal-note">
              Enter your account email and we will send a 6-digit verification code.
            </p>
            {error && <div className="alert">{error}</div>}
            {message && <div className="alert">{message}</div>}
            <form className="form" onSubmit={handleSendCode}>
              <label>
                Account email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send verification code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Verify code</h1>
            <p className="internal-note">Enter the code sent to your email and choose a new password.</p>
            {error && <div className="alert">{error}</div>}
            {message && <div className="alert">{message}</div>}
            <form className="form" onSubmit={handleReset}>
              <label>
                Account email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                Verification code
                <input
                  value={code}
                  onChange={handleCodeChange}
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
              </label>
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
            <button className="btn ghost" type="button" onClick={handleResendCode} disabled={loading}>
              Resend code
            </button>
          </>
        )}
        <p className="auth-footer">
          Back to <Link to="/login">Login</Link>
        </p>
      </div>
    </Layout>
  );
}
