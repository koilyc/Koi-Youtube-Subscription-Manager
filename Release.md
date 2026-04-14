# Release Notes

## v2.1.0

### Changes

- Added unsubscribe button next to the "Move To" select in list view. Clicking it opens a confirmation modal; confirming removes the channel from the local list and opens the YouTube channel page for manual unsubscribe.
- Added unsubscribe confirmation modal matching the existing modal design system (`modal-overlay`, `modal__header/body/footer`).
- Added `ChannelService.remove()` for local storage cleanup after removal.

### Notes

- OAuth scope remains `youtube.readonly`. Programmatic unsubscribe via YouTube API requires the `youtube` (full) scope, which triggers Google's unverified app warning. To avoid this, the extension removes channels locally and directs the user to YouTube to complete the unsubscribe manually.

## v2.0.2

### Changes

- Unified folder header height across user-created folders and Uncategorized section (`min-height: 36px`).
- Restyled color picker in Add Folder modal: now a circle aligned inline with the label.
- Added a subtle border to Cancel (ghost) buttons for better visual clarity.

## v2.0.1

### Changes

- Removed channel URL display from list view mode; only the channel name is now shown beneath the avatar.
