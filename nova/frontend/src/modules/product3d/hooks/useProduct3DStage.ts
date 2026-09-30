import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  CameraViewPresetKey,
  ProceduralMeshType,
  Product3DModel,
  StudioLightingConfig,
} from '../types/product3d.types'
import { buildProceduralProduct } from '../services/proceduralMeshes'

interface UseProduct3DStageProps {
  product?: Product3DModel | null
  baseColorHex?: string
  canvasTexture?: THREE.CanvasTexture | null
  lighting?: Partial<StudioLightingConfig>
}

const DEFAULT_LIGHTING: StudioLightingConfig = {
  ambientIntensity: 0.65,
  ambientColor: 0xfffcf8,
  keyLightIntensity: 1.6,
  keyLightColor: 0xffffff,
  fillLightIntensity: 0.6,
  fillLightColor: 0xd8e4f0,
  rimLightIntensity: 0.9,
  rimLightColor: 0xffeedd,
}

const CAMERA_PRESETS: Record<CameraViewPresetKey, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  front: { pos: new THREE.Vector3(0, 0.2, 5.0), target: new THREE.Vector3(0, 0, 0) },
  back: { pos: new THREE.Vector3(0, 0.2, -5.0), target: new THREE.Vector3(0, 0, 0) },
  profile: { pos: new THREE.Vector3(4.2, 0.6, 3.0), target: new THREE.Vector3(0, 0, 0) },
  detail: { pos: new THREE.Vector3(0, 0.5, 2.5), target: new THREE.Vector3(0, 0.3, 0) },
  top: { pos: new THREE.Vector3(0, 5.5, 0.2), target: new THREE.Vector3(0, 0, 0) },
}

/**
 * useProduct3DStage — Hook arquitectónico para el escenario 3D WebGL PBR con Three.js.
 *
 * Administra el ciclo de vida completo del renderizador, cámara, luces de estudio,
 * OrbitControls, carga de mallas (.glb o procedurales), actualización de material base
 * y prevención estricta de fugas de memoria GPU mediante dispose().
 */
