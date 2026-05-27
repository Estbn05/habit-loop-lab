# Mobile Install Guide

Habit Loop Lab now works as an installable Progressive Web App.

## Android

1. Open `https://estbn05.github.io/habit-loop-lab/` in Chrome.
2. Open the browser menu.
3. Tap **Add to Home screen** or **Install app**.
4. Open **Habit Lab** from the phone home screen.

The app opens in standalone mode, with its own icon and without the usual browser chrome.

## iPhone

1. Open `https://estbn05.github.io/habit-loop-lab/` in Safari.
2. Tap the share button.
3. Tap **Add to Home Screen**.
4. Confirm the name **Habit Lab**.
5. Open it from the home screen.

## Offline Behavior

The app caches the shell files needed to open the tracker after the first successful visit:

- `index.html`
- `app.js`
- `styles.css`
- app manifest
- app icons

Habit data still follows the app's existing model:

- Without login, data is stored on the current device with `localStorage`.
- With Supabase login, data syncs across devices when the app has a network connection.

## Notes

This PWA setup is intentionally lightweight. It keeps the project deployable on GitHub Pages while making the mobile experience feel more like an app.
