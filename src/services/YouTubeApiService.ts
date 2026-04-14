import type { ApiChannel } from '../models/Channel';

interface YouTubeSnippet {
  title: string;
  resourceId: { channelId: string };
  thumbnails?: { default?: { url: string } };
}

interface YouTubeSubscriptionResponse {
  items?: Array<{ snippet: YouTubeSnippet }>;
  nextPageToken?: string;
}

/**
 * YouTubeApiService - Handles OAuth2 authentication and YouTube Data API v3 calls.
 */
export class YouTubeApiService {
  static readonly #API_BASE = 'https://www.googleapis.com/youtube/v3';

  static async getAuthToken(interactive = true): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        // @types/chrome may return GetAuthTokenResult or string depending on version
        const token = typeof result === 'string' ? result : result?.token;
        if (!token) {
          reject(new Error('No auth token received.'));
        } else {
          resolve(token);
        }
      });
    });
  }

  static async revokeAuthToken(): Promise<void> {
    const token = await this.getAuthToken(false).catch(() => null);
    if (!token) return;

    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        resolve();
      });
    });
  }

  static async isSignedIn(): Promise<boolean> {
    try {
      await this.getAuthToken(false);
      return true;
    } catch {
      return false;
    }
  }

  /** Fetch all subscriptions with automatic pagination. */
  static async fetchSubscriptions(): Promise<ApiChannel[]> {
    const token = await this.getAuthToken(true);
    const subscriptions: ApiChannel[] = [];
    let pageToken = '';

    do {
      const params = new URLSearchParams({
        part: 'snippet',
        mine: 'true',
        maxResults: '50',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(`${this.#API_BASE}/subscriptions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await new Promise<void>((resolve) =>
            chrome.identity.removeCachedAuthToken({ token }, resolve),
          );
          return this.fetchSubscriptions();
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message
            || `YouTube API error: ${response.status}`,
        );
      }

      const data: YouTubeSubscriptionResponse = await response.json();

      for (const item of data.items ?? []) {
        const s = item.snippet;
        subscriptions.push({
          id: s.resourceId.channelId,
          name: s.title,
          url: `https://www.youtube.com/channel/${s.resourceId.channelId}`,
          avatar: s.thumbnails?.default?.url ?? '',
        });
      }

      pageToken = data.nextPageToken ?? '';
    } while (pageToken);

    subscriptions.sort((a, b) => a.name.localeCompare(b.name));
    return subscriptions;
  }

}