export function useProduct3DStage({
  product,
  baseColorHex = '#ffffff',
  canvasTexture = null,
  lighting = {},
}: UseProduct3DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const currentModelGroupRef = useRef<THREE.Group | null>(null)
  const overlayMeshRef = useRef<THREE.Mesh | null>(null)

  // Objetivos de interpolación suave de cámara
  const targetCamPosRef = useRef<THREE.Vector3>(CAMERA_PRESETS.front.pos.clone())
  const targetCamLookRef = useRef<THREE.Vector3>(CAMERA_PRESETS.front.target.clone())
  const isTransitioningCameraRef = useRef(false)

  const [activeView, setActiveView] = useState<CameraViewPresetKey>('front')
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  // ─── 1. Inicialización del Escenario Three.js ────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Escenario con fondo de estudio fotográfico (degradado oscuro neutro)
    // El color negro profundo elimina distraccciones visuales y potencia el PBR
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111318)
    scene.fog = new THREE.FogExp2(0x111318, 0.035) // niebla suave para profundidad
    sceneRef.current = scene

    // Cámara con FOV de 45° para evitar distorsión de perspectiva en productos de e-commerce
    const width = container.clientWidth || 600
    const height = container.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.copy(CAMERA_PRESETS.front.pos)
    cameraRef.current = camera

    // Renderizador WebGL PBR de alta fidelidad
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Requerido para capturar snapshots con jsPDF
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25  // Más exposición para materiales PBR en entorno oscuro
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap  // PCFSoft deprecated en Three.js 0.185+

    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controles de Órbita
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.5
    controls.maxDistance = 8.5
    // Evita que el usuario rote la cámara por debajo del piso
    controls.maxPolarAngle = Math.PI / 2 + 0.08
    controlsRef.current = controls

    // ─── Iluminación de Estudio Fotográfico PBR (3 Puntos + Ambiente + Spec) ─
    const lightsConfig = { ...DEFAULT_LIGHTING, ...lighting }

    // Ambiente cálido general
    const ambientLight = new THREE.AmbientLight(lightsConfig.ambientColor, lightsConfig.ambientIntensity)
    scene.add(ambientLight)

    // Key Light: Principal — cálida, 45° superior derecha — sombras 2K de alta fidelidad
    const keyLight = new THREE.DirectionalLight(lightsConfig.keyLightColor, lightsConfig.keyLightIntensity)
    keyLight.position.set(3.5, 5.0, 4.0)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 18
    keyLight.shadow.camera.left = -5
    keyLight.shadow.camera.right = 5
    keyLight.shadow.camera.top = 5
    keyLight.shadow.camera.bottom = -5
    keyLight.shadow.bias = -0.0003
    scene.add(keyLight)

    // Fill Light: Relleno suave — azulado frío para contrastar con key cálida
    const fillLight = new THREE.DirectionalLight(lightsConfig.fillLightColor, lightsConfig.fillLightIntensity)
    fillLight.position.set(-4.5, 1.5, 3.0)
    scene.add(fillLight)

    // Rim Light: Contra — desde atrás-arriba para recortar la silueta del producto
    const rimLight = new THREE.DirectionalLight(lightsConfig.rimLightColor, lightsConfig.rimLightIntensity)
    rimLight.position.set(-0.5, 5.0, -5.5)
    scene.add(rimLight)

    // Ground Bounce: Rebote desde abajo — simula reflejo del suelo del estudio
    const bounceLight = new THREE.HemisphereLight(0x404060, 0x080810, 0.4)
    scene.add(bounceLight)

    // Sombra de contacto dura (shadow map)
    const shadowGeo = new THREE.PlaneGeometry(8, 8)
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35, transparent: true })
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat)
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = -1.82
    shadowPlane.receiveShadow = true
    scene.add(shadowPlane)

    // Blob shadow: disco difuso debajo del producto — más orgánico que solo shadow map
    const blobGeo = new THREE.CircleGeometry(1.1, 48)
    const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    const blobShadow = new THREE.Mesh(blobGeo, blobMat)
    blobShadow.rotation.x = -Math.PI / 2
    blobShadow.position.y = -1.80
    scene.add(blobShadow)

    // ─── Loop de Animación ───────────────────────────────────────────────────
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // Interpolación suave hacia el preset de cámara activo
      if (isTransitioningCameraRef.current) {
        camera.position.lerp(targetCamPosRef.current, delta * 4.5)
        controls.target.lerp(targetCamLookRef.current, delta * 4.5)

        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.02 &&
          controls.target.distanceTo(targetCamLookRef.current) < 0.02
        ) {
          isTransitioningCameraRef.current = false
        }
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ─── Observador de Redimensionamiento Responsivo ─────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH
          camera.updateProjectionMatrix()
          renderer.setSize(newW, newH)
        }
      }
    })
    resizeObserver.observe(container)

    // ─── Limpieza estricta de GPU al desmontar ───────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      // Desalojar todas las geometrías y materiales
      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh
          mesh.geometry?.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else if (mesh.material) {
            mesh.material.dispose()
          }
        }
      })

      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      currentModelGroupRef.current = null
      overlayMeshRef.current = null
    }
  }, [])

  // ─── 2. Carga y Reemplazo del Modelo 3D (.glb o Procedural) ─────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    setIsLoadingModel(true)
    setModelError(null)

    // Desalojar modelo previo si existía
    if (currentModelGroupRef.current) {
      scene.remove(currentModelGroupRef.current)
      currentModelGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh
          m.geometry?.dispose()
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose())
          else m.material?.dispose()
        }
      })
      currentModelGroupRef.current = null
      overlayMeshRef.current = null
    }

    const attachModelToScene = (group: THREE.Group, printableMesh: THREE.Mesh) => {
      scene.add(group)
      currentModelGroupRef.current = group

      // Crear malla overlay para decal/estampa con mitigación de Z-fighting
      // polygonOffset evita el parpadeo de profundidad cuando dos planos coinciden
      const overlayMaterial = new THREE.MeshStandardMaterial({
        map: canvasTexture || null,
        transparent: true,
        roughness: 0.7,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        depthWrite: false,
      })

      const overlayMesh = new THREE.Mesh(printableMesh.geometry.clone(), overlayMaterial)
      overlayMesh.name = 'DecalOverlayMesh'
      overlayMesh.position.copy(printableMesh.position)
      overlayMesh.rotation.copy(printableMesh.rotation)
      overlayMesh.scale.copy(printableMesh.scale)
      group.add(overlayMesh)
      overlayMeshRef.current = overlayMesh

      setIsLoadingModel(false)
    }

    if (product?.glbUrl) {
      // Cargar archivo GLTF / GLB optimizado
      const loader = new GLTFLoader()
      loader.load(
        product.glbUrl,
        (gltf) => {
          const modelGroup = gltf.scene
          let primaryMesh: THREE.Mesh | null = null

          modelGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh
              mesh.castShadow = true
              mesh.receiveShadow = true
              if (!primaryMesh) primaryMesh = mesh
            }
          })

          if (primaryMesh) {
            attachModelToScene(modelGroup, primaryMesh)
          } else {
            setModelError('El archivo 3D no contiene geometrías válidas.')
            setIsLoadingModel(false)
          }
        },
        undefined,
        (err) => {
          console.warn('Error al cargar GLB, activando fallback procedural:', err)
          // Fallback a procedural si falla la descarga
          const procType = (product.proceduralType || 't_shirt') as ProceduralMeshType
          const fallback = buildProceduralProduct(procType, baseColorHex)
          attachModelToScene(fallback.group, fallback.printableMesh)
        }
      )
    } else {
      // Generar malla paramétrica procedural de fallback
      const procType = (product?.proceduralType || 't_shirt') as ProceduralMeshType
      const procedural = buildProceduralProduct(procType, baseColorHex)
      attachModelToScene(procedural.group, procedural.printableMesh)
    }
  }, [product?.glbUrl, product?.proceduralType])

  // ─── 3. Mutación reactiva del color base sin recargar la malla ───────────────
  useEffect(() => {
    const group = currentModelGroupRef.current
    if (!group) return

    const color = new THREE.Color(baseColorHex)

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.name !== 'DecalOverlayMesh') {
        const mesh = child as THREE.Mesh
        if (mesh.material && 'color' in mesh.material) {
          ;(mesh.material as THREE.MeshStandardMaterial).color.copy(color)
        }
      }
    })
  }, [baseColorHex])

  // ─── 4. Actualización reactiva de la textura de estampa (CanvasTexture) ─────
  useEffect(() => {
    if (overlayMeshRef.current) {
      const mat = overlayMeshRef.current.material as THREE.MeshStandardMaterial
      mat.map = canvasTexture || null
      mat.needsUpdate = true
    }
  }, [canvasTexture])

  // ─── 5. Navegación a Presets de Cámara ──────────────────────────────────────
  const setCameraView = useCallback((presetKey: CameraViewPresetKey) => {
    const preset = CAMERA_PRESETS[presetKey]
    if (!preset) return

    targetCamPosRef.current.copy(preset.pos)
    targetCamLookRef.current.copy(preset.target)
    isTransitioningCameraRef.current = true
    setActiveView(presetKey)
  }, [])

  // ─── 6. Captura de snapshot en alta resolución (para PDF y ordenes) ─────────
  const takeSnapshot = useCallback((): string | null => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return null

    renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/png')
  }, [])

  return {
    containerRef,
    activeView,
    setCameraView,
    isLoadingModel,
    modelError,
    takeSnapshot,
  }
}
