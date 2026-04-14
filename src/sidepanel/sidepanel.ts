import { ChannelService } from '../services/ChannelService';
import { FolderService } from '../services/FolderService';
import { StorageService } from '../services/StorageService';
import { YouTubeApiService } from '../services/YouTubeApiService';
import { ChannelRenderer, type ViewMode } from '../components/ChannelRenderer';
import { FolderRenderer, type FolderCallbacks } from '../components/FolderRenderer';
import { Toast } from '../components/Toast';
import type { Channel } from '../models/Channel';
import type { Folder } from '../models/Folder';

/**
 * SidePanelApp - Main application controller.
 * Manages state, delegates rendering, handles user actions.
 */
class SidePanelApp {
  // Cached data — avoids re-fetching on every render
  #folders: Folder[] = [];
  #channels: Channel[] = [];

  // UI state
  #viewMode: ViewMode = 'list';
  #searchQuery = '';
  #expandedIds = new Set<string>();
  #uncategorizedExpanded = true;
  #syncing = false;

  // DOM references
  readonly #content: HTMLElement;
  readonly #emptyState: HTMLElement;
  readonly #loadingState: HTMLElement;
  readonly #btnSync: HTMLButtonElement;
  readonly #btnSyncText: HTMLElement;
  readonly #btnSignOut: HTMLButtonElement;
  readonly #viewToggle: HTMLElement;
  readonly #searchInput: HTMLInputElement;

  constructor() {
    this.#content = document.getElementById('content')!;
    this.#emptyState = document.getElementById('empty-state')!;
    this.#loadingState = document.getElementById('loading-state')!;
    this.#btnSync = document.getElementById('btn-sync') as HTMLButtonElement;
    this.#btnSyncText = document.getElementById('btn-sync-text')!;
    this.#btnSignOut = document.getElementById('btn-sign-out') as HTMLButtonElement;
    this.#viewToggle = document.getElementById('view-toggle')!;
    this.#searchInput = document.getElementById('search-input') as HTMLInputElement;

    this.#bindEvents();
    this.#init();
  }

  // ===== Initialization =====

  async #init(): Promise<void> {
    // Restore saved view mode from chrome.storage
    const savedMode = await StorageService.get<ViewMode>('koi-view-mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      this.#viewMode = savedMode;
      this.#viewToggle.querySelectorAll('.view-toggle__btn').forEach((b) => b.classList.remove('active'));
      this.#viewToggle.querySelector(`[data-view="${savedMode}"]`)?.classList.add('active');
    }

