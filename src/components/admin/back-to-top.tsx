'use client';

import { ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { scrollToTop, useScrolledDown } from '@/lib/back-to-top';
import './back-to-top.css';

// The way back up in the admin. A provider, as that is what Payload renders on every admin page.
const BackToTop = ({ children }: { children: ReactNode }) => {
  const scrolledDown = useScrolledDown();
  return (
    <>
      {children}
      {scrolledDown && (
        <button
          aria-label="Нагору"
          className="back-to-top"
          onClick={scrollToTop}
          type="button"
        >
          <ChevronUp size={28} strokeWidth={1.5} />
        </button>
      )}
    </>
  );
};

export default BackToTop;
