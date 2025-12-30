import { useState, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import OutlineEffect, { OutlineEffectRef } from './components/OutlineEffect'
import OrbitControls from './components/OrbitControls'
import OutlineControls from './components/OutlineControls'
import FindSurfaces from './utils/FindSurfaces'
import DragAndDropModels from './utils/DragAndDropModels'
import './App.css'

// Component to update camera near/far
function CameraUpdater({ near, far }: { near: number; far: number }) {
  const { camera } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera
    if ('near' in cam) {
      cam.near = near
      cam.far = far
      cam.updateProjectionMatrix()
    }
  }, [near, far, camera])
  return null
}

function App() {
  // Matching threejs GUI params exactly
  const [mode, setMode] = useState(0) // Debug visualization mode
  const [outlineColor, setOutlineColor] = useState('#ffffff')
  const [depthBias, setDepthBias] = useState(0.9)
  const [depthMult, setDepthMult] = useState(20.0)
  const [normalBias, setNormalBias] = useState(1.0)
  const [normalMult, setNormalMult] = useState(1.0)
  const [cameraNear, setCameraNear] = useState(0.1)
  const [cameraFar, setCameraFar] = useState(100.0)
  const outlinePassRef = useRef<OutlineEffectRef>(null)
  const surfaceFinderRef = useRef<FindSurfaces | null>(null)
  const loaderRef = useRef<GLTFLoader | null>(null)

  // Initialize surface finder and loader
  useEffect(() => {
    surfaceFinderRef.current = new FindSurfaces()
    loaderRef.current = new GLTFLoader()
  }, [])

  // Function to add surface IDs to meshes (matching threejs exactly)
  const addSurfaceIdAttributeToMesh = (scene: THREE.Object3D) => {
    if (!surfaceFinderRef.current) return
    
    const surfaceFinder = surfaceFinderRef.current
    surfaceFinder.surfaceId = 0

    scene.traverse((node) => {
      if (node.type === 'Mesh') {
        const mesh = node as THREE.Mesh
        const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(mesh)
        mesh.geometry.setAttribute(
          'color',
          new THREE.BufferAttribute(colorsTypedArray, 4)
        )
      }
    })

    if (outlinePassRef.current?.updateMaxSurfaceId) {
      outlinePassRef.current.updateMaxSurfaceId(surfaceFinder.surfaceId + 1)
    }
  }

  // Component to setup surface IDs for meshes in the scene
  function SceneSetup() {
    const { scene } = useThree()
    
    useEffect(() => {
      // Load initial model matching threejs
      const loader = new GLTFLoader()
      const model = 'box_with_plane.glb'
      loader.load(model, (gltf) => {
        scene.add(gltf.scene)
        addSurfaceIdAttributeToMesh(gltf.scene)
      })
    }, [scene])
    
    return null
  }

  // Component to handle drag and drop
  function DragAndDropHandler() {
    const { scene } = useThree()
    const loader = useRef<GLTFLoader | null>(null)

    useEffect(() => {
      loader.current = new GLTFLoader()
      const dropZoneElement = document.body

      DragAndDropModels(scene, dropZoneElement, (modelUrl: string) => {
        // Clear scene and re-add light (matching threejs)
        scene.clear()
        const light = new THREE.DirectionalLight(0xffffff, 1)
        scene.add(light)
        light.position.set(1.7, 1, -1)

        loader.current!.load(modelUrl, (gltf) => {
          scene.add(gltf.scene)
          addSurfaceIdAttributeToMesh(gltf.scene)
        })
      })
    }, [scene])

    return null
  }

  return (
    <div className="app">
      <Canvas 
        camera={{ position: [10, 2.5, 4], fov: 70, near: 0.1, far: 100 }}
        gl={{ preserveDrawingBuffer: true }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        <directionalLight position={[1.7, 1, -1]} intensity={1} />
        
        <SceneSetup />
        <DragAndDropHandler />
        
        <CameraUpdater near={cameraNear} far={cameraFar} />
        
        <OutlineEffect
          ref={outlinePassRef}
          outlineColor={outlineColor}
          depthBias={depthBias}
          depthMultiplier={depthMult}
          normalBias={normalBias}
          normalMultiplier={normalMult}
          debugVisualize={mode}
        />
        
        <OrbitControls />
      </Canvas>
      
      <OutlineControls
        mode={mode}
        outlineColor={outlineColor}
        depthBias={depthBias}
        depthMult={depthMult}
        normalBias={normalBias}
        normalMult={normalMult}
        cameraNear={cameraNear}
        cameraFar={cameraFar}
        onModeChange={setMode}
        onOutlineColorChange={setOutlineColor}
        onDepthBiasChange={setDepthBias}
        onDepthMultChange={setDepthMult}
        onNormalBiasChange={setNormalBias}
        onNormalMultChange={setNormalMult}
        onCameraNearChange={setCameraNear}
        onCameraFarChange={setCameraFar}
      />
    </div>
  )
}

export default App


