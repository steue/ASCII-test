# ASCII Logo Scene

A minimal Three.js experiment that renders a 3D logo (exported from Spline) as white ASCII art on a bright blue background. Art direction is controlled from `src/config.ts`.

## Setup

1. `npm install`
2. Export your logo from Spline as **logo.glb** and place it in **public/logo.glb**.
3. `npm run dev` — open the URL shown (e.g. http://localhost:5173).

## Scripts

- **npm run dev** — start dev server
- **npm run build** — production build to `dist/`
- **npm run preview** — serve the production build

## Tuning

Edit **src/config.ts** to adjust:

- **ASCII**: `characters`, `resolution`, `asciiScale`, `strResolution`, `invert`
- **Look**: `backgroundColor`, `foregroundColor`, `fontFamily`, `fontSize`, `lineHeight`
- **Logo**: `logoTargetSize`, `initialRotation`, `materialOverride`
- **Camera**: `cameraFov`, `cameraDistanceFactor`, `cameraYOffset`, `cameraAzimuth`
- **Lighting**: `keyLightIntensity`, `fillLightIntensity`, `ambientIntensity`, and colors
- **Motion**: `autoRotateSpeedY`, `autoRotateSpeedX`, `orbitControlsEnabled`

Drag to orbit; the logo auto-rotates gently.

## Viewing the deployment

The app is deployed with **GitHub Pages** via GitHub Actions.

- **Live site:** `https://<your-username>.github.io/<repo-name>/`  
  Example: if your repo is `ASCII-test` and your username is `jane`, open **https://jane.github.io/ASCII-test/**.

- **Where to find it on GitHub:** Open your repo → **Settings → Pages**. Under "Build and deployment" you’ll see the published URL. You can also click the **Environments** link in the right sidebar (or the green check on the latest commit) to open the deployment.

- **After a push:** Each push to `main` triggers a new build and deploy. Check the **Actions** tab to see build status; when the workflow is green, the site is updated.
