import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
// Mock API used by Dashboard
vi.mock('../../api.js', () => ({
  getItems: vi.fn(async () => ({ items: [{ id: '1', text: 'Existing' }] })),
  addItem: vi.fn(async () => ({ item: { id: '2', text: 'New Item' } }))
}))
import * as api from '../../api.js'

describe('Dashboard component', () => {
  test('loads items and can add new item', async () => {
    const { default: Dashboard } = await import('../Dashboard.jsx')
    render(<Dashboard token="tok" onLogout={() => {}} />)

    // Initial load pulls from mocked getItems
    expect(await screen.findByTestId('items-list')).toBeInTheDocument()
    expect(screen.getByText('Existing')).toBeInTheDocument()

    // Add flow
    await userEvent.type(screen.getByTestId('item-input'), 'New Item')
    await userEvent.click(screen.getByTestId('add-btn'))

    // New item rendered
    expect(await screen.findByText('New Item')).toBeInTheDocument()

    // Assert calls
    expect(api.getItems).toHaveBeenCalled()
    expect(api.addItem).toHaveBeenCalledWith('tok', 'New Item')
  })
})
