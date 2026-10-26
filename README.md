# NO RETURN

A browser-based island survival horror game with single-player and private 2–4 player co-op.

**Play:** https://aflyingkelp.github.io/no-return/

Use the Multiplayer tab to create a room, share its code, and ready up. The host starts when everyone is ready. Shared objectives, separate backpacks, supply trading, and teammate rescues are supported. The multiplayer service runs separately on Render; the first connection after inactivity can take a minute.

## Hosting

GitHub Pages publishes the root of `main`. `.nojekyll` serves the game assets without Jekyll processing. All game paths are relative so the project URL works without a custom domain. `multiplayer-config.json` points to the multiplayer service.

The server source is managed separately in a private repository. Co-op rooms live in memory and end when the server restarts. This repository contains the browser game and its assets.

## Credits

See [image credits](image-credits.html) and the asset attribution files for third-party artwork and textures. The game is a fictional horror scenario; its encounters do not depict real events.

## Co-op options

The host chooses 1–4 hunters in the lobby before everyone readies up. Teammate flashlights illuminate shared scenery and cast shadows even with your own flashlight off. After the 90-second rescue window expires, eliminated survivors spectate their teammates and can switch cameras with Previous / Next. Hunters have a narrower forward field of view and shorter visual detection range; hearing still matters.

