import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

const gltfLoader = new GLTFLoader()

function getExtension(filename: string) {
  return filename.toLowerCase().split('.').pop()
}

export default function DragAndDropModels(
  scene: THREE.Scene,
  dropZoneElement: HTMLElement,
  onDrop: (modelUrl: string) => void
) {
  dropZoneElement.ondragenter = function (event) {
    event.preventDefault()
  }
  dropZoneElement.ondragover = function (event) {
    event.preventDefault()
  }
  dropZoneElement.ondragleave = function (event) {
    event.preventDefault()
  }

  dropZoneElement.ondrop = function (event) {
    event.preventDefault()
    let files: File[] = []
    if (event.dataTransfer?.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (event.dataTransfer.items[i].kind === 'file') {
          const file = event.dataTransfer.items[i].getAsFile()
          if (file) files.push(file)
        }
      }
    } else if (event.dataTransfer?.files) {
      files = Array.from(event.dataTransfer.files)
    }

    let entryFile = files.find((f) => getExtension(f.name) === 'glb')
    if (entryFile == undefined) {
      entryFile = files.find((f) => getExtension(f.name) === 'gltf')
    }

    if (entryFile == undefined) {
      console.error(
        'Could not find any supported 3D model files. .glb/.gltf files are supported.'
      )
      return
    }
    const ext = getExtension(entryFile.name)
    const fileUrl = URL.createObjectURL(entryFile)

    onDrop(fileUrl)
  }
}

