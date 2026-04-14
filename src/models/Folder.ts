/** Serializable folder data for storage. */
export interface FolderData {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

/**
 * Folder model for grouping subscription channels.
 */
export class Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;

  constructor(id: string, name: string, color = '#FF0000') {
    this.id = id;
    this.name = name;
    this.color = color;
    this.createdAt = Date.now();
  }

  static fromJSON(data: FolderData): Folder {
    const folder = new Folder(data.id, data.name, data.color);
    folder.createdAt = data.createdAt || Date.now();
    return folder;
  }

  toJSON(): FolderData {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      createdAt: this.createdAt,
    };
  }
}
