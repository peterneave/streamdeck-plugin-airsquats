# Air Squats for Stream Deck

Reminds you to do air squats (10 by default, configurable from 1 to 999) at least once an hour.

- At the configured minute past each hour (default `0`, on the hour) a beep plays and the key flashes red/white.
- The beep repeats every 30 seconds until you respond.
- **Press** the key to acknowledge. The next reminder is the following hourly slot.
- **Hold** the key for 0.7 seconds to snooze. This adds 5 minutes: an active reminder is silenced and returns in 5 minutes, and holding while idle pushes the next reminder back 5 minutes. Each hold adds another 5.
- **Press** the key when no reminder is due to preview how it looks and sounds (4 seconds, schedule unchanged).
- Set how many air squats to do in the **Air squats** field; the flashing key shows that number. Leave it blank for 10.
- Configure the minute past the hour (0-59; the panel shows the actual times, e.g. "15 min past the hour: 10:15, 11:15, 12:15...") and an optional custom alert sound in the key's property inspector. Leave the sound empty (or click **Use default sound**) for the built-in beep. Custom sounds play for at most 10 seconds; WAV, MP3, M4A and similar are supported on Windows, and whatever `afplay` supports on macOS.

## Requirements

Stream Deck app 7.1 or later, Windows 10+ or macOS 13+. Sound uses PowerShell's `SoundPlayer` on Windows and `afplay` on macOS. Building needs Node.js 24 (the version the Elgato docs recommend). `.nvmrc` and the dev container pin 24.22.3. With nvm, run `nvm install 24` and `nvm use 24` (nvm-windows ignores `.nvmrc`, so name the version). The plugin also runs on Stream Deck's Node 24 runtime.

## Build and install

```sh
npm install
npm run assets     # only needed if you change scripts/generate-assets.mjs
npm run link       # builds, then links the plugin into Stream Deck (one-off)
```

Then drag **Air Squats > Air Squats** onto a key. For development, `npm run watch` rebuilds and restarts the plugin on save. `npm run unlink` removes the link. `npm run pack` builds and writes a distributable `.streamDeckPlugin` to `dist/`.

The dev container (`.devcontainer/`) is for editing and building only. It cannot link to or restart the Stream Deck app or play sound, so run `link`, `watch` and `pack` outputs on the host machine.

## Layout

- `src/actions/air-squats.ts`: the action (scheduling, flashing, press/hold handling)
- `src/schedule.ts`, `src/render.ts`, `src/sound.ts`: time maths, key images (SVG), audio
- `com.peterneave.streamdeck-plugin-airsquats.sdPlugin/`: manifest, property inspector (`ui/`), icons and `sounds/alert.wav`
