import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Design from './design';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Design>
      <App />
    </Design>
  </StrictMode>,
);
