'use client';

import { useEffect, useId } from 'react';

const activeLocks = new Set<string>();
let previousOverflow = '';
let previousPaddingRight = '';

export function useBodyScrollLock(locked: boolean) {
  const id = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (locked) {
      if (activeLocks.size === 0) {
        previousOverflow = body.style.overflow;
        previousPaddingRight = body.style.paddingRight;
        body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
          body.style.paddingRight = `${scrollbarWidth}px`;
        }
      }
      activeLocks.add(id);
    } else {
      activeLocks.delete(id);
      if (activeLocks.size === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    }

    return () => {
      activeLocks.delete(id);
      if (activeLocks.size === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [locked, id]);
}
