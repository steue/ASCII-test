import { Suspense, useState, useCallback, useEffect, useRef } from "react";
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
  return (
    <primitive
      object={scene.clone()}
      scale={scale}
      rotation={rotation}
      position={position}
    />
  );
}

const PRESET_MODELS = [
  {
    name: "Logo",
    url: "https://danielcodepen.s3.us-east-1.amazonaws.com/figma.fbx.glb",
    baseScale: 0.8,
    position: [0, -0.2, 0] as [number, number, number],
  },
  {
    name: "Computer",
    url: "https://danielcodepen.s3.us-east-1.amazonaws.com/apple_macintosh.glb",
    baseScale: 0.05,
    position: [0, -0.3, 0] as [number, number, number],
  },
  {
    name: "Plant",
    url: "https://danielcodepen.s3.us-east-1.amazonaws.com/pothos_house_plant.glb",
    baseScale: 5,
    position: [0, -0.75, 0] as [number, number, number],
  },
  {
    name: "Shiba",
    url: "https://danielcodepen.s3.us-east-1.amazonaws.com/shiba.glb",
    baseScale: 1,
    position: [0, 0, 0] as [number, number, number],
  },
  {
    name: "Crystal",
    url: "https://danielcodepen.s3.us-east-1.amazonaws.com/crystal_stone_rock.glb",
    baseScale: 2,
    position: [0, 0, 0] as [number, number, number],
  },
];

const CUSTOM_MODEL_DEFAULTS = {
  baseScale: 1,
  position: [0, 0, 0] as [number, number, number],
};

export default function App() {
  const [selectedModel, setSelectedModel] = useState(PRESET_MODELS[0].url);
  const [userScale, setUserScale] = useState(1);
  const [customFile, setCustomFile] = useState<{ url: string; name: string } | null>(null);

  const [asciiSettings, setAsciiSettings] = useState({
    resolution: 0.22,
    characters: " .:-=+*#%@",
    fgColor: "#ffffff",
    bgColor: "#007BE5",
    invert: false,
  });

  const [copiedToast, setCopiedToast] = useState(false);
  const [fallbackModalText, setFallbackModalText] = useState<string | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

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
      fgColor: "#ffffff",
      bgColor: "#007BE5",
      invert: false,
    });
    setUserScale(1);
  };

  const handleModelChange = (url: string) => {
    setSelectedModel(url);
  };

  const handleCopyAscii = useCallback(() => {
    const table = canvasWrapRef.current?.querySelector("table");
    const td = table?.querySelector("td");
    const text = td?.innerText?.trim();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      })
      .catch(() => {
        setFallbackModalText(text);
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
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
          }}
        >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />

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
          autoRotate
          autoRotateSpeed={2}
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
              className="text-left font-mono text-[15px] text-white/80 hover:text-white transition-opacity hover:opacity-100 block"
              style={fontStyle}
            >
              Upload .glb / .gltf
            </span>
          </label>
          {PRESET_MODELS.map((model) => (
            <button
              key={model.url}
              onClick={() => handleModelChange(model.url)}
              className={`text-left font-mono text-[15px] transition-opacity hover:opacity-80 ${
                selectedModel === model.url ? "text-white opacity-100" : "text-white/60"
              }`}
              style={fontStyle}
            >
              {model.name}
            </button>
          ))}
          {customFile && (
            <button
              onClick={() => handleModelChange(customFile.url)}
              className={`text-left font-mono text-[15px] transition-opacity hover:opacity-80 truncate max-w-[180px] ${
                selectedModel === customFile.url ? "text-white opacity-100" : "text-white/60"
              }`}
              style={fontStyle}
              title={customFile.name}
            >
              Your model
            </button>
          )}
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
            zIndex: 2147483647,
            padding: 16,
            minWidth: 220,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            background: "rgba(0, 123, 229, 0.85)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.3)",
            fontFamily: "DM Mono, monospace",
            color: "#fff",
            fontSize: 15,
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Model</label>
            <label
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
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
                { name: ".:-=+*#%@", chars: " .:-=+*#%@" },
                { name: ".-+*#", chars: " .-+*#" },
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
                      border: "1px solid rgba(255,255,255,0.4)",
                      background: isActive ? "rgba(255,255,255,0.3)" : "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 15,
                    }}
                    onClick={() =>
                      setAsciiSettings((prev) => ({ ...prev, characters: preset.chars }))
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
                accentColor: "#fff",
                cursor: "pointer",
              }}
            />
            <div style={{ marginTop: 4, opacity: 0.8 }}>{asciiSettings.resolution.toFixed(3)}</div>
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
                accentColor: "#fff",
                cursor: "pointer",
              }}
            />
            <div style={{ marginTop: 4, opacity: 0.8 }}>{userScale.toFixed(2)}</div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
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
              border: "1px solid rgba(255,255,255,0.4)",
              background: "transparent",
              color: "#fff",
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
              border: "1px solid rgba(255,255,255,0.4)",
              background: "transparent",
              color: "#fff",
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
