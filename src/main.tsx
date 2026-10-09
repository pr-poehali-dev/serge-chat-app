import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initAppearance } from './hooks/use-appearance'

initAppearance();

createRoot(document.getElementById("root")!).render(<App />);