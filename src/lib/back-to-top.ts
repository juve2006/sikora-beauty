import { useSyncExternalStore } from 'react';

// How far down a page has to be before the way back up is worth a button, in pixels.
const SHOWN_FROM = 400;

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
};

// The storefront's button and the admin's share this, as they share no styles. The server and the
// first render are at the top.
export const useScrolledDown = () =>
  useSyncExternalStore(
    subscribe,
    () => window.scrollY > SHOWN_FROM,
    () => false,
  );

export const scrollToTop = () =>
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });
