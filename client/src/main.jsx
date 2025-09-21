import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import './styles.css'

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('token') || '');

  const handleLogin = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/app" /> : <Login onLogin={handleLogin} />} />
        <Route path="/app" element={token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />)
