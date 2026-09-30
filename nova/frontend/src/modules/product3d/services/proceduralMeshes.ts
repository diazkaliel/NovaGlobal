import * as THREE from 'three'
import { ProceduralMeshType } from '../types/product3d.types'

/**
 * proceduralMeshes.ts — Factoría de mallas 3D de alta fidelidad para fallback industrial.
 *
 * Técnica central: LatheGeometry (sólido de revolución desde perfil 2D) para productos
 * cilíndricos, y ShapeGeometry extruida + plano curvado para prendas textiles.
 *
 * Por qué LatheGeometry en lugar de CylinderGeometry:
 * - Permite perfiles paramétricos exactos (curvaturas reales del tazón/termo).
 * - UVs generadas automáticamente para envolvimiento limpio de texturas.
 * - Calidad visual equivalente a un modelo modelado en Blender para geometrías de revolución.
 */

export interface ProceduralProductResult {
  group: THREE.Group
  printableMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>
}

// ─── Helpers de materiales PBR ────────────────────────────────────────────────

/**
 * Genera un canvas de ruido de tela para simular textura de algodón.
 * Se usa como roughnessMap/normalMap procedural sin assets externos.
 */
function createFabricNoiseCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Base gris medio para roughness
  ctx.fillStyle = '#888888'
  ctx.fillRect(0, 0, size, size)

  // Trama de tejido: líneas horizontales y verticales intercaladas
  const weaveSize = 4
  for (let y = 0; y < size; y += weaveSize) {
    for (let x = 0; x < size; x += weaveSize) {
      const brightness = (((x / weaveSize) + (y / weaveSize)) % 2 === 0) ? 160 : 110
      const jitter = Math.floor(Math.random() * 20 - 10)
      const v = Math.max(0, Math.min(255, brightness + jitter))
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, weaveSize, weaveSize)
    }
  }
  return canvas
}

/**
 * Genera un canvas de ruido de brillo metálico cepillado (anisotropía radial).
 * Simula el acabado del acero inoxidable sin texturas externas.
 */
