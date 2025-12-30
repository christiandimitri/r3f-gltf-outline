import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Object3D } from 'three'
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

interface GLTFModelProps {
  url: string
  onLoad?: (model: Object3D) => void
}

export interface GLTFModelRef {
  getModel: () => Object3D | null
}

const GLTFModel = forwardRef<GLTFModelRef, GLTFModelProps>(({ url, onLoad }, ref) => {
  const [model, setModel] = useState<Object3D | null>(null)

  useImperativeHandle(ref, () => ({
    getModel: () => model
  }))

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf: GLTF) => {
        setModel(gltf.scene)
        if (onLoad) {
          onLoad(gltf.scene)
        }
      },
      undefined,
      (error: Error) => {
        console.error('Error loading GLTF model:', error)
      }
    )
  }, [url, onLoad])

  if (!model) return null

  return <primitive object={model} />
})

GLTFModel.displayName = 'GLTFModel'

export default GLTFModel

