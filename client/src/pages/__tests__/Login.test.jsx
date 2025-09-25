import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
// Mock the API module used by the component
vi.mock('../../api.js', () => ({
  login: vi.fn(async () => ({ token: 'tok_123', user: { id: 1, name: 'Test User' } }))
}))
import Login from '../Login.jsx'
import * as api from '../../api.js'

describe('Login component', () => {
  // Initial render test intentionally removed at user request.
  // (Previously validated default credential prefill and button presence.)

  test('submits and calls onLogin on success', async () => {
    const token = 'tok_123'
    const onLogin = vi.fn()
    // Ensure mocked login returns expected token
    api.login.mockResolvedValueOnce({ token, user: { id: 1, name: 'Test User' } })

    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByTestId('login-btn'))

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(token))
  })
})
