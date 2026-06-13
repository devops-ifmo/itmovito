import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import MainLayout from './MainLayout';

describe('MainLayout', () => {
  it('renders child route content inside main', () => {
    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<div>Page content</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
