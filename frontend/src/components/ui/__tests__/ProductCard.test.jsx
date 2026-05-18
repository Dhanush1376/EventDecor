import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from '../ProductCard';
import { BrowserRouter } from 'react-router-dom';
import { WishlistProvider } from '../../../context/WishlistContext';
import { CartProvider } from '../../../context/CartContext';

// Mock dependencies
vi.mock('../../../context/WishlistContext', () => ({
  useWishlist: () => ({
    toggleItem: vi.fn(),
    isWishlisted: () => false,
  }),
  WishlistProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../context/CartContext', () => ({
  useCart: () => ({
    addItem: vi.fn(),
  }),
  CartProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    runProtectedAction: (action) => action(),
  }),
}));

const mockProduct = {
  id: '1',
  title: 'Luxury Varma Decor',
  teluguTitle: 'లగ్జరీ వర్మ డెకార్',
  price: 5000,
  category: 'Traditional',
  imageSrc: '/test.jpg',
};

describe('ProductCard Component', () => {
  it('renders product information correctly', () => {
    render(
      <BrowserRouter>
        <ProductCard {...mockProduct} />
      </BrowserRouter>
    );

    expect(screen.getByText('Luxury Varma Decor')).toBeInTheDocument();
    expect(screen.getByText('Traditional')).toBeInTheDocument();
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
  });

  it('shows skeleton when loading is true', () => {
    render(
      <BrowserRouter>
        <ProductCard loading={true} />
      </BrowserRouter>
    );
    
    // Check for animate-pulse class which is in the loading state
    const loadingSkeleton = document.querySelector('.animate-pulse');
    expect(loadingSkeleton).toBeInTheDocument();
  });
});
