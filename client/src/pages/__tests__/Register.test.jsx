import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
vi.mock('../../api.js', () => ({
  register: vi.fn(async () => ({ token: 'tok_abc', user: { id: 'u1', name: 'New User' } }))
}))
import Register from '../Register.jsx'
import * as api from '../../api.js'

describe('Register component', () => {
  test('submits and calls onRegister on success', async () => {
    const token = 'tok_abc'
    const onRegister = vi.fn()
    api.register.mockResolvedValueOnce({ token, user: { id: 'u1', name: 'New User' } })

    render(<Register onRegister={onRegister} />)

    await userEvent.type(screen.getByTestId('name'), 'New User')
    await userEvent.type(screen.getByTestId('reg-username'), 'newuser')
    await userEvent.type(screen.getByTestId('reg-password'), 'secret')

    await userEvent.click(screen.getByTestId('register-btn'))

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith(token))
  })
})
