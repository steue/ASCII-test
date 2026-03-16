import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import type { Mesh, PerspectiveCamera } from "three";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  AsciiRenderer,
  useGLTF,
  Environment,
} from "@react-three/drei";

const MODEL_ACCEPT = ".glb,.gltf";

interface ModelProps {
  scale: number;
  rotation: [number, number, number];
  modelUrl: string;
  position: [number, number, number];
}

function Model({
  scale,
  rotation,
  modelUrl,
  position,
}: ModelProps) {
  const { scene } = useGLTF(modelUrl);
  const cloned = scene.clone();
  cloned.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        (mesh.material as any).needsUpdate = true;
      }
    }
  });
  return (
    <primitive
      object={cloned}
      scale={scale}
      rotation={rotation}
      position={position}
    />
  );
}

const PRESET_MODELS = [
  {
    name: "Icecream",
    url: "/ice_cream.glb",
    baseScale: 0.8,
    position: [0, 0, 0] as [number, number, number],
  },
  {
    name: "Present",
    url: "/present.glb",
    baseScale: 0.8,
    position: [0, 0, 0] as [number, number, number],
  },
];

const CUSTOM_MODEL_DEFAULTS = {
  baseScale: 1,
  position: [0, 0, 0] as [number, number, number],
};

/** Parse hex to 0–255 RGB. Supports #RGB and #RRGGBB. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, "").match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/** Relative luminance (0–1) for contrast. */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** RGB to HSL (H 0–360, S and L 0–1). */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, l };
}

/** HSL to RGB (H 0–360, S and L 0–1), returns 0–255. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Hex from RGB. */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

const MIN_CONTRAST = 4.5;

/** Same hue and chroma as fgHex, but lightness adjusted for good contrast on bgHex. */
function ensureContrast(fgHex: string, bgHex: string): string {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return fgHex;
  const bgLum = luminance(bg.r, bg.g, bg.b);
  const { h, s } = rgbToHsl(fg.r, fg.g, fg.b);
  let fgLum = luminance(fg.r, fg.g, fg.b);

  const needLighter = bgLum < 0.5; // dark bg → need lighter fg
  const targetFgLum = needLighter
    ? Math.max(fgLum, MIN_CONTRAST * (bgLum + 0.05) - 0.05)
    : Math.min(fgLum, (bgLum + 0.05) / MIN_CONTRAST - 0.05);

  if (needLighter ? fgLum >= targetFgLum : fgLum <= targetFgLum) return fgHex;

  // Binary search on L in HSL to hit target luminance
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const { r, g, b } = hslToRgb(h, s, mid);
    const lum = luminance(r, g, b);
    if (needLighter) {
      if (lum >= targetFgLum) hi = mid;
      else lo = mid;
    } else {
      if (lum <= targetFgLum) lo = mid;
      else hi = mid;
    }
  }
  const L = (lo + hi) / 2;
  const { r, g, b } = hslToRgb(h, s, L);
  return rgbToHex(r, g, b);
}

/** Panel BG: start from control BG, nudge lightness so it’s clearly offset but still related. */
function panelBackgroundFromControl(bgHex: string): string {
  const bg = hexToRgb(bgHex);
  if (!bg) return "#0f0f0f";
  const { h, s, l } = rgbToHsl(bg.r, bg.g, bg.b);
  const delta = 0.06;
  const targetL = l < 0.5 ? Math.min(1, l + delta) : Math.max(0, l - delta);
  const { r, g, b } = hslToRgb(h, s, targetL);
  return rgbToHex(r, g, b);
}

