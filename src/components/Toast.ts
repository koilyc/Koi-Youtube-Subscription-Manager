/**
 * Toast - Lightweight notification component.
 */
export class Toast {
  static #timeout: ReturnType<typeof setTimeout> | null = null;

  static show(message: string, type: 'success' | 'error' = 'success', duration = 2500): void {
    let toast = document.querySelector('.toast');
    if (toast) {
      toast.remove();
      if (this.#timeout) clearTimeout(this.#timeout);
    }

    toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast!.classList.add('visible');
    });

    this.#timeout = setTimeout(() => {
      toast!.classList.remove('visible');
      setTimeout(() => toast!.remove(), 300);
    }, duration);
  }
}
