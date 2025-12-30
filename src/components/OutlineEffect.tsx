import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { CustomOutlinePass } from '../utils/CustomOutlinePass'

interface OutlineEffectProps {
  enabled?: boolean
  outlineColor?: THREE.Color | string
  depthBias?: number
  depthMultiplier?: number
  normalBias?: number
  normalMultiplier?: number
  debugVisualize?: number
  selectedObjects?: THREE.Object3D[]
}

export interface OutlineEffectRef {
  updateMaxSurfaceId: (maxSurfaceId: number) => void
}

const OutlineEffect = forwardRef<OutlineEffectRef, OutlineEffectProps>(({
  enabled = true,
  outlineColor = '#ffffff',
  depthBias = 0.9,
  depthMultiplier = 20.0,
  normalBias = 1.0,
  normalMultiplier = 1.0,
  debugVisualize = 0,
}, ref) => {
  const { gl, scene, camera, size, invalidate } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<CustomOutlinePass | null>(null)
  const fxaaPassRef = useRef<ShaderPass | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (composerRef.current) {
        composerRef.current.dispose()
        composerRef.current = null
      }
      return
    }

    const width = Math.max(1, size.width * gl.getPixelRatio())
    const height = Math.max(1, size.height * gl.getPixelRatio())

    // Create render target with depthTexture (matching threejs exactly)
    // Note: DepthTexture constructor requires width/height in TypeScript, but threejs creates it without
    const depthTexture = new THREE.DepthTexture(width, height)
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      depthTexture: depthTexture,
      depthBuffer: true,
    })

    // Create EffectComposer (matching threejs exactly)
    const composer = new EffectComposer(gl, renderTarget)
    composerRef.current = composer

    // Initial render pass
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    // Outline pass
    const customOutline = new CustomOutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    )
    customOutline.renderToScreen = true // Make it render to screen
    outlinePassRef.current = customOutline
    composer.addPass(customOutline)

    // Antialias pass (matching threejs)
    const effectFXAA = new ShaderPass(FXAAShader)
    effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height)
    effectFXAA.renderToScreen = true // Make FXAA render to screen (last pass)
    customOutline.renderToScreen = false // Outline pass no longer renders to screen
    fxaaPassRef.current = effectFXAA
    composer.addPass(effectFXAA)

    // Initial render will happen in useFrame

    return () => {
      composer.dispose()
      renderTarget.dispose()
      depthTexture.dispose()
    }
  }, [enabled, scene, camera, gl, size.width, size.height, invalidate])

  // Update uniforms every frame and render composer
  // This runs BEFORE R3F's default render to ensure our composer output is what shows
  useFrame(() => {
    if (!enabled || !outlinePassRef.current || !composerRef.current) {
      return // Skip rendering if composer is not ready
    }

    const outlinePass = outlinePassRef.current
    const material = outlinePass.fsQuad.material as THREE.ShaderMaterial
    const uniforms = material.uniforms

    // Update outline color
    if (typeof outlineColor === 'string') {
      uniforms.outlineColor.value.set(outlineColor)
    } else {
      uniforms.outlineColor.value.copy(outlineColor)
    }

    // Update multiplier parameters
    uniforms.multiplierParameters.value.set(
      depthBias,
      depthMultiplier,
      normalBias,
      normalMultiplier
    )

    // Update debug visualize
    uniforms.debugVisualize.value = debugVisualize

    // Update camera near/far
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera
    if ('near' in cam) {
      uniforms.cameraNear.value = cam.near
    }
    if ('far' in cam) {
      uniforms.cameraFar.value = cam.far
    }

    // Render the composer AFTER R3F's default render
    // This ensures the composer output overwrites R3F's render
    // The last pass (FXAA) has renderToScreen=true, so it renders to screen
    composerRef.current.render()
  }, 1) // Positive priority = runs AFTER R3F's default render

  // Update size when canvas resizes
  useEffect(() => {
    if (!composerRef.current || !outlinePassRef.current || !fxaaPassRef.current) return

    const width = Math.max(1, size.width * gl.getPixelRatio())
    const height = Math.max(1, size.height * gl.getPixelRatio())

    composerRef.current.setSize(width, height)
    outlinePassRef.current.setSize(width, height)
    fxaaPassRef.current.uniforms['resolution'].value.set(1 / width, 1 / height)
  }, [size, gl])

  useImperativeHandle(ref, () => ({
    updateMaxSurfaceId: (maxSurfaceId: number) => {
      if (outlinePassRef.current) {
        outlinePassRef.current.updateMaxSurfaceId(maxSurfaceId)
      }
    },
  }))

  return null
})

OutlineEffect.displayName = 'OutlineEffect'

export default OutlineEffect
