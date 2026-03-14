import * as THREE from 'three'
import { config } from './config.js'
import { createScene } from './scene.js'
import { loadLogo } from './loadLogo.js'

const app = document.querySelector<HTMLDivElement>('#app')!
if (!app) throw new Error('#app not found')

const sceneApi = createScene(app, config)

loadLogo(config)
  .then((logo) => {
    sceneApi.addLogo(logo)
  })
  .catch((err) => {
    console.error('Failed to load logo.glb:', err)
  })

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  sceneApi.update(delta)
}

animate()

function onResize() {
  const w = app.clientWidth
  const h = app.clientHeight
  sceneApi.resize(w, h)
}

window.addEventListener('resize', onResize)
onResize()
