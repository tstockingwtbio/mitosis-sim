import { h } from '../dom';
import { getSettings } from '../settings';

// "Liquid" tab highlight: one rounded blob sits behind the current tab. When
// the current tab changes, the blob stretches toward the new tab like a drop
// of water, then pulls in and settles there with a small wobble. With Reduce
// motion it simply moves.

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Last position per tab group, so a re-rendered group still animates from where it was. */
const lastBox = new Map<string, Box>();

export interface LiquidTabs {
  /** Move the highlight to this tab. */
  moveTo(tab: HTMLElement | null, animate?: boolean): void;
}

/**
 * Wrap a tab list. `wrap` must be the list's parent; it becomes the blob's
 * positioning box. Tabs need the class that the CSS lifts above the blob.
 */
export function liquidTabs(key: string, wrap: HTMLElement): LiquidTabs {
  wrap.classList.add('liquid-wrap');
  const blob = h('span', { class: 'liquid-blob', 'aria-hidden': 'true' });
  wrap.prepend(blob);
  let current: HTMLElement | null = null;

  const boxOf = (el: HTMLElement): Box => {
    const a = el.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };
  const css = (bx: Box) => ({ left: `${bx.x}px`, top: `${bx.y}px`, width: `${bx.w}px`, height: `${bx.h}px` });
  const place = (bx: Box) => Object.assign(blob.style, css(bx));

  new ResizeObserver(() => {
    if (current && current.isConnected) {
      const bx = boxOf(current);
      place(bx);
      lastBox.set(key, bx);
    }
  }).observe(wrap);

  return {
    moveTo(tab, animate = true) {
      current = tab;
      blob.hidden = !tab;
      if (!tab) return;
      const to = boxOf(tab);
      const from = lastBox.get(key);
      lastBox.set(key, to);
      place(to);
      const same = from && Math.abs(from.x - to.x) < 1 && Math.abs(from.y - to.y) < 1;
      if (!from || same || !animate || getSettings().reducedMotion || !blob.animate) return;
      // Stretch to cover both tabs (thinner, like water pulled out), then
      // pull in to the new tab with a slight overshoot.
      const sameRow = Math.abs(from.y - to.y) < to.h / 2;
      const left = Math.min(from.x, to.x);
      const right = Math.max(from.x + from.w, to.x + to.w);
      const thin = to.h * 0.78;
      const mid: Box = sameRow
        ? { x: left, y: to.y + (to.h - thin) / 2, w: right - left, h: thin }
        : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, w: (from.w + to.w) / 2 * 0.8, h: thin };
      const dir = Math.sign(to.x - from.x) || 1;
      const over: Box = { x: to.x + dir * 4 - 3, y: to.y + 1, w: to.w + 6, h: to.h - 2 };
      blob.animate([css(from), { ...css(mid), offset: 0.42 }, { ...css(over), offset: 0.75 }, css(to)], {
        duration: 560,
        easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      });
    },
  };
}
