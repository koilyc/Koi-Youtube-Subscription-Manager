import type { Channel } from '../models/Channel';
import type { Folder } from '../models/Folder';

export type ViewMode = 'list' | 'grid';

export interface ChannelCallbacks {
  onMove?: (channelId: string, folderId: string | null) => void;
}

/**
 * ChannelRenderer - Renders channel list items and grid cards.
 */
export class ChannelRenderer {
  static render(
    channel: Channel,
    callbacks: ChannelCallbacks,
    folders: Folder[] = [],
    viewMode: ViewMode = 'list',
  ): HTMLElement {
    return viewMode === 'grid'
      ? this.#renderGrid(channel)
      : this.#renderList(channel, callbacks, folders);
  }

  static #renderGrid(channel: Channel): HTMLElement {
    const el = document.createElement('div');
    el.className = 'channel-card';
    el.dataset.channelId = channel.id;
    el.draggable = true;

    const avatarHtml = channel.avatar
      ? `<img src="${this.#esc(channel.avatar)}" alt="" />`
      : this.#initial(channel.name);

    el.innerHTML = `
      <div class="channel-card__avatar">${avatarHtml}</div>
      <div class="channel-card__name" title="${this.#esc(channel.name)}">${this.#esc(channel.name)}</div>
    `;

    el.addEventListener('click', () => chrome.tabs.create({ url: channel.url }));
    this.#bindDrag(el, channel.id);
    return el;
  }

  static #renderList(channel: Channel, callbacks: ChannelCallbacks, folders: Folder[]): HTMLElement {
    const el = document.createElement('div');
    el.className = 'channel-item';
    el.dataset.channelId = channel.id;
    el.draggable = true;

    const avatarHtml = channel.avatar
      ? `<img src="${this.#esc(channel.avatar)}" alt="" />`
      : this.#initial(channel.name);

    el.innerHTML = `
      <div class="channel-item__avatar">${avatarHtml}</div>
      <div class="channel-item__info">
        <div class="channel-item__name" title="${this.#esc(channel.name)}">${this.#esc(channel.name)}</div>
      </div>
      <div class="channel-item__actions">
        ${this.#renderMoveSelect(channel, folders)}
      </div>
    `;

    el.querySelector('.channel-item__name')!
      .addEventListener('click', () => chrome.tabs.create({ url: channel.url }));

    const select = el.querySelector<HTMLSelectElement>('[data-action="move"]');
    if (select) {
      select.addEventListener('change', (e) => {
        e.stopPropagation();
        const val = (e.target as HTMLSelectElement).value;
        callbacks.onMove?.(channel.id, val === '__none__' ? null : val);
      });
    }

    this.#bindDrag(el, channel.id);
    return el;
  }

  static #renderMoveSelect(channel: Channel, folders: Folder[]): string {
    if (folders.length === 0) return '';
    const options = folders
      .filter((f) => f.id !== channel.folderId)
      .map((f) => `<option value="${f.id}">${this.#esc(f.name)}</option>`)
      .join('');
    const uncatOpt = channel.folderId
      ? '<option value="__none__">Uncategorized</option>'
      : '';
    return `
      <select class="select" data-action="move" title="Move to folder"
              style="width:auto;padding:4px 6px;font-size:12px;max-width:100px;">
        <option value="" disabled selected>Move...</option>
        ${uncatOpt}${options}
      </select>`;
  }

  static #bindDrag(el: HTMLElement, channelId: string): void {
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer!.setData('text/plain', channelId);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  }

  static #esc(str: string): string {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  static #initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
