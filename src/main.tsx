import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { httpBackend } from './infrastructure/http-backend';
import { liveSocket } from './infrastructure/live-socket';
import { App } from './ui/App';
import { ServicesProvider } from './ui/backend-context';
import { applyTheme, rememberedTheme } from './ui/theme/apply-theme';
import { ThemeProvider, THEMES } from './ui/theme/themes';
import './ui/theme/tokens.css';
import './ui/theme/global.css';

// The device's last theme goes on <html> before the first render, so the app opens in it; the
// member's stored theme replaces it once loaded (ADR-012).
const theme = rememberedTheme();
applyTheme(theme, THEMES[theme].favicon);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider backend={httpBackend()} live={liveSocket()}>
      <ThemeProvider initial={theme}>
        <App />
      </ThemeProvider>
    </ServicesProvider>
  </StrictMode>,
);
