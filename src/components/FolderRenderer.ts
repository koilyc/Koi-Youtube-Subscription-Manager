import type { Channel } from '../models/Channel';
import type { Folder } from '../models/Folder';
import { ChannelRenderer, type ViewMode } from './ChannelRenderer';

export interface FolderCallbacks {
  onMoveChannel: (channelId: string, folderId: string | null) => void;
  onRemoveFolder: (id: string, name: string) => void;
  onRenameFolder: (id: string, currentName: string) => void;
}

/**
 * FolderRenderer - Renders folder sections with nested channels.
 */
export class FolderRenderer {
  static render(
    folder: Folder,
    channels: Channel[],
    callbacks: FolderCallbacks,
    allFolders: Folder[],
    viewMode: ViewMode = 'list',
    onUnsubscribe?: (channelId: string, channelName: string) => void,
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'folder-section';
    section.dataset.folderId = folder.id;

    const header = document.createElement('div');
    header.className = 'folder-header';
    header.innerHTML = `
      <div class="folder-header__indicator" style="background:${folder.color}"></div>
      <svg class="folder-header__arrow" viewBox="0 0 24 24">
        <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
      </svg>
      <span class="folder-header__name">${this.#esc(folder.name)}</span>
      <span class="folder-header__count">${channels.length}</span>
      <div class="folder-header__actions">
        <button class="btn btn--icon" data-action="rename-folder" title="Rename folder">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button class="btn btn--icon btn--delete" data-action="remove-folder" title="Delete folder">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    `;

    const isGrid = viewMode === 'grid';
    const body = document.createElement('div');
    body.className = isGrid ? 'folder-body--grid' : 'folder-body';

    for (const channel of channels) {
      body.appendChild(
        ChannelRenderer.render(channel, { onMove: callbacks.onMoveChannel, onUnsubscribe }, allFolders, viewMode),
      );
    }

    section.append(header, body);

    // Toggle expand/collapse
    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-action]')) return;
      header.querySelector('.folder-header__arrow')!.classList.toggle('expanded');
      body.classList.toggle('expanded');
    });

    // Rename
    header.querySelector('[data-action="rename-folder"]')!
      .addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onRenameFolder(folder.id, folder.name);
      });

    // Remove
    header.querySelector('[data-action="remove-folder"]')!
      .addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onRemoveFolder(folder.id, folder.name);
      });

    // Drag-and-drop target
    section.addEventListener('dragover', (e) => {
      e.preventDefault();
      section.classList.add('drag-over');
    });
    section.addEventListener('dragleave', () => section.classList.remove('drag-over'));
    section.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('drag-over');
      const channelId = e.dataTransfer!.getData('text/plain');
      if (channelId) {
        const arrow = header.querySelector('.folder-header__arrow')!;
        if (!arrow.classList.contains('expanded')) {
          arrow.classList.add('expanded');
          body.classList.add('expanded');
        }
        callbacks.onMoveChannel(channelId, folder.id);
      }
    });

    return section;
  }

  static #esc(str: string): string {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}
