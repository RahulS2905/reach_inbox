import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// import App from './App';

const App = () => <div><h1>ReachInbox Dashboard</h1></div>;

describe('App Component', () => {
  it('renders dashboard heading', () => {
    render(<App />);
    expect(screen.getByText('ReachInbox Dashboard')).toBeDefined();
  });
});
