import { useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import OutlineEffect, { OutlineEffectRef } from './OutlineEffect'
import OrbitControls from './OrbitControls'
import OutlineControls from './OutlineControls'
import FindSurfaces from '../utils/FindSurfaces'
import DragAndDropModels from '../utils/DragAndDropModels'
import { weldVertices } from '../utils/VerticesWelder'

interface OutlineViewerProps {
  mode: number
  outlineColor: string
  depthBias: number
  depthMult: number
  normalBias: number
  normalMult: number
  cameraNear: number
  cameraFar: number
  thresholdAngle: number
  onModeChange: (value: number) => void
  onOutlineColorChange: (value: string) => void
  onDepthBiasChange: (value: number) => void
  onDepthMultChange: (value: number) => void
  onNormalBiasChange: (value: number) => void
  onNormalMultChange: (value: number) => void
  onCameraNearChange: (value: number) => void
  onCameraFarChange: (value: number) => void
  onThresholdAngleChange: (value: number) => void
  weldVerticesOnLoad?: boolean
}

export default function OutlineViewer({
  mode,
  outlineColor,
  depthBias,
  depthMult,
  normalBias,
  normalMult,
  cameraNear,
  cameraFar,
  thresholdAngle,
  onModeChange,
  onOutlineColorChange,
  onDepthBiasChange,
  onDepthMultChange,
  onNormalBiasChange,
  onNormalMultChange,
  onCameraNearChange,
  onCameraFarChange,
  onThresholdAngleChange,
  weldVerticesOnLoad = false,
}: OutlineViewerProps) {
  const outlinePassRef = useRef<OutlineEffectRef>(null)
  const surfaceFinderRef = useRef<FindSurfaces | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)

  // Initialize surface finder
  useEffect(() => {
    surfaceFinderRef.current = new FindSurfaces()
  }, [])

  // Function to add surface IDs to meshes
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

  // Function to weld vertices (called once on load if weldVerticesOnLoad is true)
  // Using useRef to access latest thresholdAngle value
  const thresholdAngleRef = useRef(thresholdAngle)
  useEffect(() => {
    thresholdAngleRef.current = thresholdAngle
  }, [thresholdAngle])

  const applyWeldVertices = (scene: THREE.Scene) => {
    if (!weldVerticesOnLoad) return

    scene.traverse((mesh) => {
      if (mesh.type === 'Mesh') {
        const bufferGeometry = (mesh as THREE.Mesh).geometry
        const position = bufferGeometry.attributes.position
        const indexBuffer = bufferGeometry.index

        if (!indexBuffer) return

        const newIndexBuffer = weldVertices(
          Array.from(position.array as Float32Array),
          Array.from(indexBuffer.array as Uint32Array | Uint16Array),
          thresholdAngleRef.current
        )

        bufferGeometry.setIndex(newIndexBuffer)
        
        if (bufferGeometry.index) {
          bufferGeometry.index.needsUpdate = true
        }
        bufferGeometry.computeBoundingBox()
        bufferGeometry.computeBoundingSphere()
      }
    })
  }

  // Component to setup scene
  function SceneSetup() {
    const { scene } = useThree()
    
    useEffect(() => {
      sceneRef.current = scene
    }, [scene])
    
    useEffect(() => {
      // Load initial model
      const loader = new GLTFLoader()
      const model = 'model.glb'
      loader.load(model, (gltf) => {
        scene.add(gltf.scene)
        
        // Apply welding if enabled (happens once, no reset needed)
        if (weldVerticesOnLoad) {
          applyWeldVertices(scene)
        }
        
        // Add surface IDs
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
        // Clear scene and re-add light
        scene.clear()
        const light = new THREE.DirectionalLight(0xffffff, 1)
        scene.add(light)
        light.position.set(1.7, 1, -1)

        loader.current!.load(modelUrl, (gltf) => {
          scene.add(gltf.scene)
          
          // Apply welding if enabled (happens once per model load)
          if (weldVerticesOnLoad) {
            applyWeldVertices(scene)
          }
          
          addSurfaceIdAttributeToMesh(gltf.scene)
        })
      })
    }, [scene])

    return null
  }

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

  return (
    <>
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
        onModeChange={onModeChange}
        onOutlineColorChange={onOutlineColorChange}
        onDepthBiasChange={onDepthBiasChange}
        onDepthMultChange={onDepthMultChange}
        onNormalBiasChange={onNormalBiasChange}
        onNormalMultChange={onNormalMultChange}
        onCameraNearChange={onCameraNearChange}
        onCameraFarChange={onCameraFarChange}
      />
    </>
  )
}

