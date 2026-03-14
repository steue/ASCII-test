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

## Push to GitHub and deploy

1. **Set your Git identity** (once per machine if not set):
   ```bash
   git config --global user.email "your@email.com"
   git config --global user.name "Your Name"
   ```

2. **Create a new repository on GitHub** (e.g. `ASCII-test`). Do **not** add a README or .gitignore (this repo already has them).

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Initial commit: ASCII logo scene"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

4. **Enable GitHub Pages:** In the repo on GitHub go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.

- **Test:** Every push and pull request runs `npm run build` so you can see if the project builds.
- **Deploy:** Pushing to `main` builds and deploys the app to GitHub Pages. The site will be at `https://<your-username>.github.io/<repo-name>/`.
- If your repo name is not `ASCII-test`, edit `vite.config.ts` and change `'/ASCII-test/'` to `'/<your-repo-name>/'`.
