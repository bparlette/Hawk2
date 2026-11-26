// Key bindings: as close as possible to the classic QQ Speed PC defaults
// arrows drive · Shift drift · Ctrl nitro/item · tap up (exiting a corner) or W mini-boost · Alt swap item · R reset
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'AltLeft', 'AltRight', 'PageUp', 'PageDown', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'KeyW', 'KeyR']);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.touch = { up: false, down: false, left: false, right: false, shift: false };
    this.touchPressed = new Set();
    this.onKey = null; // callback for non-driving keys (pause, camera, etc.)
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.ctrlKey && (e.code === 'KeyW' || e.code === 'KeyR')) e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        if (this.onKey) this.onKey(e.code, e);
      }
      this.down.add(e.code);
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  has(...codes) { return codes.some((c) => this.down.has(c)); }
  was(...codes) { return codes.some((c) => this.pressed.has(c) || this.touchPressed.has(c)); }

  // build one frame of driving input (edge-triggered values are valid this frame only)
  frame() {
    const t = this.touch;
    const inp = {
      up: this.has('ArrowUp') || t.up,
      down: this.has('ArrowDown') || t.down,
      left: this.has('ArrowLeft') || t.left,
      right: this.has('ArrowRight') || t.right,
      shift: this.has('ShiftLeft', 'ShiftRight') || t.shift,
      upPressed: this.was('ArrowUp', 'TouchBoost'),
      wPressed: this.was('KeyW'),
      nitroPressed: this.was('ControlLeft', 'ControlRight', 'Space', 'TouchNitro'),
      swapPressed: this.was('AltLeft', 'AltRight', 'TouchSwap'),
      resetPressed: this.was('KeyR'),
    };
    this.pressed.clear();
    this.touchPressed.clear();
    return inp;
  }

  // touch buttons
  bindTouch(root) {
    const btn = (sel, key, edge) => {
      const el = root.querySelector(sel);
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        el.classList.add('on');
        if (key) this.touch[key] = true;
        if (edge) this.touchPressed.add(edge);
      };
      const off = (e) => {
        e.preventDefault();
        el.classList.remove('on');
        if (key) this.touch[key] = false;
      };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
    };
    btn('#t-left', 'left');
    btn('#t-right', 'right');
    btn('#t-drift', 'shift');
    btn('#t-brake', 'down');
    btn('#t-nitro', null, 'TouchNitro');
    btn('#t-boost', null, 'TouchBoost');
    btn('#t-swap', null, 'TouchSwap');
  }
}
