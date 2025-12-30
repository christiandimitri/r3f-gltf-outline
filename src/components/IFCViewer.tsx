import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { IfcImporter, FragmentsModels } from '@thatopen/fragments'
import OutlineEffect, { OutlineEffectRef } from './OutlineEffect'
import OrbitControls from './OrbitControls'
import OutlineControls from './OutlineControls'
import FindSurfaces from '../utils/FindSurfaces'
import { weldVertices } from '../utils/VerticesWelder'

interface IFCViewerProps {
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
}

export default function IFCViewer({
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
}: IFCViewerProps) {
  const outlinePassRef = useRef<OutlineEffectRef>(null)
  const surfaceFinderRef = useRef<FindSurfaces | null>(null)
  const importerRef = useRef<IfcImporter | null>(null)
  const fragmentsRef = useRef<FragmentsModels | null>(null)
  const currentModelRef = useRef<THREE.Object3D | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWelded, setIsWelded] = useState(false)

  // Initialize surface finder
  useEffect(() => {
    surfaceFinderRef.current = new FindSurfaces()
  }, [])

  // Initialize IFC importer and fragments
  useEffect(() => {
    const initializeFragments = async () => {
      try {
        if (!importerRef.current) {
          importerRef.current = new IfcImporter()
          // Use web-ifc 0.0.72 to match @thatopen/fragments requirements
          importerRef.current.wasm = { 
            absolute: true, 
            path: "https://unpkg.com/web-ifc@0.0.72/" 
          }
          // Configure web-ifc settings with required tolerance fields
          // The runtime expects camelCase property names for newer web-ifc versions
          // These are all required tolerance settings for web-ifc 0.0.70+
          importerRef.current.webIfcSettings = {
            COORDINATE_TO_ORIGIN: true,
            tolerancePlaneIntersection: 0.01,
            toleranceBoundaryPoint: 0.01,
            toleranceInsideOutsideToPlane: 0.01,
            toleranceInsideOutside: 0.01,
            toleranceScalarEquality: 0.01
          } as any
        }
        
        if (!fragmentsRef.current) {
          // Use the worker from CDN
          const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
          const fetchedUrl = await fetch(githubUrl)
          const workerBlob = await fetchedUrl.blob()
          const workerFile = new File([workerBlob], "worker.mjs", {
            type: "text/javascript",
          })
          const workerUrl = URL.createObjectURL(workerFile)
          const models = new FragmentsModels(workerUrl)
          models.settings.autoCoordinate = true
          models.baseCoordinates = [0, 0, 0]
          fragmentsRef.current = models
        }
      } catch (error) {
        console.error('Failed to initialize Fragments:', error)
        setError(`Failed to initialize Fragments: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    initializeFragments()
  }, [])

  // Function to add surface IDs to meshes (for outline effect)
  const addSurfaceIdAttributeToMesh = useCallback((scene: THREE.Object3D) => {
    if (!surfaceFinderRef.current) return
    
    const surfaceFinder = surfaceFinderRef.current
    surfaceFinder.surfaceId = 0

    scene.traverse((node) => {
      if (node.type === 'Mesh') {
        const mesh = node as THREE.Mesh
        const geometry = mesh.geometry
        
        // Remove existing color attribute if it exists (fragments uses vec3, we need vec4)
        if (geometry.hasAttribute('color')) {
          geometry.deleteAttribute('color')
        }
        
        const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(mesh)
        // Explicitly set as vec4 attribute (itemSize: 4) - this is critical for shader
        const colorAttr = new THREE.BufferAttribute(colorsTypedArray, 4)
        geometry.setAttribute('color', colorAttr)
        
        // Mark attribute as needing update
        geometry.attributes.color.needsUpdate = true
        
        // Force material to recompile with new attribute type
        if (mesh.material) {
          const material = mesh.material as THREE.Material
          material.needsUpdate = true
          // If it's an array of materials, update all
          if (Array.isArray(material)) {
            material.forEach(mat => mat.needsUpdate = true)
          }
        }
      }
    })

    if (outlinePassRef.current?.updateMaxSurfaceId) {
      outlinePassRef.current.updateMaxSurfaceId(surfaceFinder.surfaceId + 1)
    }
  }, [])

  // Function to weld vertices on IFC models
  const applyWeldVertices = useCallback((scene: THREE.Object3D) => {
    let welded = false
    let skippedCount = 0
    let processedCount = 0
    
    scene.traverse((mesh) => {
      if (mesh.type === 'Mesh') {
        const bufferGeometry = (mesh as THREE.Mesh).geometry
        const position = bufferGeometry.attributes.position
        const indexBuffer = bufferGeometry.index

        if (!indexBuffer || !position) return

        // Check if index buffer is actually valid (has data)
        if (!indexBuffer.count || indexBuffer.count === 0) {
          skippedCount++
          return // Skip meshes without indices
        }

        // Safely get the index array
        let indexArray: number[] = []
        try {
          // Check if the buffer attribute has an accessible array
          // Fragments models may use GPU-only buffers that don't have CPU-accessible arrays
          if (indexBuffer.array && indexBuffer.array.length > 0) {
            // Standard Three.js BufferAttribute with array property
            indexArray = Array.from(indexBuffer.array as Uint32Array | Uint16Array)
          } else {
            // Skip meshes with GPU-only buffers (can't be welded)
            skippedCount++
            return
          }
        } catch (error) {
          skippedCount++
          return
        }

        // Check if position buffer is actually valid (has data)
        if (!position.count || position.count === 0) {
          skippedCount++
          return // Skip meshes without positions
        }

        // Safely get the position array
        let positionArray: number[] = []
        try {
          // Check if the buffer attribute has an accessible array
          if (position.array && position.array.length > 0) {
            positionArray = Array.from(position.array as Float32Array)
          } else {
            // Skip meshes with GPU-only buffers
            skippedCount++
            return
          }
        } catch (error) {
          skippedCount++
          return
        }

        if (indexArray.length === 0 || positionArray.length === 0) {
          skippedCount++
          return
        }

        const newIndexBuffer = weldVertices(
          positionArray,
          indexArray,
          thresholdAngle
        )

        bufferGeometry.setIndex(newIndexBuffer)
        
        if (bufferGeometry.index) {
          bufferGeometry.index.needsUpdate = true
        }
        bufferGeometry.computeBoundingBox()
        bufferGeometry.computeBoundingSphere()
        welded = true
        processedCount++
      }
    })
    
    if (welded) {
      setIsWelded(true)
      // Re-add surface IDs after welding (geometry changed)
      addSurfaceIdAttributeToMesh(scene)
      // Update fragments after geometry change
      if (fragmentsRef.current) {
        fragmentsRef.current.update(true)
      }
      
      // Log summary instead of individual warnings
      if (skippedCount > 0) {
        console.log(`✅ Welded ${processedCount} mesh(es), skipped ${skippedCount} mesh(es) (GPU-only buffers)`)
      } else {
        console.log(`✅ Welded ${processedCount} mesh(es) successfully`)
      }
    } else if (processedCount === 0 && skippedCount > 0) {
      console.warn(`⚠️ Could not weld any meshes: all ${skippedCount} mesh(es) use GPU-only buffers`)
    }
  }, [thresholdAngle, addSurfaceIdAttributeToMesh])

  // Shared function to load IFC file (used by both drag-drop and file input)
  const loadIFCFile = useCallback(async (file: File, scene: THREE.Scene, camera: THREE.Camera) => {
    if (!importerRef.current || !fragmentsRef.current) {
      setError('IFC importer not initialized. Please wait...')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Clean up previous model
      if (currentModelRef.current) {
        scene.remove(currentModelRef.current)
        currentModelRef.current = null
      }

      const importer = importerRef.current

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const ifcBytes = new Uint8Array(arrayBuffer)

      // Convert IFC to Fragments
      const fragmentBytes = await importer.process({ 
        bytes: ifcBytes,
        progressCallback: (progress, data) => {
          if (data?.process === 'geometries' || data?.process === 'attributes') {
            const percent = (progress * 100).toFixed(1)
            console.log(`Converting IFC... ${percent}%`)
          }
        }
      })

      if (!fragmentBytes) {
        throw new Error('Failed to convert IFC to Fragments')
      }

      // Load the Fragments model
      const modelId = `model-${Date.now()}`
      const perspectiveCamera = camera as THREE.PerspectiveCamera
      const fragments = fragmentsRef.current!
      const fragmentsModel = await fragments.load(fragmentBytes.buffer as ArrayBuffer, { 
        modelId,
        camera: perspectiveCamera
      })

      // Setup camera for culling and LOD
      fragmentsModel.useCamera(perspectiveCamera)
      
      // Add model to scene
      scene.add(fragmentsModel.object)

      // Store file information
      fragmentsModel.object.userData = {
        fileName: file.name,
        fileSize: file.size,
        loadedAt: new Date().toISOString(),
        fragmentsModel: fragmentsModel
      }

      currentModelRef.current = fragmentsModel.object
      setIsWelded(false) // Reset weld state when new model loads

      // Update fragments first to ensure geometry is fully loaded
      fragments.update(true)

      // Add surface IDs for outline effect after fragments has updated
      // Use requestAnimationFrame to ensure it happens after render
      requestAnimationFrame(() => {
        addSurfaceIdAttributeToMesh(fragmentsModel.object)
        // Update fragments again after setting surface IDs
        fragments.update(true)
      })

      console.log('✅ IFC model loaded successfully:', file.name)

      // Fit camera to model
      setTimeout(() => {
        const box = new THREE.Box3().setFromObject(fragmentsModel.object)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        
        if (maxDim > 0) {
          const fov = perspectiveCamera.fov * (Math.PI / 180)
          const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
          const direction = new THREE.Vector3(0, 0, 1)
          direction.applyQuaternion(perspectiveCamera.quaternion)
          perspectiveCamera.position.copy(center.clone().add(direction.multiplyScalar(cameraZ * 1.5)))
          perspectiveCamera.lookAt(center)
          perspectiveCamera.updateProjectionMatrix()
          
          // Update fragments again after camera movement
          fragments.update(true)
        }
      }, 200)

    } catch (error) {
      console.error('Error loading IFC file:', error)
      setError(`Failed to load IFC file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Component to setup scene and handle drag & drop
  function SceneSetup() {
    const { scene, camera } = useThree()
    
    useEffect(() => {
      // Store scene and camera refs for file input handler
      sceneRef.current = scene
      cameraRef.current = camera
    }, [scene, camera])
    
    useEffect(() => {
      // Setup drag and drop for IFC files
      const dropZoneElement = document.body
      
      const handleDrop = async (e: DragEvent) => {
        e.preventDefault()
        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return
        
        const file = files[0]
        if (!file.name.toLowerCase().endsWith('.ifc')) {
          console.warn('Please drop an IFC file')
          return
        }

        await loadIFCFile(file, scene, camera)
      }

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
      }

      dropZoneElement.addEventListener('drop', handleDrop)
      dropZoneElement.addEventListener('dragover', handleDragOver)

      return () => {
        dropZoneElement.removeEventListener('drop', handleDrop)
        dropZoneElement.removeEventListener('dragover', handleDragOver)
      }
    }, [scene, camera, loadIFCFile])
    
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

  // Function to handle file input
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setError('Please select an IFC file')
      return
    }

    if (sceneRef.current && cameraRef.current) {
      await loadIFCFile(file, sceneRef.current, cameraRef.current)
    } else {
      setError('Scene not ready. Please wait...')
    }
    
    // Reset input
    e.target.value = ''
  }

  // Function to handle weld vertices button click
  const handleWeldVertices = () => {
    if (!currentModelRef.current) {
      setError('No IFC model loaded. Please load an IFC file first.')
      return
    }
    
    setIsLoading(true)
    try {
      applyWeldVertices(currentModelRef.current)
      console.log('✅ Vertices welded successfully')
    } catch (error) {
      console.error('Error welding vertices:', error)
      setError(`Failed to weld vertices: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* File input button and weld button */}
      <div style={{
        position: 'fixed',
        top: '80px',
        left: '20px',
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer'
        }}>
          <input
            type="file"
            accept=".ifc"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="ifc-file-input"
          />
          <button
            onClick={() => document.getElementById('ifc-file-input')?.click()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Load IFC File
          </button>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            or drag & drop
          </span>
        </label>
        
        {/* Weld Vertices button */}
        {currentModelRef.current && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              onClick={handleWeldVertices}
              disabled={isLoading || isWelded}
              style={{
                padding: '8px 16px',
                backgroundColor: isWelded ? '#666' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isWelded ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isWelded ? 0.6 : 1
              }}
            >
              {isWelded ? '✓ Vertices Welded' : 'Weld Vertices'}
            </button>
            {isWelded && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                (Threshold: {thresholdAngle}°)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '20px 40px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          Loading IFC file...
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '140px',
          left: '20px',
          zIndex: 2000,
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          padding: '10px 20px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '400px'
        }}>
          {error}
        </div>
      )}

      <Canvas 
        camera={{ position: [10, 2.5, 4], fov: 70, near: 0.1, far: 100 }}
        gl={{ preserveDrawingBuffer: true }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        <directionalLight position={[1.7, 1, -1]} intensity={1} />
        
        <SceneSetup />
        
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

