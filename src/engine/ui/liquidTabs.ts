import { h } from '../dom';
import { getSettings } from '../settings';

// Sliding pill tab highlight. One gradient pill sits behind the current tab.
// When the current tab changes, the pill springs to it: it stretches along
// the direction of travel while it moves (faster = longer and a little
// thinner) and settles with a small overshoot. Driven by a damped spring,
// so a second tap mid-flight just retargets it. Reduce motion: it jumps.

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const STIFFNESS = 340;
const DAMPING = 26;
/** Extra length per px/s of speed, and the most it may stretch (as a share of its width). */
const STRETCH = 0.075;
const MAX_STRETCH = 1.4;

/** Last position per tab group, so a re-rendered group still springs from where it was. */
const lastBox = new Map<string, Box>();

export interface LiquidTabs {
  /** Move the highlight to this tab. */
  moveTo(tab: HTMLElement | null, animate?: boolean): void;
}

/**
 * Wrap a tab list. `wrap` must be the list's parent; it becomes the pill's
 * positioning box. Tabs sit above the pill (see .liquid-wrap in app.css).
 */
export function liquidTabs(key: string, wrap: HTMLElement): LiquidTabs {
  wrap.classList.add('liquid-wrap');
  const pill = h('span', { class: 'liquid-blob', 'aria-hidden': 'true' });
  wrap.prepend(pill);
  let current: HTMLElement | null = null;
  // Spring state: position/size and their velocities.
  let pos: Box | null = null;
  const vel: Box = { x: 0, y: 0, w: 0, h: 0 };
  let target: Box | null = null;
  let raf = 0;
  let last = 0;

  const boxOf = (el: HTMLElement): Box => {
    const a = el.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, w: a.width, h: a.height };
  };

  const draw = (b: Box, vx: number, vy: number) => {
    const speed = Math.hypot(vx, vy);
    const stretch = Math.min(speed * STRETCH, b.w * MAX_STRETCH);
    const horizontal = Math.abs(vx) >= Math.abs(vy);
    const w = horizontal ? b.w + stretch : b.w;
    const hgt = horizontal ? b.h * (1 - Math.min(0.14, stretch / (b.w * 10))) : b.h + stretch * 0.4;
    pill.style.left = `${b.x - w / 2}px`;
    pill.style.top = `${b.y - hgt / 2}px`;
    pill.style.width = `${w}px`;
    pill.style.height = `${hgt}px`;
  };

  const step = (now: number) => {
    raf = 0;
    if (!pos || !target) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    let settled = true;
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      const a = STIFFNESS * (target[k] - pos[k]) - DAMPING * vel[k];
      vel[k] += a * dt;
      pos[k] += vel[k] * dt;
      if (Math.abs(target[k] - pos[k]) > 0.3 || Math.abs(vel[k]) > 2) settled = false;
    }
    if (settled) {
      pos = { ...target };
      vel.x = vel.y = vel.w = vel.h = 0;
      draw(pos, 0, 0);
      return;
    }
    draw(pos, vel.x, vel.y);
    raf = requestAnimationFrame(step);
  };

  const jump = (b: Box) => {
    cancelAnimationFrame(raf);
    raf = 0;
    pos = { ...b };
    target = { ...b };
    vel.x = vel.y = vel.w = vel.h = 0;
    draw(b, 0, 0);
  };

  new ResizeObserver(() => {
    if (current && current.isConnected) {
      const b = boxOf(current);
      lastBox.set(key, b);
      // Mid-flight: just retarget (tabs change width as they switch). At rest: snap.
      if (raf) target = b;
      else jump(b);
    }
  }).observe(wrap);

  return {
    moveTo(tab, animate = true) {
      current = tab;
      pill.hidden = !tab;
      if (!tab) return;
      const to = boxOf(tab);
      const from = pos ?? lastBox.get(key);
      lastBox.set(key, to);
      if (!from || !animate || getSettings().reducedMotion) {
        jump(to);
        return;
      }
      if (!pos) pos = { ...from };
      target = to;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    },
  };
}
