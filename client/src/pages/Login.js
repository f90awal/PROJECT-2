import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/axios';
import { FiAlertCircle, FiCheckCircle, FiHexagon } from 'react-icons/fi';

export default function Login() {
  const [tab, setTab] = useState('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAffiliation, setRegAffiliation] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!regAffiliation) { setError('Please select an affiliation.'); return; }
    setLoading(true);
    try {
      await authAPI.post('/register', {
        name: regName,
        email: regEmail,
        password: regPassword,
        affiliation: regAffiliation,
        role: 'admin',
      });
      setSuccess('Account created! You can now sign in.');
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegAffiliation('');
      setTab('login');
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data?.errors) || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <FiHexagon size={28} color="#fff" />
          </div>
          <h1>AXIOM Command</h1>
          <p>Crisis Coordination &amp; Dispatch Operations</p>
        </div>

        <div className="filter-tabs" style={{ marginBottom: 24 }}>
          <button type="button" className={`filter-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>
            Sign In
          </button>
          <button type="button" className={`filter-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess(''); }}>
            Create Account
          </button>
        </div>

        {error && (
          <div className="error-msg">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <FiCheckCircle size={16} /> {success}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your official email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 8 }}
              disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your full name" value={regName}
                onChange={e => setRegName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Affiliation *</label>
              <select value={regAffiliation} onChange={e => setRegAffiliation(e.target.value)} required>
                <option value="">Select your service</option>
                <option value="hospital">Hospital / Medical</option>
                <option value="fire">Fire Service</option>
                <option value="police">Police Service</option>
                <option value="system">System / Operations</option>
              </select>
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" placeholder="Official email address" value={regEmail}
                onChange={e => setRegEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password * <span style={{ fontSize: 11, color: '#aaa' }}>(min 8 characters)</span></label>
              <input type="password" placeholder="Choose a strong password" value={regPassword}
                onChange={e => setRegPassword(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 8 }}
              disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 24, letterSpacing: '0.3px' }}>
          AXIOM v2 · Restricted system · Authorized operators only
        </p>
      </div>
    </div>
  );
}
