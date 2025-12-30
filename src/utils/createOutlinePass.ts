// Based on https://github.com/OmarShehata/webgl-outlines
// Follows the structure of
// 		https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/OutlinePass.js
import * as THREE from 'three'
import { ShaderMaterial, WebGLRenderTarget, RGBAFormat, HalfFloatType } from 'three'
import {
  getSurfaceIdMaterial,
  getDebugSurfaceIdMaterial,
} from './FindSurfaces'

// Shader code embedded exactly as in threejs CustomOutlinePass
const getVertexShader = () => {
  return `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`
}

const getFragmentShader = () => {
  return `
			#include <packing>
			// The above include imports "perspectiveDepthToViewZ"
			// and other GLSL functions from ThreeJS we need for reading depth.
			uniform sampler2D sceneColorBuffer;
			uniform sampler2D depthBuffer;
			uniform sampler2D surfaceBuffer;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform vec4 screenSize;
			uniform vec3 outlineColor;
			uniform vec4 multiplierParameters;
			uniform int debugVisualize;

			varying vec2 vUv;

			// Helper functions for reading from depth buffer.
			float readDepth (sampler2D depthSampler, vec2 coord) {
				float fragCoordZ = texture2D(depthSampler, coord).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			}
			float getLinearDepth(vec3 pos) {
				return -(viewMatrix * vec4(pos, 1.0)).z;
			}

			float getLinearScreenDepth(sampler2D map) {
					vec2 uv = gl_FragCoord.xy * screenSize.zw;
					return readDepth(map,uv);
			}
			// Helper functions for reading normals and depth of neighboring pixels.
			float getPixelDepth(int x, int y) {
				// screenSize.zw is pixel size 
				// vUv is current position
				return readDepth(depthBuffer, vUv + screenSize.zw * vec2(x, y));
			}
			// "surface value" is either the normal or the "surfaceID"
			vec3 getSurfaceValue(int x, int y) {
				vec3 val = texture2D(surfaceBuffer, vUv + screenSize.zw * vec2(x, y)).rgb;
				return val;
			}

			float saturateValue(float num) {
				return clamp(num, 0.0, 1.0);
			}

			float getSufaceIdDiff(vec3 surfaceValue) {
				float surfaceIdDiff = 0.0;
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 0));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, -1));

				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, -1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, -1));
				return surfaceIdDiff;
			}

			void main() {
				vec4 sceneColor = texture2D(sceneColorBuffer, vUv);
				float depth = getPixelDepth(0, 0);
				// "surfaceValue" is either the normal or the surfaceId
				vec3 surfaceValue = getSurfaceValue(0, 0);

				// Get the difference between depth of neighboring pixels and current.
				float depthDiff = 0.0;
				depthDiff += abs(depth - getPixelDepth(1, 0));
				depthDiff += abs(depth - getPixelDepth(-1, 0));
				depthDiff += abs(depth - getPixelDepth(0, 1));
				depthDiff += abs(depth - getPixelDepth(0, -1));

				// Get the difference between surface values of neighboring pixels
				// and current
				float surfaceValueDiff = getSufaceIdDiff(surfaceValue);
				
				// Apply multiplier & bias to each 
				float depthBias = multiplierParameters.x;
				float depthMultiplier = multiplierParameters.y;
				float normalBias = multiplierParameters.z;
				float normalMultiplier = multiplierParameters.w;

				depthDiff = depthDiff * depthMultiplier;
				depthDiff = saturateValue(depthDiff);
				depthDiff = pow(depthDiff, depthBias);

				if (debugVisualize != 0 && debugVisualize != 6) {
					// Apply these params when using
					// normals instead of surfaceIds
					surfaceValueDiff = surfaceValueDiff * normalMultiplier;
					surfaceValueDiff = saturateValue(surfaceValueDiff);
					surfaceValueDiff = pow(surfaceValueDiff, normalBias);
				} else {
					if (surfaceValueDiff != 0.0) surfaceValueDiff = 1.0;
				}

				float outline = saturateValue(surfaceValueDiff + depthDiff);
			
				// Combine outline with scene color.
				vec4 outlineColor = vec4(outlineColor, 1.0);
				gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));

				//// For debug visualization of the different inputs to this shader.
				if (debugVisualize == 2) {
					gl_FragColor = sceneColor;
				}
				if (debugVisualize == 3) {
					gl_FragColor = vec4(vec3(depth), 1.0);
				}
				if (debugVisualize == 4 || debugVisualize == 5) {
					// 4 visualizes the normal buffer
					// 5 visualizes the surfaceID buffer 
					// Either way they are the same buffer, we change 
					// what we render into it
					gl_FragColor = vec4(surfaceValue, 1.0);
				}
				if (debugVisualize == 6 || debugVisualize == 7) {
					// Outlines only
					gl_FragColor = vec4(vec3(outline * outlineColor), 1.0);
				}				
			}
			`
}

export interface OutlinePassConfig {
  outlineColor?: THREE.Color | string
  depthBias?: number
  depthMultiplier?: number
  normalBias?: number
  normalMultiplier?: number
  debugVisualize?: number
}

