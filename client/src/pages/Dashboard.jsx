import React from 'react';
import PropTypes from 'prop-types';
import { getItems, addItem } from '../api.js';

export default function Dashboard({ token, onLogout }) {
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getItems(token);
      setItems(data.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { item } = await addItem(token, text);
    setItems(prev => [...prev, item]);
    setText('');
  };

  return (
    <div className="container">
      <div className="row">
        <h2>Dashboard</h2>
        <button data-testid="logout" className="link" onClick={onLogout}>Logout</button>
      </div>
      {loading ? (
        <div data-testid="loading">Loading…</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <form onSubmit={add} className="row">
            <input data-testid="item-input" placeholder="Add new item" value={text} onChange={e => setText(e.target.value)} />
            <button data-testid="add-btn">Add</button>
          </form>
          <ul data-testid="items-list">
            {items.map(i => (<li key={i.id} className="item" data-testid="item">{i.text}</li>))}
          </ul>
        </>
      )}
    </div>
  );
}

Dashboard.propTypes = {
  token: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};
