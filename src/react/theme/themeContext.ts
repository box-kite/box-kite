import React from 'react';
import assertClientRuntime from '../clientRuntime';

interface ThemeContextProps {
  theme: string;
  setTheme(theme: string | null): void;
  design?: string;
  setDesign(design: string | null): void;
}

// The first client-only React API the client entry touches, so this is where a server graph that
// reached it becomes a legible error instead of `createContext is not a function`.
assertClientRuntime(React);

const ThemeContext = React.createContext<ThemeContextProps>({ theme: '', setTheme: () => {}, setDesign: () => {} });

export default ThemeContext;
