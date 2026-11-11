// The app's line icons, drawn on a 24-unit grid in the current text color. The size comes from the
// `.icon` class (--size-icon); they are decorative, so the text next to them names the action.
const PATHS = {
  today: 'M20 6 9 17l-5-5',
  shop: 'M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  chevron: 'M6 9l6 6 6-6',
  pause: 'M9 5v14M15 5v14',
  play: 'M7 5v14l12-7L7 5Z',
} as const;

export type IconName = keyof typeof PATHS;

// The gold coin, 8-bit: an 8x8 grid of square pixels in the current text color.
const COIN_PIXELS = 'M2 0h4v1H2zM1 1h1v1H1zM6 1h1v1H6zM0 2h1v4H0zM7 2h1v4H7zM3 2h2v4H3zM1 6h1v1H1zM6 6h1v1H6zM2 7h4v1H2z';

export function CoinIcon() {
  return (
    <svg className="icon" viewBox="0 0 8 8" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={COIN_PIXELS} />
    </svg>
  );
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
