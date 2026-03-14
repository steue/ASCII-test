import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Config } from './config.js'

/**
 * Loads /logo.glb, centers it at origin, scales to config.logoTargetSize,
 * applies initialRotation. Optionally overrides materials for flat shading.
 */
export function loadLogo(cfg: Config): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/logo.glb',
      (gltf: GLTF) => {
        const root = gltf.scene

        if (cfg.materialOverride) {
          root.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
              const mesh = node as THREE.Mesh
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                flatShading: true,
              })
            }
          })
        }

        const box = new THREE.Box3().setFromObject(root)
        const center = new THREE.Vector3()
        const size = new THREE.Vector3()
        box.getCenter(center)
        box.getSize(size)

        root.position.sub(center)
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const scale = cfg.logoTargetSize / maxDim
          root.scale.setScalar(scale)
        }

        root.rotation.set(cfg.initialRotation[0], cfg.initialRotation[1], cfg.initialRotation[2])

        resolve(root)
      },
      undefined,
      (err: unknown) => reject(err)
    )
  })
}
