import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { login } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = React.useState('test');
  const [password, setPassword] = React.useState('password');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>MERN QA Eval</h1>
      <form onSubmit={submit} className="card">
        <label htmlFor="login-username">Username</label>
        <input id="login-username" data-testid="username" value={username} onChange={e => setUsername(e.target.value)} />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" data-testid="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button data-testid="login-btn" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
        {error && <div data-testid="login-error" className="error">{error}</div>}
      </form>
      <p>Default creds: test / password</p>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
