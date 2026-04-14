import { StorageService } from './StorageService';
import { Channel, type ApiChannel, type ChannelData } from '../models/Channel';

const STORAGE_KEY = 'koi_channels';

export interface SyncResult {
  added: number;
  removed: number;
  updated: number;
}

/**
 * ChannelService - Manages subscription channels synced from YouTube API.
 */
export class ChannelService {
  static async getAll(): Promise<Channel[]> {
    const data = await StorageService.get<ChannelData[]>(STORAGE_KEY);
    if (!data) return [];
    return data.map((item) => Channel.fromJSON(item));
  }

  /**
   * Sync channels from YouTube API data.
   * Preserves folder assignments for existing channels.
   */
  static async syncFromApi(apiChannels: ApiChannel[]): Promise<SyncResult> {
    const existing = await this.getAll();
    const existingMap = new Map(existing.map((ch) => [ch.id, ch]));
    const apiIdSet = new Set(apiChannels.map((ch) => ch.id));

    let added = 0;
    let updated = 0;

    const merged: Channel[] = [];

    for (const apiCh of apiChannels) {
      const local = existingMap.get(apiCh.id);
      if (local) {
        local.name = apiCh.name;
        local.url = apiCh.url;
        local.avatar = apiCh.avatar;
        merged.push(local);
        updated++;
      } else {
        merged.push(new Channel(apiCh.id, apiCh.name, apiCh.url, apiCh.avatar));
        added++;
      }
    }

    const removed = existing.filter((ch) => !apiIdSet.has(ch.id)).length;

    await StorageService.set(STORAGE_KEY, merged.map((ch) => ch.toJSON()));
    return { added, removed, updated };
  }

  static async moveToFolder(channelId: string, folderId: string | null): Promise<void> {
    const channels = await this.getAll();
    const channel = channels.find((ch) => ch.id === channelId);
    if (!channel) throw new Error(`Channel "${channelId}" not found.`);

    channel.folderId = folderId;
    await StorageService.set(STORAGE_KEY, channels.map((ch) => ch.toJSON()));
  }

  static async getByFolder(folderId: string | null): Promise<Channel[]> {
    const channels = await this.getAll();
    return channels.filter((ch) => ch.folderId === folderId);
  }
}
