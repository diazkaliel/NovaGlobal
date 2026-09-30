import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * BravoHero3DCanvas — Atmósfera 3D de Luz Iridiscente Fundida
 * 
 * Basado en la especificación de Monopo Saigon:
 * "Liquid iridescence behind editorial silence — a monochrome editorial gallery floating on molten light."
 * 
 * Implementa una malla tridimensional de ondas fluidas (Three.js) con un shader de gradiente
 * tricromático (verde salvia rgb(160, 224, 171) -> ámbar fundido rgb(255, 172, 46) -> borgoña profundo rgb(165, 45, 37)).
 * Reacciona suavemente al cursor del ratón con inercia elástica y optimiza el ciclo de renderizado.
 */
export default function BravoHero3DCanvas() {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // 1. Verificación defensiva de soporte WebGL
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })
    } catch (e) {
      console.warn('WebGL no disponible, utilizando fallback CSS para la atmósfera:', e)
      return
    }

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // 2. Configuración de Escena y Cámara con perspectiva cinematográfica
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 8)

    // 3. Geometría de Superficie Líquida Ondulante (Malla densa optimizada)
    const geometry = new THREE.PlaneGeometry(16, 12, 48, 48)

    // 4. Shader GLSL para el degradado fluido iridiscente exacto de Monopo Saigon
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorGreen: { value: new THREE.Color(160 / 255, 224 / 255, 171 / 255) },
      uColorAmber: { value: new THREE.Color(255 / 255, 172 / 255, 46 / 255) },
      uColorOxblood: { value: new THREE.Color(165 / 255, 45 / 255, 37 / 255) }
    }

    const vertexShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Ondulaciones tridimensionales combinadas tipo seda líquida
        float wave1 = sin(pos.x * 0.75 + uTime * 0.7) * 0.45;
        float wave2 = cos(pos.y * 0.85 + uTime * 0.55) * 0.4;
        float wave3 = sin((pos.x + pos.y) * 0.6 + uTime * 0.4) * 0.35;
        
        // Interacción suave con el cursor del mouse
        float distToMouse = distance(pos.xy * 0.25, uMouse);
        float mouseWave = sin(distToMouse * 4.0 - uTime * 2.0) * exp(-distToMouse * 1.5) * 0.25;

        pos.z += wave1 + wave2 + wave3 + mouseWave;
        vElevation = pos.z;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `

    const fragmentShader = `
      uniform vec3 uColorGreen;
      uniform vec3 uColorAmber;
      uniform vec3 uColorOxblood;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        // Mezcla tricromática suave según la elevación de la onda y la coordenada UV
        float mixRatio1 = smoothstep(-0.8, 0.2, vElevation + vUv.x * 0.5);
        vec3 colorA = mix(uColorOxblood, uColorAmber, mixRatio1);

        float mixRatio2 = smoothstep(-0.1, 0.9, vElevation + vUv.y * 0.6);
        vec3 finalColor = mix(colorA, uColorGreen, mixRatio2);

        // Opacidad vaporosa controlada para actuar estrictamente como fondo atmosférico
        float alpha = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x) * 
                      smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);

        gl_FragColor = vec4(finalColor, alpha * 0.38);
      }
    `

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      wireframe: false,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -0.35
    scene.add(mesh)

    // 5. Gestión del puntero con suavizado
    const targetMouse = new THREE.Vector2(0, 0)
    const currentMouse = new THREE.Vector2(0, 0)

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      targetMouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // 6. Manejo de redimensionamiento responsivo
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 7. Bucle de animación 60fps optimizado
    let animationFrameId
    const clock = new THREE.Clock()

    const animate = () => {
      const delta = clock.getDelta()
      uniforms.uTime.value += delta * 0.75

      // Interpolación elástica hacia el puntero
      currentMouse.lerp(targetMouse, 0.04)
      uniforms.uMouse.value.copy(currentMouse)

      // Rotación imperceptible para dar vida orgánica continua
      mesh.rotation.z = Math.sin(uniforms.uTime.value * 0.15) * 0.05

      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // 8. Limpieza rigurosa de memoria WebGL al desmontar
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', handleResize)

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    />
  )
}
