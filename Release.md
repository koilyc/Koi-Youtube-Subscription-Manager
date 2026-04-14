# Release Notes

## v2.1.0

### Changes

- Added unsubscribe button next to the "Move To" select in list view. Clicking it opens a confirmation modal; confirming removes the subscription via YouTube API and removes the channel from the local list.
- Added unsubscribe confirmation modal matching the existing modal design system (`modal-overlay`, `modal__header/body/footer`).
- Upgraded OAuth scope from `youtube.readonly` to `youtube` to enable write operations (unsubscribe).
- Added `YouTubeApiService.unsubscribe()` — looks up the subscription ID by channel ID, then deletes it.
- Added `ChannelService.remove()` for local storage cleanup after unsubscribe.

## v2.0.2

### Changes

- Unified folder header height across user-created folders and Uncategorized section (`min-height: 36px`).
- Restyled color picker in Add Folder modal: now a circle aligned inline with the label.
- Added a subtle border to Cancel (ghost) buttons for better visual clarity.

## v2.0.1

### Changes

- Removed channel URL display from list view mode; only the channel name is now shown beneath the avatar.