export default function App() {
  const [selectedModel, setSelectedModel] = useState(PRESET_MODELS[0].url);
  const [userScale, setUserScale] = useState(1);
  const [customFile, setCustomFile] = useState<{ url: string; name: string } | null>(null);

  // Camera FOV as focal length (mm-equivalent for a 24mm sensor height)
  const [focalLength, setFocalLength] = useState(50);

  const [asciiSettings, setAsciiSettings] = useState({
    resolution: 0.22,
    characters: " .:-=+*#%@",
    fgColor: "#BEFF00",
    bgColor: "#000000",
    invert: false,
  });

  // Camera + lighting controls
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(2);
  const [brightness, setBrightness] = useState(1.5); // overall light intensity multiplier
  const [exposure, setExposure] = useState(1.2); // renderer exposure multiplier
  const [contrast, setContrast] = useState(1); // redistributes light between ambient and key
  const [lightRotX, setLightRotX] = useState(30); // light rotation around X axis (deg)
  const [lightRotY, setLightRotY] = useState(45); // light rotation around Y axis (deg)
  const [lightRotZ, setLightRotZ] = useState(0); // light rotation around Z axis (deg)

  const [copiedToast, setCopiedToast] = useState(false);
  const [fallbackModalText, setFallbackModalText] = useState<string | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<any>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);

  // Revoke object URL when custom file changes or unmount
  useEffect(() => {
    return () => {
      if (customFile?.url) URL.revokeObjectURL(customFile.url);
    };
  }, [customFile?.url]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (customFile?.url) URL.revokeObjectURL(customFile.url);
    const url = URL.createObjectURL(file);
    setCustomFile({ url, name: file.name });
    setSelectedModel(url);
    e.target.value = "";
  }, [customFile?.url]);

  const resetSettings = () => {
    setAsciiSettings({
      resolution: 0.22,
      characters: " .:-=+*#%@",
      fgColor: "#BEFF00",
      bgColor: "#000000",
      invert: false,
    });
    setUserScale(1);
    setBrightness(1.5);
    setExposure(1.2);
    setContrast(1);
    setLightRotX(30);
    setLightRotY(45);
    setLightRotZ(0);
    setAutoRotate(true);
    setAutoRotateSpeed(2);
    setSelectedModel(PRESET_MODELS[0].url);
    setCustomFile(null);
    setFocalLength(50);
  };

  const handleModelChange = (url: string) => {
    setSelectedModel(url);
  };

  const handleCopyAscii = useCallback(() => {
    const table = canvasWrapRef.current?.querySelector("table");
    if (!table) return;

    // Get full ASCII as plain text
    const rawText = (table as HTMLElement).innerText.replace(/\r\n/g, "\n");
    const lines = rawText.split("\n");

    // Find smallest common left indentation (ignoring empty lines)
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const commonIndent =
      nonEmptyLines.length > 0
        ? Math.min(
            ...nonEmptyLines.map((line) => {
              const match = line.match(/^(\s*)/);
              return match ? match[1].length : 0;
            })
          )
        : 0;

    // Strip common left indent, then remove empty rows at top/bottom
    const strippedLines = lines.map((line) =>
      commonIndent > 0 ? line.slice(commonIndent) : line
    );

    // Remove leading completely blank rows
    while (strippedLines.length && strippedLines[0].trim().length === 0) {
      strippedLines.shift();
    }
    // Remove trailing completely blank rows
    while (
      strippedLines.length &&
      strippedLines[strippedLines.length - 1].trim().length === 0
    ) {
      strippedLines.pop();
    }

    // Add a small, consistent left margin (4 spaces) to non-empty lines
    const INDENT = "    ";
    const normalizedText = strippedLines
      .map((line) => (line.trim().length ? INDENT + line : line))
      .join("\n")
      .trimEnd();

    if (!normalizedText) return;

    navigator.clipboard
      .writeText(normalizedText)
      .then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      })
      .catch(() => {
        setFallbackModalText(normalizedText);
      });
  }, []);

  const currentPreset = PRESET_MODELS.find((m) => m.url === selectedModel);
  const isCustom = customFile && selectedModel === customFile.url;

  const baseScale = isCustom
    ? CUSTOM_MODEL_DEFAULTS.baseScale
    : currentPreset?.baseScale ?? 1;
  const position: [number, number, number] = isCustom
    ? CUSTOM_MODEL_DEFAULTS.position
    : currentPreset?.position ?? [0, 0, 0];
  const finalScale = baseScale * userScale;

  const fontStyle = { fontFamily: "DM Mono, monospace" };

  const activePresetChars = asciiSettings.characters;

  /** UI color over canvas: same hue/chroma as FG, contrast against ASCII BG. */
  const uiColor = ensureContrast(asciiSettings.fgColor, asciiSettings.bgColor);
  /** Panel BG is derived from the control BG but nudged in lightness so it’s a few shades offset. */
  const panelBg = panelBackgroundFromControl(asciiSettings.bgColor);
  /** Panel UI color: same hue/chroma as FG, contrast-safe over the panel background. */
  const uiColorPanel = ensureContrast(asciiSettings.fgColor, panelBg);

  // Map brightness/contrast into actual light intensities.
  const clampedContrast = Math.max(0.2, Math.min(3, contrast));

  // Higher contrast → relatively less ambient, more directional.
  const ambientIntensity = 0.5 * brightness * (2.2 - 0.8 * clampedContrast);
  const keyIntensity = 1 * brightness * (0.6 + 0.8 * clampedContrast);

  // Directional light position from base vector rotated by XYZ Euler (in degrees).
  const deg2rad = Math.PI / 180;
  const rx = lightRotX * deg2rad;
  const ry = lightRotY * deg2rad;
  const rz = lightRotZ * deg2rad;

  // Start with a forward vector and rotate X, then Y, then Z.
  let lx = 0;
  let ly = 0;
  let lz = 1;

  // Rotate around X
  {
    const c = Math.cos(rx);
    const s = Math.sin(rx);
    const ny = ly * c - lz * s;
    const nz = ly * s + lz * c;
    ly = ny;
    lz = nz;
  }

  // Rotate around Y
  {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const nx = lx * c + lz * s;
    const nz = -lx * s + lz * c;
    lx = nx;
    lz = nz;
  }

  // Rotate around Z
  {
    const c = Math.cos(rz);
    const s = Math.sin(rz);
    const nx = lx * c - ly * s;
    const ny = lx * s + ly * c;
    lx = nx;
    ly = ny;
  }

  const lightRadius = 10;
  const keyLightPosition: [number, number, number] = [lx * lightRadius, ly * lightRadius, lz * lightRadius];

  // Map focal length (mm) to vertical FOV assuming 24mm sensor height
  const focalToFov = (f: number) => {
    const sensorHeight = 24;
    return (2 * Math.atan((sensorHeight / 2) / f) * 180) / Math.PI;
  };

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = focalToFov(focalLength);
      cameraRef.current.updateProjectionMatrix();
    }
  }, [focalLength]);

  // Keep renderer exposure in sync with control
  useEffect(() => {
    if (glRef.current) {
      glRef.current.toneMappingExposure = exposure;
    }
  }, [exposure]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <style>{`
        .slider-white [data-orientation="horizontal"] {
          background: rgba(255, 255, 255, 0.2);
          height: 6px !important;
        }
        .slider-white [data-orientation="horizontal"] [role="slider"] {
          background: white !important;
          border: 2px solid white !important;
          border-color: white !important;
          width: 18px !important;
          height: 18px !important;
        }
        .slider-white [data-orientation="horizontal"] .bg-primary {
          background: white !important;
        }
        .slider-white [data-orientation="horizontal"] [data-orientation="horizontal"] {
          background: rgba(255, 255, 255, 0.2);
          height: 6px !important;
        }
        .slider-white .slider-thumb {
          background: white !important;
          border: 2px solid white !important;
          width: 18px !important;
          height: 18px !important;
        }
        .slider-white [data-radix-collection-item] {
          background: white !important;
          border: 2px solid white !important;
          width: 18px !important;
          height: 18px !important;
        }
      `}</style>

      <div className="canvas-wrap" ref={canvasWrapRef}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: focalToFov(focalLength) }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={({ gl, camera }) => {
            glRef.current = gl;
            gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
            gl.toneMappingExposure = exposure;
            cameraRef.current = camera as PerspectiveCamera;
          }}
        >
          <ambientLight intensity={ambientIntensity} />
          <directionalLight position={keyLightPosition} intensity={keyIntensity} />

          <Suspense fallback={null}>
            <Model
              key={selectedModel}
              scale={finalScale}
              rotation={[0, 0, 0]}
              modelUrl={selectedModel}
              position={position}
            />
            <Environment preset="studio" />
          </Suspense>

          <Suspense fallback={null}>
            <AsciiRenderer
              key={`${asciiSettings.resolution}-${asciiSettings.characters}-${asciiSettings.fgColor}-${asciiSettings.bgColor}-${asciiSettings.invert}`}
              resolution={asciiSettings.resolution}
              characters={asciiSettings.characters}
              fgColor={asciiSettings.fgColor}
              bgColor={asciiSettings.bgColor}
              invert={asciiSettings.invert}
            />
          </Suspense>

          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            enablePan
            enableZoom
            enableRotate
          />
        </Canvas>
      </div>

      {/* Left Panel - Model selection + Upload (z-[100] so above ASCII overlay) */}
      <div className="absolute left-14 top-1/2 -translate-y-1/2 z-[100] pointer-events-auto">
        <div className="flex flex-col space-y-8">
          <label className="cursor-pointer">
            <input
              type="file"
              accept={MODEL_ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <span
              className="text-left font-mono text-[15px] transition-opacity hover:opacity-100 block"
              style={{ ...fontStyle, color: uiColor, opacity: 0.9 }}
            >
              Your Model
            </span>
          </label>
          {PRESET_MODELS.map((model) => (
            <button
              key={model.url}
              onClick={() => handleModelChange(model.url)}
              className="text-left font-mono text-[15px] transition-opacity hover:opacity-100"
              style={{
                ...fontStyle,
                color: uiColor,
                opacity: selectedModel === model.url ? 1 : 0.7,
              }}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Controls: rendered in portal so always on top */}
      {createPortal(
        <div
          style={{
            position: "fixed",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2147483600,
            padding: 16,
            minWidth: 220,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            background: panelBg,
            borderRadius: 10,
            border: `1px solid ${uiColorPanel}`,
            fontFamily: "DM Mono, monospace",
            color: uiColorPanel,
            fontSize: 15,
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Upload custom Model</label>
            <label
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 6,
                border: `1px solid ${uiColorPanel}`,
                background: `${uiColorPanel}20`,
                color: uiColorPanel,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <input
                type="file"
                accept={MODEL_ACCEPT}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              Upload .glb / .gltf
            </label>
            {customFile && (
              <div style={{ marginTop: 6, opacity: 0.9, fontSize: 13 }} title={customFile.name}>
                Loaded: {customFile.name.length > 20 ? customFile.name.slice(0, 17) + "…" : customFile.name}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Presets</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: ".:-=+*#%@", chars: " .:-=+*#%@", resolution: 0.22 },
                { name: ".-+*#", chars: " .-+*#", resolution: 0.2 },
                { name: "Blocky", chars: " ∙≈░▒▓█", resolution: 0.16 },
              ].map((preset) => {
                const isActive = activePresetChars === preset.chars;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${uiColorPanel}`,
                      background: isActive ? `${uiColorPanel}30` : "transparent",
                      color: uiColorPanel,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 15,
                    }}
                    onClick={() =>
                      setAsciiSettings((prev) => ({
                        ...prev,
                        characters: preset.chars,
                        resolution: preset.resolution ?? prev.resolution,
                      }))
                    }
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Resolution</label>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.01}
              value={asciiSettings.resolution}
              onChange={(e) =>
                setAsciiSettings((prev) => ({
                  ...prev,
                  resolution: Number(e.target.value),
                }))
              }
              style={{
                width: "100%",
                height: 6,
                accentColor: uiColorPanel,
                cursor: "pointer",
              }}
            />
            <div style={{ marginTop: 4, opacity: 0.8, color: uiColorPanel }}>{asciiSettings.resolution.toFixed(3)}</div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Scale</label>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={userScale}
              onChange={(e) => setUserScale(Number(e.target.value))}
              style={{
                width: "100%",
                height: 6,
                accentColor: uiColorPanel,
                cursor: "pointer",
              }}
            />
            <div style={{ marginTop: 4, opacity: 0.8, color: uiColorPanel }}>{userScale.toFixed(2)}</div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Text color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="color"
                value={asciiSettings.fgColor}
                onChange={(e) =>
                  setAsciiSettings((prev) => ({ ...prev, fgColor: e.target.value }))
                }
                style={{
                  width: 40,
                  height: 32,
                  padding: 2,
                  border: `1px solid ${uiColorPanel}`,
                  borderRadius: 6,
                  background: `${uiColorPanel}20`,
                  cursor: "pointer",
                }}
              />
              <span style={{ opacity: 0.9, fontSize: 13, color: uiColorPanel }}>{asciiSettings.fgColor}</span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Background color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="color"
                value={asciiSettings.bgColor}
                onChange={(e) =>
                  setAsciiSettings((prev) => ({ ...prev, bgColor: e.target.value }))
                }
                style={{
                  width: 40,
                  height: 32,
                  padding: 2,
                  border: `1px solid ${uiColorPanel}`,
                  borderRadius: 6,
                  background: `${uiColorPanel}20`,
                  cursor: "pointer",
                }}
              />
              <span style={{ opacity: 0.9, fontSize: 13, color: uiColorPanel }}>{asciiSettings.bgColor}</span>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: uiColorPanel }}>
            <input
              type="checkbox"
              id="invert-control"
              checked={asciiSettings.invert}
              onChange={(e) =>
                setAsciiSettings((prev) => ({ ...prev, invert: e.target.checked }))
              }
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <span>Invert colors</span>
          </label>

          <button
            type="button"
            onClick={handleCopyAscii}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${uiColorPanel}`,
              background: "transparent",
              color: uiColorPanel,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
            }}
          >
            {copiedToast ? "Copied!" : "Copy ASCII"}
          </button>

          <button
            type="button"
            onClick={resetSettings}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${uiColorPanel}`,
              background: "transparent",
              color: uiColorPanel,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
            }}
          >
            Reset
          </button>
        </div>,
        document.body
      )}

      {/* Bottom-centered camera control bar */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 24,
          transform: "translateX(-50%)",
          zIndex: 2147483647,
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${uiColorPanel}`,
          background: "rgba(15, 15, 15, 0.95)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          fontFamily: "DM Mono, monospace",
          color: uiColorPanel,
          fontSize: 13,
          maxWidth: "90vw",
        }}
      >
        {/* Exposure (renderer tone mapping) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 190 }}>
          <span style={{ whiteSpace: "nowrap" }}>Exposure</span>
          <input
            type="range"
            min={0.4}
            max={3}
            step={0.05}
            value={3.4 - exposure}
            onChange={(e) => {
              const v = Number(e.target.value);
              const inverted = 0.4 + 3 - v;
              setExposure(inverted);
            }}
            style={{
              width: 120,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
        </div>

        {/* Light intensity (base for all lights) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 190 }}>
          <span style={{ whiteSpace: "nowrap" }}>Light inten</span>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.1}
            value={4.2 - brightness}
            onChange={(e) => {
              const v = Number(e.target.value);
              const inverted = 0.2 + 4 - v;
              setBrightness(inverted);
            }}
            style={{
              width: 120,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
        </div>

        {/* Contrast remaps ambient vs key for punchy shading */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 190 }}>
          <span style={{ whiteSpace: "nowrap" }}>Contrast</span>
          <input
            type="range"
            min={0.4}
            max={3}
            step={0.05}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            style={{
              width: 120,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
        </div>

        {/* Light rotation around X/Y/Z axes */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <span style={{ whiteSpace: "nowrap" }}>Light dir</span>
          <input
            type="range"
            min={-90}
            max={90}
            step={1}
            value={lightRotX}
            onChange={(e) => setLightRotX(Number(e.target.value))}
            title="Light X (tilt up/down)"
            style={{
              width: 70,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={lightRotY}
            onChange={(e) => setLightRotY(Number(e.target.value))}
            title="Light Y (orbit around)"
            style={{
              width: 70,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={lightRotZ}
            onChange={(e) => setLightRotZ(Number(e.target.value))}
            title="Light Z (roll / twist)"
            style={{
              width: 70,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
        </div>

        {/* Rotation speed + pause auto-rotation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
          <span style={{ whiteSpace: "nowrap" }}>Auto-rot</span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.1}
            value={autoRotateSpeed}
            onChange={(e) => setAutoRotateSpeed(Number(e.target.value))}
            style={{
              width: 90,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${uiColorPanel}`,
              background: autoRotate ? `${uiColorPanel}20` : "transparent",
              color: uiColorPanel,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {autoRotate ? "Pause rot" : "Play rot"}
          </button>
        </div>

        {/* Focal length / FOV control */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 210 }}>
          <span style={{ whiteSpace: "nowrap" }}>Focal len</span>
          <input
            type="range"
            min={20}
            max={120}
            step={1}
            value={focalLength}
            onChange={(e) => setFocalLength(Number(e.target.value))}
            style={{
              width: 140,
              height: 6,
              accentColor: uiColorPanel,
              cursor: "pointer",
            }}
          />
          <span style={{ minWidth: 42, textAlign: "right" }}>{focalLength.toFixed(0)}mm</span>
        </div>
      </div>

      {/* Fallback modal when clipboard is unavailable */}
      {fallbackModalText !== null &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483647,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            onClick={() => setFallbackModalText(null)}
          >
            <div
              style={{
                background: "#1a1a1a",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                maxWidth: "90vw",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 14,
                }}
              >
                Clipboard unavailable — copy from the box below
              </div>
              <textarea
                readOnly
                value={fallbackModalText}
                style={{
                  width: "100%",
                  minHeight: 200,
                  padding: 12,
                  fontFamily: "DM Mono, monospace",
                  fontSize: 12,
                  lineHeight: 1.2,
                  background: "#0d0d0d",
                  color: "#fff",
                  border: "none",
                  resize: "vertical",
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                type="button"
                onClick={() => setFallbackModalText(null)}
                style={{
                  margin: 12,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.4)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 15,
                }}
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
