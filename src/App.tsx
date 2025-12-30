import { useState } from 'react'
import OutlineViewer from './components/OutlineViewer'
import IFCViewer from './components/IFCViewer'
import './App.css'

type ViewMode = 'normal' | 'welded' | 'ifc'

function App() {
  // Toggle between different view modes
  const [viewMode, setViewMode] = useState<ViewMode>('normal')
  
  // Shared outline parameters
  const [mode, setMode] = useState(0) // Debug visualization mode
  const [outlineColor, setOutlineColor] = useState('#ffffff')
  const [depthBias, setDepthBias] = useState(0.9)
  const [depthMult, setDepthMult] = useState(20.0)
  const [normalBias, setNormalBias] = useState(1.0)
  const [normalMult, setNormalMult] = useState(1.0)
  const [cameraNear, setCameraNear] = useState(0.1)
  const [cameraFar, setCameraFar] = useState(100.0)
  const [thresholdAngle, setThresholdAngle] = useState(3)

  return (
    <div className="app">
      {/* Toggle button to switch between views */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <span>View Mode:</span>
        <button
          onClick={() => setViewMode('normal')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'normal' ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: viewMode === 'normal' ? 'bold' : 'normal'
          }}
        >
          GLTF Normal
        </button>
        <button
          onClick={() => setViewMode('welded')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'welded' ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: viewMode === 'welded' ? 'bold' : 'normal'
          }}
        >
          GLTF Welded
        </button>
        <button
          onClick={() => setViewMode('ifc')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'ifc' ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: viewMode === 'ifc' ? 'bold' : 'normal'
          }}
        >
          IFC
        </button>
      </div>

      {/* Render the appropriate viewer */}
      {viewMode === 'ifc' ? (
        <IFCViewer
          mode={mode}
          outlineColor={outlineColor}
          depthBias={depthBias}
          depthMult={depthMult}
          normalBias={normalBias}
          normalMult={normalMult}
          cameraNear={cameraNear}
          cameraFar={cameraFar}
          thresholdAngle={thresholdAngle}
          onModeChange={setMode}
          onOutlineColorChange={setOutlineColor}
          onDepthBiasChange={setDepthBias}
          onDepthMultChange={setDepthMult}
          onNormalBiasChange={setNormalBias}
          onNormalMultChange={setNormalMult}
          onCameraNearChange={setCameraNear}
          onCameraFarChange={setCameraFar}
          onThresholdAngleChange={setThresholdAngle}
        />
      ) : (
        <OutlineViewer
          mode={mode}
          outlineColor={outlineColor}
          depthBias={depthBias}
          depthMult={depthMult}
          normalBias={normalBias}
          normalMult={normalMult}
          cameraNear={cameraNear}
          cameraFar={cameraFar}
          thresholdAngle={thresholdAngle}
          weldVerticesOnLoad={viewMode === 'welded'}
          onModeChange={setMode}
          onOutlineColorChange={setOutlineColor}
          onDepthBiasChange={setDepthBias}
          onDepthMultChange={setDepthMult}
          onNormalBiasChange={setNormalBias}
          onNormalMultChange={setNormalMult}
          onCameraNearChange={setCameraNear}
          onCameraFarChange={setCameraFar}
          onThresholdAngleChange={setThresholdAngle}
        />
      )}
    </div>
  )
}

export default App


