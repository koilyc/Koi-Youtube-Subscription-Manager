/** Serializable channel data for storage. */
export interface ChannelData {
  id: string;
  name: string;
  url: string;
  avatar: string;
  folderId: string | null;
  createdAt: number;
}

/** Channel from YouTube API before local merge. */
export interface ApiChannel {
  id: string;
  name: string;
  url: string;
  avatar: string;
}

/**
 * Channel model representing a YouTube subscription channel.
 */
export class Channel {
  id: string;
  name: string;
  url: string;
  avatar: string;
  folderId: string | null;
  createdAt: number;

  constructor(
    id: string,
    name: string,
    url: string,
    avatar = '',
    folderId: string | null = null,
  ) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.avatar = avatar;
    this.folderId = folderId;
    this.createdAt = Date.now();
  }

  static fromJSON(data: ChannelData): Channel {
    const channel = new Channel(data.id, data.name, data.url, data.avatar, data.folderId);
    channel.createdAt = data.createdAt || Date.now();
    return channel;
  }

  toJSON(): ChannelData {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      avatar: this.avatar,
      folderId: this.folderId,
      createdAt: this.createdAt,
    };
  }
}
