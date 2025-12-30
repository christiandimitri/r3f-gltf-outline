import { forwardRef } from 'react'
import { Mesh } from 'three'

interface BoxProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

const Box = forwardRef<Mesh, BoxProps>(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  scale = [1, 1, 1]
}, ref) => {
  // Optional: Add rotation animation
  // useFrame((state, delta) => {
  //   if (ref && typeof ref !== 'function' && ref.current) {
  //     ref.current.rotation.x += delta * 0.5
  //     ref.current.rotation.y += delta * 0.5
  //   }
  // })

  return (
    <mesh 
      ref={ref}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
})

Box.displayName = 'Box'

export default Box

