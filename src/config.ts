/**
 * Art-direction config for the ASCII logo scene.
 * Tweak these to change density, character set, scale, framing, and motion.
 */

export interface Config {
  // ASCII effect
  /** Character set for ASCII (darker → brighter). More chars = finer gradation. */
  characters: string
  /** Resolution factor for ASCII grid (e.g. 0.15 = coarser, 0.25 = denser). */
  resolution: number
  /** Scale of ASCII font relative to resolution. */
  asciiScale: number
  /** 'low' | 'medium' | 'high' – affects letter-spacing. */
  strResolution: 'low' | 'medium' | 'high'
  invert: boolean

  // Colors & typography (applied via CSS to effect.domElement)
  backgroundColor: string
  foregroundColor: string
  fontFamily: string
  /** Base font size in px (ASCII effect also derives size from resolution/scale). */
  fontSize: number
  lineHeight: number

  // Logo
  /** Target size for the logo's largest dimension in world units. */
  logoTargetSize: number
  /** Initial rotation [x, y, z] in radians if Spline export is off-axis. */
  initialRotation: [number, number, number]
  /** Override materials with a single flat material for consistent ASCII shading. */
  materialOverride: boolean

  // Camera
  cameraFov: number
  /** Multiplier on computed distance so logo fills frame (e.g. 1.2 = slightly loose). */
  cameraDistanceFactor: number
  cameraYOffset: number
  /** Azimuth in radians for 3/4 view (0 = front). */
  cameraAzimuth: number

  // Lighting
  keyLightIntensity: number
  fillLightIntensity: number
  ambientIntensity: number
  keyLightColor: number
  fillLightColor: number
  ambientColor: number

  // Motion
  autoRotateSpeedY: number
  autoRotateSpeedX: number
  /** Enable OrbitControls for mouse drag. */
  orbitControlsEnabled: boolean
}

export const config: Config = {
  characters: ' .:-+*=%@#',
  resolution: 0.18,
  asciiScale: 1,
  strResolution: 'medium',
  invert: false,

  backgroundColor: '#2563ff',
  foregroundColor: '#ffffff',
  fontFamily: '"IBM Plex Mono", "SF Mono", Consolas, monospace',
  fontSize: 14,
  lineHeight: 14,

  logoTargetSize: 1.2,
  initialRotation: [0, 0, 0],
  materialOverride: true,

  cameraFov: 40,
  cameraDistanceFactor: 1.15,
  cameraYOffset: 0,
  cameraAzimuth: 0,

  keyLightIntensity: 1.2,
  fillLightIntensity: 0.4,
  ambientIntensity: 0.25,
  keyLightColor: 0xffffff,
  fillLightColor: 0xffffff,
  ambientColor: 0xffffff,

  autoRotateSpeedY: 0.15,
  autoRotateSpeedX: 0,
  orbitControlsEnabled: true,
}

// Presets: duplicate the config object and override keys, then export as config.
// e.g. ultra-dense: characters: ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$', resolution: 0.22
// e.g. chunky: characters: ' .#', resolution: 0.12
