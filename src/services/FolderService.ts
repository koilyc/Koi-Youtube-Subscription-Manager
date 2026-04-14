import { StorageService } from './StorageService';
import { Folder, type FolderData } from '../models/Folder';
import { generateId } from '../utils/idGenerator';
import { ChannelService } from './ChannelService';

const STORAGE_KEY = 'koi_folders';

/**
 * FolderService - Manages folder CRUD operations.
 */
export class FolderService {
  static async getAll(): Promise<Folder[]> {
    const data = await StorageService.get<FolderData[]>(STORAGE_KEY);
    if (!data) return [];
    return data.map((item) => Folder.fromJSON(item));
  }

  static async add(name: string, color = '#FF0000'): Promise<Folder> {
    const folders = await this.getAll();
    if (folders.find((f) => f.name === name)) {
      throw new Error(`Folder "${name}" already exists.`);
    }

    const folder = new Folder(generateId('folder'), name, color);
    folders.push(folder);
    await StorageService.set(STORAGE_KEY, folders.map((f) => f.toJSON()));
    return folder;
  }

  /** Remove a folder. Channels inside become uncategorized. */
  static async remove(id: string): Promise<void> {
    const channels = await ChannelService.getByFolder(id);
    for (const channel of channels) {
      await ChannelService.moveToFolder(channel.id, null);
    }

    let folders = await this.getAll();
    folders = folders.filter((f) => f.id !== id);
    await StorageService.set(STORAGE_KEY, folders.map((f) => f.toJSON()));
  }

  static async rename(id: string, newName: string): Promise<void> {
    const folders = await this.getAll();
    const folder = folders.find((f) => f.id === id);
    if (!folder) throw new Error(`Folder "${id}" not found.`);

    const duplicate = folders.find((f) => f.name === newName && f.id !== id);
    if (duplicate) throw new Error(`Folder "${newName}" already exists.`);

    folder.name = newName;
    await StorageService.set(STORAGE_KEY, folders.map((f) => f.toJSON()));
  }
}
