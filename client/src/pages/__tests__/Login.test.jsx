import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
// Mock the API module used by the component
vi.mock('../../api.js', () => ({
  login: vi.fn(async () => ({ token: 'tok_123', user: { id: 1, name: 'Test User' } }))
}))
import Login from '../Login.jsx'
import * as api from '../../api.js'

describe('Login component', () => {
  test('renders with default creds and button', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    // Inputs prefilled
    const username = screen.getByTestId('username')
    const password = screen.getByTestId('password')
    expect(username).toHaveValue('test')
    expect(password).toHaveValue('password')

    // Button exists
    expect(screen.getByTestId('login-btn')).toBeInTheDocument()
  })

  test('submits and calls onLogin on success', async () => {
    const token = 'tok_123'
    const onLogin = vi.fn()
    // Ensure mocked login returns expected token
    api.login.mockResolvedValueOnce({ token, user: { id: 1, name: 'Test User' } })

    render(<Login onLogin={onLogin} />)

    await userEvent.click(screen.getByTestId('login-btn'))

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(token))
  })
})
