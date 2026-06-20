import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { ProductListing } from '../ProductListing';

// Mock all external contexts and hooks to isolate URL sync logic
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({ setClaimedCoupon: vi.fn(), cartCount: 0, setIsCartOpen: vi.fn() }),
}));

vi.mock('../../context/WishlistContext', () => ({
  useWishlist: () => ({ items: [], addItem: vi.fn(), removeItem: vi.fn() }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock('../../hooks/useProductQueries', () => ({
  useProducts: vi.fn(() => ({
    data: { products: [], totalCount: 0, totalPages: 1 },
    isLoading: false,
    isFetching: false,
    isError: false,
  })),
  useCategories: vi.fn(() => ({ data: ['Decor', 'Lighting'] })),
  useDynamicFilters: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../hooks/useVisualSearch', () => ({
  useVisualSearch: () => ({
    results: null,
    open: vi.fn(),
    handleImageSelect: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useWebsiteContent', () => ({
  useWebsiteContent: () => ({}),
}));

vi.mock('../../hooks/useScrollDirection', () => ({
  useScrollDirection: () => ({ scrollDirection: 'up', isAtTop: true }),
}));

vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}));

// A test component to observe and manipulate URL search params from outside ProductListing
function TestWrapper({ initialUrl = '/collections' }) {
  return (
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/collections" element={<ProductListing />} />
      </Routes>
      <UrlObserver />
    </MemoryRouter>
  );
}

function UrlObserver() {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div data-testid="url-observer">
      <div data-testid="search-param">{searchParams.get('search') || ''}</div>
      <div data-testid="category-param">{searchParams.get('category') || ''}</div>
      <div data-testid="page-param">{searchParams.get('page') || ''}</div>
      <button
        data-testid="external-update-url"
        onClick={() => setSearchParams({ search: 'external', category: 'Decor', page: '2' })}
      >
        Update URL Externally
      </button>
    </div>
  );
}

describe('ProductListing URL Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with URL parameters correctly', async () => {
    render(<TestWrapper initialUrl="/collections?search=floral&category=Decor&page=3" />);

    // Check if the search bar input was populated from URL
    const searchInput = await screen.findByPlaceholderText(/Search masterworks/i);
    expect(searchInput.value).toBe('floral');

    // The observer should reflect the URL
    expect(screen.getByTestId('search-param').textContent).toBe('floral');
    expect(screen.getByTestId('category-param').textContent).toBe('Decor');
  });

  it('updates URL when search input is typed (debounced)', async () => {
    render(<TestWrapper initialUrl="/collections" />);

    const searchInput = screen.getByPlaceholderText(/Search masterworks/i);
    fireEvent.change(searchInput, { target: { value: 'mandap' } });

    // Should not update URL immediately due to debounce
    expect(screen.getByTestId('search-param').textContent).toBe('');

    // Wait for debounce (400ms in ProductListing)
    await waitFor(
      () => {
        expect(screen.getByTestId('search-param').textContent).toBe('mandap');
      },
      { timeout: 1000 },
    );
  });

  it('updates local state when URL changes externally (Browser Back/Forward)', async () => {
    render(<TestWrapper initialUrl="/collections?search=initial" />);

    const searchInput = screen.getByPlaceholderText(/Search masterworks/i);
    expect(searchInput.value).toBe('initial');

    // Simulate clicking a back button or link that changes URL
    const externalBtn = screen.getByTestId('external-update-url');
    fireEvent.click(externalBtn);

    // Wait for the local state to sync with the new URL
    await waitFor(() => {
      expect(searchInput.value).toBe('external');
    });
  });
});
