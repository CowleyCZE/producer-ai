import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../shared/theme/ThemeContext';
import ThemeSwitch from '../shared/ui/ThemeSwitch';

describe('ThemeSwitch', () => {
  it('uses button semantics and exposes pressed state', () => {
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>,
    );

    const switchButton = screen.getByRole('button', { name: /switch to/i });
    expect(switchButton).toHaveAttribute('type', 'button');
    const initialPressed = switchButton.getAttribute('aria-pressed');
    expect(initialPressed === 'true' || initialPressed === 'false').toBe(true);

    fireEvent.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-pressed', initialPressed === 'true' ? 'false' : 'true');
  });
});
