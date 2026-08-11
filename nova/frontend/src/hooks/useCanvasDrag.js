import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useCanvasDrag — Hook reutilizable para interacción drag/touch/wheel sobre un canvas.
 *
 * Devuelve:
 * - position { x, y }         — Posición relativa del elemento arrastrable (-100 a 100)
 * - scale                     — Escala del elemento (10 a 150)
 * - rotation                  — Rotación en grados (0-360)
 * - isDragging                — Si el usuario está arrastrando activamente
 * - handlers                  — Objeto con onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
 *                               onTouchStart, onTouchMove, onTouchEnd para asignar al contenedor
 * - setPosition, setScale, setRotation — Setters directos
 * - resetTransform            — Restaura todo a valores iniciales
 */
export default function useCanvasDrag({
  initialX = 0,
  initialY = 0,
  initialScale = 60,
  initialRotation = 0,
  sensitivity = 0.4,
  minScale = 10,
  maxScale = 150,
  bounds = 100
} = {}) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [scale, setScale] = useState(initialScale)
  const [rotation, setRotation] = useState(initialRotation)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Sync from external prop changes
  useEffect(() => { setPosition({ x: initialX, y: initialY }) }, [initialX, initialY])
  useEffect(() => { setScale(initialScale) }, [initialScale])

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true)
    dragStartRef.current = { x: clientX, y: clientY }
  }, [])

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return
    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y
    dragStartRef.current = { x: clientX, y: clientY }
    setPosition(prev => ({
      x: clamp(prev.x + dx * sensitivity, -bounds, bounds),
      y: clamp(prev.y + dy * sensitivity, -bounds, bounds)
    }))
  }, [isDragging, sensitivity, bounds])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse handlers
  const onMouseDown = useCallback((e) => handleDragStart(e.clientX, e.clientY), [handleDragStart])
  const onMouseMove = useCallback((e) => handleDragMove(e.clientX, e.clientY), [handleDragMove])
  const onMouseUp = useCallback(() => handleDragEnd(), [handleDragEnd])
  const onMouseLeave = useCallback(() => handleDragEnd(), [handleDragEnd])

  // Touch handlers
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleDragStart])

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 1) {
      e.preventDefault()
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleDragMove])

  const onTouchEnd = useCallback(() => handleDragEnd(), [handleDragEnd])

  // Wheel handler — deshabilitado el escalado por rueda a solicitud del usuario
  const registerWheel = useCallback((element) => {
    if (!element) return
    // Rueda del mouse deshabilitada para no escalar/achicar logo al desplazar
    return () => {}
  }, [])

  const resetTransform = useCallback(() => {
    setPosition({ x: 0, y: 0 })
    setScale(60)
    setRotation(0)
  }, [])

  const rotateBy = useCallback((degrees) => {
    setRotation(prev => (prev + degrees) % 360)
  }, [])

  return {
    position,
    scale,
    rotation,
    isDragging,
    setPosition,
    setScale,
    setRotation,
    resetTransform,
    rotateBy,
    registerWheel,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  }
}
