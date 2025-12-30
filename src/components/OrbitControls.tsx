import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface OrbitControlsProps {
  enablePan?: boolean
  enableZoom?: boolean
  enableRotate?: boolean
}

export default function OrbitControls({
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
}: OrbitControlsProps) {
  const { camera, gl, invalidate } = useThree()
  const controlsRef = useRef<ThreeOrbitControls | null>(null)

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement)
    controls.enablePan = enablePan
    controls.enableZoom = enableZoom
    controls.enableRotate = enableRotate
    controlsRef.current = controls

    // Listen for camera changes to trigger render (needed for frameloop="never")
    const onChange = () => {
      invalidate()
    }
    controls.addEventListener('change', onChange)

    return () => {
      controls.removeEventListener('change', onChange)
      controls.dispose()
    }
  }, [camera, gl, enablePan, enableZoom, enableRotate, invalidate])

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
      // With frameloop="always", R3F handles the render loop automatically
      // The 'change' event listener triggers invalidate() when camera changes
    }
  })

  return null
}

