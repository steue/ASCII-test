# ASCII ASCII-test React app

An interactive React + Three.js experiment that renders 3D models (ice cream, present, or your own `.glb` / `.gltf`) as ASCII art.

## Setup

1. `npm install`
2. Place your preset models in `public/`, for example:
   - `public/ice_cream.glb`
   - `public/present.glb`
3. `npm run dev` — open the URL shown by Vite (e.g. http://localhost:5173).

## Scripts

- **npm run dev** — start dev server
- **npm run build** — production build to `dist/`
- **npm run preview** — serve the production build

## Usage

- The app mounts from `src/main.tsx` and renders the React component in `src/App.tsx`.
- The default preset model is the ice cream (`ice_cream.glb`), with a second preset for the present (`present.glb`).
- You can also upload your own `.glb` / `.gltf` model from the UI; it is loaded at runtime and not written to disk.

## Deployment

The app is deployed with **GitHub Pages** via GitHub Actions.

- **Live site:** `https://<your-username>.github.io/<repo-name>/`  
  Example: if your repo is `ASCII-test` and your username is `jane`, open `https://jane.github.io/ASCII-test/`.

- **Where to find it on GitHub:** Open your repo → **Settings → Pages**. Under "Build and deployment" you’ll see the published URL. You can also click the **Environments** link in the right sidebar (or the green check on the latest commit) to open the deployment.

- **After a push:** Each push to `main` triggers a new build and deploy. Check the **Actions** tab to see build status; when the workflow is green, the site is updated.
