import { test, vi, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BasePage from '../pages/basePage'
/**
 * @vitest-environment jsdom
 */

const { useRouter, mockedRouterPush } = vi.hoisted(() => {
  const mockedRouterPush = vi.fn();
  return {
      useRouter: () => ({ push: mockedRouterPush }),
      mockedRouterPush,
  };
});

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return {
      ...actual,
      useRouter,
  };
});

test('BasePage', () => {
  render(<BasePage />)
})

test('Connect Wallet', async () => {
  render(<BasePage />)
  const button = screen.getAllByRole('button', { name: 'Connect Wallet' })
  fireEvent.click(button[0])
  const modal = screen.queryByRole('dialog');
  expect(modal).not.toBeNull();
  const metaMaskButton = screen.getAllByRole('button', { name: 'MetaMask' })
  expect(metaMaskButton).not.toBeNull();
});