export function createOutlinePass(
  _scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  config: OutlinePassConfig = {}
) {
  console.log('🟡 [R3F] createOutlinePass called', {
    width,
    height,
    config,
  });

  const {
    outlineColor = new THREE.Color(0xffffff),
    depthBias = 0.9,
    depthMultiplier = 20.0,
    normalBias = 1.0,
    normalMultiplier = 1.0,
    debugVisualize = 0,
  } = config

  console.log('🟡 [R3F] createOutlinePass config resolved', {
    outlineColor: outlineColor instanceof THREE.Color ? outlineColor.getHexString() : outlineColor,
    depthBias,
    depthMultiplier,
    normalBias,
    normalMultiplier,
    debugVisualize,
  });

  // Create render targets for depth and normal buffers
  // Depth render target needs depthTexture enabled BEFORE rendering
  // Matching threejs: create depthTexture first, then use it in renderTarget constructor
  const depthTexture = new THREE.DepthTexture(width, height)
  depthTexture.format = THREE.DepthFormat
  depthTexture.type = THREE.UnsignedShortType
  depthTexture.minFilter = THREE.NearestFilter
  depthTexture.magFilter = THREE.NearestFilter
  
  const depthRenderTarget = new WebGLRenderTarget(width, height, {
    depthTexture: depthTexture,
    depthBuffer: true,
  })

  const surfaceBuffer = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: HalfFloatType,
  })
  surfaceBuffer.texture.minFilter = THREE.NearestFilter
  surfaceBuffer.texture.magFilter = THREE.NearestFilter
  surfaceBuffer.texture.generateMipmaps = false
  surfaceBuffer.stencilBuffer = false

  // Create normal material override
  const normalOverrideMaterial = new THREE.MeshNormalMaterial()
  const surfaceIdOverrideMaterial = getSurfaceIdMaterial()
  const surfaceIdDebugOverrideMaterial = getDebugSurfaceIdMaterial()

  // Get camera near/far
  const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera
  const cameraNear = 'near' in cam ? cam.near : 0.1
  const cameraFar = 'far' in cam ? cam.far : 1000

  // Create outline shader material
  const screenSizeVec = new THREE.Vector4(width, height, 1 / width, 1 / height);
  const outlineColorValue = outlineColor instanceof THREE.Color
    ? outlineColor
    : new THREE.Color(outlineColor);
  const multiplierParamsVec = new THREE.Vector4(depthBias, depthMultiplier, normalBias, normalMultiplier);

  console.log('🟡 [R3F] Creating outline material', {
    screenSize: { x: screenSizeVec.x, y: screenSizeVec.y, z: screenSizeVec.z, w: screenSizeVec.w },
    outlineColor: outlineColorValue.getHexString(),
    multiplierParameters: { x: multiplierParamsVec.x, y: multiplierParamsVec.y, z: multiplierParamsVec.z, w: multiplierParamsVec.w },
    debugVisualize,
    cameraNear,
    cameraFar,
    hasDepthTexture: !!depthRenderTarget.depthTexture,
    hasSurfaceTexture: !!surfaceBuffer.texture,
  });

  const outlineMaterial = new ShaderMaterial({
    uniforms: {
      debugVisualize: { value: debugVisualize },
      sceneColorBuffer: { value: null },
      depthBuffer: { value: depthRenderTarget.depthTexture },
      surfaceBuffer: { value: surfaceBuffer.texture },
      outlineColor: { value: outlineColorValue },
      //4 scalar values packed in one uniform: depth multiplier, depth bias, and same for normals.
      multiplierParameters: {
        value: multiplierParamsVec,
      },
      cameraNear: { value: cameraNear },
      cameraFar: { value: cameraFar },
      screenSize: {
        value: screenSizeVec,
      },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
  })

  console.log('🟡 [R3F] Outline material created', {
    uniforms: Object.keys(outlineMaterial.uniforms),
  });

  // Create fullscreen quad for post-processing
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    outlineMaterial
  )

  return {
    depthRenderTarget,
    surfaceBuffer,
    normalOverrideMaterial,
    surfaceIdOverrideMaterial,
    surfaceIdDebugOverrideMaterial,
    outlineMaterial,
    quad,
    updateMaxSurfaceId: (maxSurfaceId: number) => {
      surfaceIdOverrideMaterial.uniforms.maxSurfaceId.value = maxSurfaceId
    },
    updateSize: (newWidth: number, newHeight: number) => {
      console.log('🟡 [R3F] updateSize called', { newWidth, newHeight });
      if (newWidth > 0 && newHeight > 0) {
        depthRenderTarget.setSize(newWidth, newHeight)
        if (depthRenderTarget.depthTexture) {
          depthRenderTarget.depthTexture.image.width = newWidth
          depthRenderTarget.depthTexture.image.height = newHeight
        }
        surfaceBuffer.setSize(newWidth, newHeight)
        const newScreenSize = new THREE.Vector4(newWidth, newHeight, 1 / newWidth, 1 / newHeight);
        outlineMaterial.uniforms.screenSize.value.set(
          newScreenSize.x,
          newScreenSize.y,
          newScreenSize.z,
          newScreenSize.w
        )
        console.log('🟡 [R3F] updateSize complete', {
          screenSize: { x: newScreenSize.x, y: newScreenSize.y, z: newScreenSize.z, w: newScreenSize.w },
        });
      }
    },
    dispose: () => {
      depthRenderTarget.dispose()
      surfaceBuffer.dispose()
      normalOverrideMaterial.dispose()
      outlineMaterial.dispose()
      quad.geometry.dispose()
    },
  }
}