function createBrushedMetalCanvas(size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#b0b0b0'
  ctx.fillRect(0, 0, size, size)

  // Líneas verticales finas que simulan el cepillado axial del metal
  for (let x = 0; x < size; x += 1) {
    const alpha = 0.04 + Math.random() * 0.07
    const bright = Math.floor(130 + Math.random() * 80)
    ctx.strokeStyle = `rgba(${bright},${bright},${bright},${alpha})`
    ctx.lineWidth = 0.5 + Math.random() * 1.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  return canvas
}

/**
 * Genera un canvas de normal map de cerámica (micro-ondulaciones suaves).
 * Aporta profundidad visual sin assets externos.
 */
function createCeramicNormalCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Normal map base: azul neutro (0.5, 0.5, 1.0) en espacio RGB
  ctx.fillStyle = '#8080ff'
  ctx.fillRect(0, 0, size, size)

  // Micro-imperfecciones de vidriado cerámico
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 1 + Math.random() * 3
    const nx = Math.floor(128 + (Math.random() - 0.5) * 30)
    const ny = Math.floor(128 + (Math.random() - 0.5) * 30)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${nx},${ny},255,0.15)`
    ctx.fill()
  }
  return canvas
}

// ─── Tazón Cerámico 11oz ─────────────────────────────────────────────────────

/**
 * Perfil 2D del tazón en coordenadas (radio, altura).
 * Modelado a partir de las dimensiones reales de un tazón 11oz estándar.
 * LatheGeometry rota este perfil 360° generando la geometría completa.
 */
function getMugProfilePoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.00, -1.35),  // Centro base
    new THREE.Vector2(0.88, -1.35),  // Borde base exterior
    new THREE.Vector2(0.92, -1.25),  // Chaflán base
    new THREE.Vector2(1.00, -1.15),  // Radio inferior del cuerpo
    new THREE.Vector2(1.18, -0.50),  // Panza del tazón (más ancho)
    new THREE.Vector2(1.22,  0.20),  // Zona media-alta
    new THREE.Vector2(1.18,  0.90),  // Angostamiento hacia el borde
    new THREE.Vector2(1.14,  1.25),  // Borde superior exterior
    new THREE.Vector2(1.08,  1.35),  // Labio exterior
    new THREE.Vector2(1.00,  1.38),  // Punta del labio
    new THREE.Vector2(0.93,  1.35),  // Labio interior
    new THREE.Vector2(0.87,  1.22),  // Pared interior superior
    new THREE.Vector2(0.84,  0.80),  // Pared interior media
    new THREE.Vector2(0.83, -1.15),  // Pared interior baja
    new THREE.Vector2(0.00, -1.15),  // Centro fondo interior
  ]
}

export function createProceduralMug(baseColor: string): ProceduralProductResult {
  const group = new THREE.Group()
  group.name = 'ProceduralMugGroup'

  // Textura de normal map cerámica procedural
  const normalCanvas = createCeramicNormalCanvas(256)
  const normalTex = new THREE.CanvasTexture(normalCanvas)
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping
  normalTex.repeat.set(3, 2)

  const ceramicMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 0.95,            // Acabado de vidriado cerámico brillante
    clearcoatRoughness: 0.08,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.08, 0.08),
  })

  // Cuerpo del tazón via LatheGeometry (sólido de revolución del perfil real)
  const bodyGeo = new THREE.LatheGeometry(getMugProfilePoints(), 96)
  const bodyMesh = new THREE.Mesh(bodyGeo, ceramicMaterial)
  bodyMesh.name = 'PrintableBody'
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Asa: tubo toroidal con perfil D (no circular — más realista)
  // Usamos TubeGeometry sobre una curva cuadratic para el arco del asa
  const archCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.22, -0.55, 0),
    new THREE.Vector3(-2.10,  0.10, 0),
    new THREE.Vector3(-1.22,  0.75, 0),
  )
  const handleGeo = new THREE.TubeGeometry(archCurve, 32, 0.13, 12, false)
  const handleMesh = new THREE.Mesh(handleGeo, ceramicMaterial)
  handleMesh.castShadow = true
  group.add(handleMesh)

  return { group, printableMesh: bodyMesh }
}

// ─── Termo / Botella Inox 500ml ──────────────────────────────────────────────

/**
 * Perfil 2D del termo en coordenadas (radio, altura).
 * Basado en proporciones reales de un termo de acero de 500ml.
 */
function getBottleProfilePoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.00, -1.80),  // Centro base
    new THREE.Vector2(0.62, -1.80),  // Borde base
    new THREE.Vector2(0.70, -1.72),  // Chaflán
    new THREE.Vector2(0.72, -1.60),  // Inicio cuerpo
    new THREE.Vector2(0.74,  0.80),  // Cuerpo recto (cilíndrico)
    new THREE.Vector2(0.72,  0.95),  // Inicio cuello
    new THREE.Vector2(0.60,  1.10),  // Cuello cónico
    new THREE.Vector2(0.52,  1.30),  // Cuello superior
    new THREE.Vector2(0.52,  1.55),  // Rosca inicio
    new THREE.Vector2(0.54,  1.60),  // Rosca exterior (ligero ensanche)
    new THREE.Vector2(0.52,  1.65),  // Rosca
    new THREE.Vector2(0.52,  1.80),  // Tope de tapa
  ]
}

function getLidProfilePoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.00,  1.80),
    new THREE.Vector2(0.56,  1.80),
    new THREE.Vector2(0.60,  1.84),
    new THREE.Vector2(0.62,  1.90),
    new THREE.Vector2(0.62,  2.50),
    new THREE.Vector2(0.58,  2.60),
    new THREE.Vector2(0.50,  2.64),
    new THREE.Vector2(0.00,  2.64),
  ]
}

export function createProceduralBottle(baseColor: string): ProceduralProductResult {
  const group = new THREE.Group()
  group.name = 'ProceduralBottleGroup'

  // Textura de metal cepillado procedural
  const metalCanvas = createBrushedMetalCanvas(512)
  const metalTex = new THREE.CanvasTexture(metalCanvas)
  metalTex.wrapS = metalTex.wrapT = THREE.RepeatWrapping
  metalTex.repeat.set(1, 3)

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    roughness: 0.28,
    metalness: 0.85,
    roughnessMap: metalTex,
    // anisotropy simula la dirección del cepillado axial
    anisotropy: 8,
    anisotropyRotation: Math.PI / 2,
  })

  const lidMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#2a2a2a'),
    roughness: 0.15,
    metalness: 0.9,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
  })

  // Cuerpo del termo via LatheGeometry
  const bodyGeo = new THREE.LatheGeometry(getBottleProfilePoints(), 80)
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial)
  bodyMesh.name = 'PrintableBody'
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Tapa con perfil propio (color oscuro tipo aluminio anodizado)
  const lidGeo = new THREE.LatheGeometry(getLidProfilePoints(), 80)
  const lidMesh = new THREE.Mesh(lidGeo, lidMaterial)
  lidMesh.castShadow = true
  group.add(lidMesh)

  // Argolla de asa superior — TubeGeometry sobre arco semicircular
  const loopCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.30, 2.64, 0),
    new THREE.Vector3(0,     2.95, 0),
    new THREE.Vector3(0.30,  2.64, 0),
  )
  const loopGeo = new THREE.TubeGeometry(loopCurve, 24, 0.045, 8, false)
  const loopMesh = new THREE.Mesh(loopGeo, lidMaterial)
  group.add(loopMesh)

  return { group, printableMesh: bodyMesh }
}

// ─── Polera / T-Shirt ────────────────────────────────────────────────────────

/**
 * Genera la silueta real de una polera en ShapeGeometry.
 * Usa curvas de Bezier para las sisas, el cuello redondo y los hombros.
 *
 * Por qué ShapeGeometry + ExtrudeGeometry en lugar de un cilindro aplanado:
 * La silueta 2D real de una prenda extruida levemente da mucho más contexto
 * visual que un cilindro deformado que pierde cualquier identidad como prenda.
 */
function createTShirtShape(): THREE.Shape {
  const shape = new THREE.Shape()

  // Comenzamos en la esquina inferior izquierda del torso
  shape.moveTo(-1.30, -1.60)

  // Base inferior
  shape.lineTo(1.30, -1.60)

  // Costado derecho hacia hombro
  shape.lineTo(1.30,  0.60)

  // Hombro derecho — curva hacia la sisa de manga
  shape.quadraticCurveTo(1.45, 0.90, 1.70, 1.00)

  // Manga derecha (exterior)
  shape.lineTo(2.30, 0.80)

  // Punta de manga derecha
  shape.quadraticCurveTo(2.45, 0.70, 2.45, 0.55)

  // Manga derecha (inferior — regreso hacia sisa)
  shape.lineTo(2.00, 0.40)
  shape.quadraticCurveTo(1.65, 0.30, 1.45, 0.55)

  // Sisa derecha — curva cóncava hacia el cuello
  shape.quadraticCurveTo(1.20, 0.80, 0.65, 1.10)

  // Cuello derecho exterior
  shape.quadraticCurveTo(0.35, 1.25, 0.00, 1.25)

  // Cuello izquierdo exterior (simétrico)
  shape.quadraticCurveTo(-0.35, 1.25, -0.65, 1.10)

  // Sisa izquierda
  shape.quadraticCurveTo(-1.20, 0.80, -1.45, 0.55)

  // Manga izquierda (inferior)
  shape.lineTo(-2.00, 0.40)
  shape.quadraticCurveTo(-2.45, 0.55, -2.45, 0.55)

  // Punta manga izquierda
  shape.lineTo(-2.30, 0.80)
  shape.quadraticCurveTo(-2.45, 0.70, -2.45, 0.55)
  shape.lineTo(-2.30, 0.80)

  // Manga izquierda exterior
  shape.quadraticCurveTo(-2.45, 0.70, -2.30, 0.80)
  shape.lineTo(-2.45, 0.55)
  shape.lineTo(-2.00, 0.40)

  // Re-trazo limpio del contorno izquierdo
  shape.moveTo(-1.30, -1.60)

  return shape
}

/**
 * Construcción alternativa con Path explícito — más robusta para extrusión.
 * Define el contorno como polilínea con curvas bezier en los puntos clave.
 */
function buildTShirtShape(): THREE.Shape {
  const s = new THREE.Shape()

  s.moveTo(-1.30, -1.60)           // Hem bottom-left
  s.lineTo( 1.30, -1.60)           // Hem bottom-right
  s.lineTo( 1.30,  0.40)           // Side seam right
  s.bezierCurveTo( 1.35, 0.70, 1.60, 0.85,  1.80, 0.85)  // Armhole right
  s.lineTo( 2.35,  0.65)           // Sleeve right outer-top
  s.bezierCurveTo( 2.55, 0.55, 2.55, 0.35,  2.35, 0.25)  // Sleeve tip
  s.lineTo( 1.95,  0.30)           // Sleeve right outer-bottom
  s.bezierCurveTo( 1.65, 0.30, 1.30, 0.45,  1.05, 0.90)  // Armhole seam right
  s.bezierCurveTo( 0.80, 1.10, 0.45, 1.22,  0.00, 1.22)  // Neckline right
  s.bezierCurveTo(-0.45, 1.22,-0.80, 1.10, -1.05, 0.90)  // Neckline left
  s.bezierCurveTo(-1.30, 0.45,-1.65, 0.30, -1.95, 0.30)  // Armhole seam left
  s.lineTo(-2.35,  0.25)           // Sleeve left outer-bottom
  s.bezierCurveTo(-2.55, 0.35,-2.55, 0.55, -2.35, 0.65)  // Sleeve tip
  s.lineTo(-1.80,  0.85)           // Sleeve left outer-top
  s.bezierCurveTo(-1.60, 0.85,-1.35, 0.70, -1.30, 0.40)  // Armhole left
  s.lineTo(-1.30, -1.60)           // Close at Hem bottom-left

  return s
}

export function createProceduralTShirt(baseColor: string): ProceduralProductResult {
  const group = new THREE.Group()
  group.name = 'ProceduralTShirtGroup'

  // Textura de ruido de tela procedural para roughnessMap
  const fabricCanvas = createFabricNoiseCanvas(256)
  const fabricTex = new THREE.CanvasTexture(fabricCanvas)
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping
  fabricTex.repeat.set(4, 4)

  const fabricMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    roughness: 0.88,
    metalness: 0.0,
    roughnessMap: fabricTex,
    side: THREE.DoubleSide,
    // Subsurface scattering sutil para efecto textil
    sheen: 0.3,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(baseColor).multiplyScalar(1.2),
  })

  // Extrusión con leve profundidad para dar volumen textil
  const tshirtShape = buildTShirtShape()
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.22,           // Grosor textil realista
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 6,
    curveSegments: 24,
  }

  const bodyGeo = new THREE.ExtrudeGeometry(tshirtShape, extrudeSettings)

  // Centramos en Z para que el bevel quede equidistante al frente/atrás
  bodyGeo.translate(0, 0, -0.11)

  const bodyMesh = new THREE.Mesh(bodyGeo, fabricMaterial)
  bodyMesh.name = 'PrintableBody'
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Cuello: toro fino de color ligeramente más oscuro (ribete textil)
  const collarColor = new THREE.Color(baseColor).multiplyScalar(0.88)
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: collarColor,
    roughness: 0.90,
    metalness: 0.0,
    side: THREE.DoubleSide,
    sheen: 0.2,
    sheenRoughness: 0.9,
  })
  const collarGeo = new THREE.TorusGeometry(0.55, 0.06, 12, 48)
  collarGeo.rotateX(Math.PI / 2)
  const collarMesh = new THREE.Mesh(collarGeo, collarMat)
  collarMesh.position.set(0, 1.20, 0)
  collarMesh.castShadow = true
  group.add(collarMesh)

  // Etiqueta inferior (detalle de calidad)
  const labelGeo = new THREE.PlaneGeometry(0.45, 0.22)
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5dc,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })
  const labelMesh = new THREE.Mesh(labelGeo, labelMat)
  labelMesh.position.set(0, -1.20, 0.13)
  group.add(labelMesh)

  return { group, printableMesh: bodyMesh }
}

// ─── Despachador principal ───────────────────────────────────────────────────

/**
 * Factory principal — devuelve la malla correcta según el tipo de producto.
 * Los nuevos tipos (hoodie, totebag, cap) usan el fallback de polera por ahora
 * hasta que se implementen sus perfiles específicos.
 */
export function buildProceduralProduct(
  type: ProceduralMeshType = 't_shirt',
  baseColorHex: string = '#ffffff'
): ProceduralProductResult {
  switch (type) {
    case 'mug':
      return createProceduralMug(baseColorHex)
    case 'bottle':
      return createProceduralBottle(baseColorHex)
    case 't_shirt':
    case 'hoodie':
    case 'totebag':
    case 'cap':
    default:
      return createProceduralTShirt(baseColorHex)
  }
}
