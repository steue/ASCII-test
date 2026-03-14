import * as THREE from 'three'
import { AsciiEffect, type AsciiEffectOptions } from 'three/examples/jsm/effects/AsciiEffect.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Config } from './config.js'

export interface SceneApi {
  update: (delta: number) => void
  resize: (width: number, height: number) => void
  dispose: () => void
  addLogo: (logo: THREE.Object3D) => void
}

export function createScene(container: HTMLElement, cfg: Config): SceneApi {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(cfg.backgroundColor)

  const camera = new THREE.PerspectiveCamera(
    cfg.cameraFov,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  )
  const distance = 5 * cfg.cameraDistanceFactor
  camera.position.set(
    Math.sin(cfg.cameraAzimuth) * distance,
    cfg.cameraYOffset + distance * 0.1,
    Math.cos(cfg.cameraAzimuth) * distance
  )
  camera.lookAt(0, 0, 0)

  // Lights
  const keyLight = new THREE.DirectionalLight(cfg.keyLightColor, cfg.keyLightIntensity)
  keyLight.position.set(5, 8, 10)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(cfg.fillLightColor, cfg.fillLightIntensity)
  fillLight.position.set(-6, 4, -5)
  scene.add(fillLight)

  const ambient = new THREE.AmbientLight(cfg.ambientColor, cfg.ambientIntensity)
  scene.add(ambient)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.domElement.style.display = 'none'

  const effect = new AsciiEffect(renderer, cfg.characters, {
    resolution: cfg.resolution,
    scale: cfg.asciiScale,
    invert: cfg.invert,
    strResolution: cfg.strResolution,
    color: true,
  } as AsciiEffectOptions)
  effect.setSize(container.clientWidth, container.clientHeight)
  effect.domElement.style.backgroundColor = cfg.backgroundColor
  effect.domElement.style.color = cfg.foregroundColor
  effect.domElement.style.fontFamily = cfg.fontFamily
  effect.domElement.style.fontSize = `${cfg.fontSize}px`
  effect.domElement.style.lineHeight = `${cfg.lineHeight}px`
  container.appendChild(effect.domElement)

  let controls: OrbitControls | null = null
  if (cfg.orbitControlsEnabled) {
    controls = new OrbitControls(camera, effect.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0, 0)
  }

  let logo: THREE.Object3D | null = null

  function update(delta: number) {
    if (logo) {
      logo.rotation.y += cfg.autoRotateSpeedY * delta
      logo.rotation.x += cfg.autoRotateSpeedX * delta
    }
    controls?.update()
    effect.render(scene, camera)
  }

  function resize(width: number, height: number) {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    effect.setSize(width, height)
  }

  function dispose() {
    controls?.dispose()
    container.removeChild(effect.domElement)
    renderer.dispose()
  }

  function addLogo(obj: THREE.Object3D) {
    if (logo) scene.remove(logo)
    logo = obj
    scene.add(logo)
  }

  return { update, resize, dispose, addLogo }
}
