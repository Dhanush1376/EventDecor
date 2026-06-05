import { createContext, useContext } from 'react';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. If this occurred during development, please restart your Vite dev server and refresh your browser to resolve Vite HMR desync.',
    );
  }
  return context;
};