    const signedIn = await YouTubeApiService.isSignedIn();
    this.#updateAuthUI(signedIn);
    await this.#loadDataAndRender();
  }

  #updateAuthUI(signedIn: boolean): void {
    this.#btnSignOut.style.display = signedIn ? 'inline-flex' : 'none';
    const label = signedIn ? 'Sync' : 'Sign In & Sync';
    this.#btnSyncText.textContent = label;
    this.#btnSync.title = label;
  }

  // ===== Event Binding =====

  #bindEvents(): void {
    this.#btnSync.addEventListener('click', () => this.#handleSync());
    this.#btnSignOut.addEventListener('click', () => this.#handleSignOut());

    document.getElementById('btn-add-folder')!
      .addEventListener('click', () => this.#openModal('modal-add-folder'));

    document.querySelectorAll<HTMLElement>('[data-close-modal]').forEach((btn) =>
      btn.addEventListener('click', () => this.#closeModal(btn.dataset.closeModal!)),
    );

    document.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) =>
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      }),
    );

    document.getElementById('btn-confirm-add-folder')!
      .addEventListener('click', () => this.#handleAddFolder());
    document.getElementById('input-folder-name')!
      .addEventListener('keydown', (e) => { if (e.key === 'Enter') this.#handleAddFolder(); });

    document.getElementById('btn-confirm-rename-folder')!
      .addEventListener('click', () => this.#handleConfirmRename());
    document.getElementById('input-rename-folder')!
      .addEventListener('keydown', (e) => { if (e.key === 'Enter') this.#handleConfirmRename(); });

    document.getElementById('btn-confirm-unsubscribe')!
      .addEventListener('click', () => this.#handleConfirmUnsubscribe());

    // Drag-drop to uncategorize
    this.#content.addEventListener('dragover', (e) => e.preventDefault());
    this.#content.addEventListener('drop', (e) => {
      if (e.target === this.#content || (e.target as HTMLElement).closest('.uncategorized-header')) {
        e.preventDefault();
        const channelId = e.dataTransfer!.getData('text/plain');
        if (channelId) this.#handleMoveChannel(channelId, null);
      }
    });

    // View toggle
    this.#viewToggle.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-view]');
      if (!btn || btn.classList.contains('active')) return;
      this.#viewToggle.querySelectorAll('.view-toggle__btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.#viewMode = btn.dataset.view as ViewMode;
      StorageService.set('koi-view-mode', this.#viewMode);
      this.#render();
    });

    // Search — debounced
    let searchTimer: ReturnType<typeof setTimeout>;
    this.#searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.#searchQuery = this.#searchInput.value.trim().toLowerCase();
        this.#render();
      }, 150);
    });
  }

  // ===== Data + Render (performance: separate load from render) =====

  /** Load data from storage, then render. */
  async #loadDataAndRender(): Promise<void> {
    [this.#folders, this.#channels] = await Promise.all([
      FolderService.getAll(),
      ChannelService.getAll(),
    ]);
    this.#render();
  }

  /** Render from cached data — no async, fast. */
  #render(): void {
    this.#saveExpandedState();

    const hasContent = this.#folders.length > 0 || this.#channels.length > 0;
    this.#emptyState.classList.toggle('hidden', hasContent);

    // Clear sections (keep empty + loading)
    for (const child of Array.from(this.#content.children)) {
      if (child !== this.#emptyState && child !== this.#loadingState) child.remove();
    }
    if (!hasContent) return;

    // Filter channels by search
    const filteredChannels = this.#searchQuery
      ? this.#channels.filter((ch) => ch.name.toLowerCase().includes(this.#searchQuery))
      : this.#channels;

    const onUnsubscribe = (cid: string, name: string) => this.#handleUnsubscribe(cid, name);

    const callbacks = {
      onMoveChannel: (cid: string, fid: string | null) => this.#handleMoveChannel(cid, fid),
      onRemoveFolder: (id: string, name: string) => this.#handleRemoveFolder(id, name),
      onRenameFolder: (id: string, name: string) => this.#handleRenameFolder(id, name),
    };

    // Render folders
    for (const folder of this.#folders) {
      const folderChannels = filteredChannels.filter((ch) => ch.folderId === folder.id);

      // In search mode, skip empty folders
      if (this.#searchQuery && folderChannels.length === 0) continue;

      const section = FolderRenderer.render(folder, folderChannels, callbacks, this.#folders, this.#viewMode, onUnsubscribe);
      if (this.#expandedIds.has(folder.id)) {
        section.querySelector('.folder-header__arrow')?.classList.add('expanded');
        section.querySelector('.folder-body, .folder-body--grid')?.classList.add('expanded');
      }
      this.#content.insertBefore(section, this.#emptyState);
    }

    // Render uncategorized
    const uncategorized = filteredChannels.filter((ch) => ch.folderId === null);
    if (uncategorized.length > 0) {
      const section = this.#buildUncategorizedSection(uncategorized, callbacks, onUnsubscribe);
      if (!this.#uncategorizedExpanded) {
        section.querySelector('.uncategorized-header__arrow')?.classList.remove('expanded');
        section.querySelector('.folder-body, .folder-body--grid')?.classList.remove('expanded');
      }
      this.#content.insertBefore(section, this.#emptyState);
    }
  }

  /** Snapshot which folders are expanded before clearing DOM. */
  #saveExpandedState(): void {
    const ids = new Set<string>();
    for (const s of this.#content.querySelectorAll<HTMLElement>('.folder-section[data-folder-id]')) {
      if (s.querySelector('.folder-body.expanded, .folder-body--grid.expanded')) {
        ids.add(s.dataset.folderId!);
      }
    }
    this.#expandedIds = ids;

    const uncatArrow = this.#content.querySelector('.uncategorized-header__arrow');
    this.#uncategorizedExpanded = !uncatArrow || uncatArrow.classList.contains('expanded');
  }

  #buildUncategorizedSection(
    channels: Channel[],
    callbacks: FolderCallbacks,
    onUnsubscribe?: (channelId: string, channelName: string) => void,
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'folder-section';

    const header = document.createElement('div');
    header.className = 'uncategorized-header';
    header.innerHTML = `
      <div class="folder-header__indicator" style="background:#606060"></div>
      <svg class="uncategorized-header__arrow expanded" viewBox="0 0 24 24">
        <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
      </svg>
      <span class="uncategorized-header__name">Uncategorized</span>
      <span class="folder-header__count">${channels.length}</span>
    `;

    const isGrid = this.#viewMode === 'grid';
    const body = document.createElement('div');
    body.className = isGrid ? 'folder-body--grid expanded' : 'folder-body expanded';

    for (const ch of channels) {
      body.appendChild(
        ChannelRenderer.render(ch, { onMove: callbacks.onMoveChannel, onUnsubscribe }, this.#folders, this.#viewMode),
      );
    }

    section.append(header, body);
    header.addEventListener('click', () => {
      header.querySelector('.uncategorized-header__arrow')!.classList.toggle('expanded');
      body.classList.toggle('expanded');
    });

    return section;
  }

  // ===== Handlers =====

  async #handleSync(): Promise<void> {
    if (this.#syncing) return;
    this.#syncing = true;
    this.#btnSync.disabled = true;
    this.#btnSyncText.textContent = 'Syncing...';
    this.#loadingState.style.display = 'flex';
    this.#emptyState.classList.add('hidden');

    try {
      const apiChannels = await YouTubeApiService.fetchSubscriptions();
      const result = await ChannelService.syncFromApi(apiChannels);
      this.#updateAuthUI(true);
      Toast.show(
        `Synced! ${apiChannels.length} subscriptions (${result.added} new, ${result.removed} removed)`,
        'success',
      );
      await this.#loadDataAndRender();
    } catch (err) {
      Toast.show(`Sync failed: ${(err as Error).message}`, 'error');
      this.#updateAuthUI(false);
    } finally {
      this.#syncing = false;
      this.#btnSync.disabled = false;
      this.#loadingState.style.display = 'none';
      const signedIn = await YouTubeApiService.isSignedIn();
      this.#updateAuthUI(signedIn);
    }
  }

  async #handleSignOut(): Promise<void> {
    try {
      await YouTubeApiService.revokeAuthToken();
      this.#updateAuthUI(false);
      Toast.show('Signed out successfully.', 'success');
    } catch (err) {
      Toast.show((err as Error).message, 'error');
    }
  }

  async #handleAddFolder(): Promise<void> {
    const nameInput = document.getElementById('input-folder-name') as HTMLInputElement;
    const colorInput = document.getElementById('input-folder-color') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) { Toast.show('Please enter a folder name.', 'error'); return; }

    try {
      await FolderService.add(name, colorInput.value);
      Toast.show(`Folder "${name}" created!`, 'success');
      this.#closeModal('modal-add-folder');
      nameInput.value = '';
      colorInput.value = '#FF0000';
      await this.#loadDataAndRender();
    } catch (err) {
      Toast.show((err as Error).message, 'error');
    }
  }

  async #handleRemoveFolder(id: string, name: string): Promise<void> {
    if (!confirm(`Delete folder "${name}"? Channels inside will become uncategorized.`)) return;
    try {
      await FolderService.remove(id);
      Toast.show(`Folder "${name}" deleted.`, 'success');
      await this.#loadDataAndRender();
    } catch (err) {
      Toast.show((err as Error).message, 'error');
    }
  }

  #renameFolderId = '';
  #unsubscribeChannelId = '';
  #unsubscribeChannelName = '';

  #handleRenameFolder(id: string, currentName: string): void {
    this.#renameFolderId = id;
    const input = document.getElementById('input-rename-folder') as HTMLInputElement;
    input.value = currentName;
    this.#openModal('modal-rename-folder');
  }

  async #handleConfirmRename(): Promise<void> {
    const input = document.getElementById('input-rename-folder') as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName) { Toast.show('Please enter a folder name.', 'error'); return; }

    try {
      await FolderService.rename(this.#renameFolderId, newName);
      Toast.show(`Folder renamed to "${newName}".`, 'success');
      this.#closeModal('modal-rename-folder');
      await this.#loadDataAndRender();
    } catch (err) {
      Toast.show((err as Error).message, 'error');
    }
  }

  #handleUnsubscribe(channelId: string, channelName: string): void {
    this.#unsubscribeChannelId = channelId;
    this.#unsubscribeChannelName = channelName;
    document.getElementById('unsubscribe-channel-name')!.textContent = channelName;
    this.#openModal('modal-unsubscribe');
  }

  async #handleConfirmUnsubscribe(): Promise<void> {
    const channelId = this.#unsubscribeChannelId;
    const channelName = this.#unsubscribeChannelName;
    if (!channelId) return;

    const btn = document.getElementById('btn-confirm-unsubscribe') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Unsubscribing...';

    try {
      await YouTubeApiService.unsubscribe(channelId);
      await ChannelService.remove(channelId);

      // Update cached data locally
      this.#channels = this.#channels.filter((ch) => ch.id !== channelId);

      this.#closeModal('modal-unsubscribe');
      Toast.show(`Unsubscribed from "${channelName}".`, 'success');
      this.#render();
    } catch (err) {
      Toast.show(`Unsubscribe failed: ${(err as Error).message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Unsubscribe';
    }
  }

  async #handleMoveChannel(channelId: string, folderId: string | null): Promise<void> {
    try {
      await ChannelService.moveToFolder(channelId, folderId);
      Toast.show(`Channel moved to ${folderId ? 'folder' : 'Uncategorized'}.`, 'success');
      // Update cached data locally for fast re-render
      const ch = this.#channels.find((c) => c.id === channelId);
      if (ch) ch.folderId = folderId;
      this.#render();
    } catch (err) {
      Toast.show((err as Error).message, 'error');
    }
  }

  // ===== Modal Helpers =====

  #openModal(id: string): void {
    document.getElementById(id)!.classList.add('active');
    const input = document.querySelector<HTMLInputElement>(`#${id} .input`);
    if (input) setTimeout(() => input.focus(), 100);
  }

  #closeModal(id: string): void {
    document.getElementById(id)!.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', () => new SidePanelApp());
