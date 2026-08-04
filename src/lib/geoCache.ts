import type * as THREE from 'three'

/**
 * Repeated architecture (chhatris, columns, merlons, arch niches, balusters)
 * is built once and shared by reference. Sharing the BufferGeometry across
 * meshes is the cheapest possible form of instancing and keeps the GPU upload
 * count down without giving up per-mesh transforms and frustum culling.
 */
const cache = new Map<string, THREE.BufferGeometry>()

export function cachedGeometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const made = factory()
  cache.set(key, made)
  return made
}

export function disposeGeometryCache() {
  cache.forEach((g) => g.dispose())
  cache.clear()
}
