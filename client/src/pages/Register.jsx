import React from 'react';
import PropTypes from 'prop-types';
import { register as registerApi } from '../api.js';

export default function Register({ onRegister }) {
  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await registerApi(name, username, password);
      onRegister?.(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Create account</h1>
      <form onSubmit={submit} className="card">
        <label htmlFor="reg-name">Name</label>
        <input id="reg-name" data-testid="name" value={name} onChange={e => setName(e.target.value)} />
        <label htmlFor="reg-username">Username</label>
        <input id="reg-username" data-testid="reg-username" value={username} onChange={e => setUsername(e.target.value)} />
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" data-testid="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button data-testid="register-btn" disabled={loading}>
          {loading ? 'Registering…' : 'Register'}
        </button>
        {error && <div data-testid="register-error" className="error">{error}</div>}
      </form>
    </div>
  );
}

Register.propTypes = {
  onRegister: PropTypes.func,
};
