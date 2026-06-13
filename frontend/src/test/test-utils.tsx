import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

type RenderWithProvidersOptions = {
  queryClient?: QueryClient;
  routerProps?: MemoryRouterProps;
} & Omit<RenderOptions, 'wrapper'>;

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    queryClient = createTestQueryClient(),
    routerProps = { initialEntries: ['/'] },
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};
