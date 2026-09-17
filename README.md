# Chameleon

A Vue 3 image explorer with a Trystero peer-to-peer connection service, using the supplied sports-ground illustration.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. Explore immediately without connecting. Choose a room, select **Hunter** or **Hider**, and join to play together. A second participant is optional. Use **Invite a friend** to copy a URL containing the room name; open it on another browser/device and connect to see each other’s pointers. Each participant controls their own view.

- Drag to pan, with momentum on release.
- Scroll or pinch to zoom around the pointer/fingers.
- Double-click to zoom in; use + / − controls to zoom and the fit button to reset.
- Focus the viewer to use arrow keys, + / −, and 0 (fit).
- The small overview tracks your visible region.

## Player roles

Choose Hunter or Hider before joining. Hunters explore with a shared cursor. Hiders appear as a white SVG circle with a subtle drop shadow; drag your circle with a mouse or touch to move it. Clicking or tapping the background does not reposition your player. Dragging the background pans without moving your hiding spot. Player dragging respects the current zoom and stays within image bounds. Circles stay anchored to the image and scale with it as players zoom. New peers receive your latest position, even if you are standing still. Leave the room to return to spectating or choose a different role.

Hiders can select **Paint** beside the room card to lock the camera onto their circle. Paint directly on the player with the color picker and brush-size slider above the minimap. Undo removes the last stroke; Clear restores white. Done restores the previous view. Paint is clipped to the circle and shared with room peers after each stroke, including players who join later.

This is the role and placement foundation; round timers, catching hiders, and scoring are not implemented yet.

## Add images

Put scene images in `src/assets/images/` (subfolders work too). The scene selector discovers JPG/JPEG, PNG, WebP, AVIF, GIF, SVG, and BMP files automatically. File names become scene titles: `mountain-lake.webp` appears as “mountain lake”. No image list or code changes are needed. Vite updates the list during development; rebuild with `npm run build` after adding images to a deployed site.

Images start fully fitted and centered without stretching or cropping, regardless of aspect ratio. Empty space around a portrait or panorama is intentional; zoom to fill the screen. Zoom supports filling the viewport and reaching at least native resolution. The overview matches the image's proportions. Original files stay intact. Actual file size and maximum decoded dimensions depend on the browser and device memory; resize extremely large images if they exceed those limits. Formats must be supported by the browser, and SVG files should declare intrinsic dimensions or a viewBox.

The scene menu changes your own view. Invite links include the selected scene, and shared cursors only show for peers viewing the same scene. Everyone needs the same image files in their deployed app; this app does not upload or transfer image files between peers.

## Validate

```sh
npm test
npm run build
npm run preview
```

Tests cover portrait, panoramic, square, tiny, and large image geometry, zoom anchoring, bounds, zoom limits, relay connection state, peer presence, cursor validation, and join failures. Live WebRTC pairing and touch interaction require browser verification.

## Structure

- `src/services/connection.js`: reactive connection state, relay monitoring, peer lifecycle, pointer messaging, cleanup.
- `src/services/viewport.js`: viewport math.
- `src/components/ImageExplorer.vue`: requestAnimationFrame animation, inertial pan, pointer/pinch handling, zoom controls, overview.
- `src/App.vue`: room and invitation interface.

Uses Trystero 0.24’s default Nostr signaling network. Internet access and accessible public relays are required; some networks may prevent WebRTC pairing. A connected relay means discovery is available, not that another participant has joined. The room displays the actual participant count. There is no application backend or account system. Production should be served over HTTPS for clipboard and WebRTC support.

Trystero API reference: https://github.com/dmotz/trystero/tree/v0.24.0

## GitHub Pages build branch

The `.github/workflows/gh-pages.yml` workflow runs on pushes to `main` or manually from Actions. It installs locked dependencies, runs tests, builds with relative asset URLs, and commits `dist/` to `gh-pages`. Existing deployment history is preserved, and unchanged builds do not create new commits.

Push this repository to GitHub to run the workflow. The generated branch contains a `.nojekyll` file and the site at its root. No remote is configured automatically. To serve that branch, configure the repository's Pages publishing settings; branch updates made using `GITHUB_TOKEN` do not themselves trigger a Pages build, so automatic live deployment requires a separate Pages deployment workflow or an appropriately configured publishing token.
