import { useState } from 'react'
import './OutlineControls.css'

interface OutlineControlsProps {
  mode: number
  outlineColor: string
  depthBias: number
  depthMult: number
  normalBias: number
  normalMult: number
  cameraNear: number
  cameraFar: number
  onModeChange: (value: number) => void
  onOutlineColorChange: (value: string) => void
  onDepthBiasChange: (value: number) => void
  onDepthMultChange: (value: number) => void
  onNormalBiasChange: (value: number) => void
  onNormalMultChange: (value: number) => void
  onCameraNearChange: (value: number) => void
  onCameraFarChange: (value: number) => void
}

const MODE_OPTIONS = {
  'Outlines V2': 0,
  'Outlines V1': 1,
  'Original scene': 2,
  'Depth buffer': 3,
  'Normal buffer': 4,
  'SurfaceID debug buffer': 5,
  'Outlines only V2': 6,
  'Outlines only V1': 7,
}

export default function OutlineControls({
  mode,
  outlineColor,
  depthBias,
  depthMult,
  normalBias,
  normalMult,
  cameraNear,
  cameraFar,
  onModeChange,
  onOutlineColorChange,
  onDepthBiasChange,
  onDepthMultChange,
  onNormalBiasChange,
  onNormalMultChange,
  onCameraNearChange,
  onCameraFarChange,
}: OutlineControlsProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={`outline-controls ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="controls-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '▼' : '▲'} Outline Controls
      </button>
      
      {isOpen && (
        <div className="controls-content">
          <div className="control-group">
            <label>
              <span>Mode</span>
              <select
                value={mode}
                onChange={(e) => onModeChange(parseInt(e.target.value))}
                className="mode-select"
              >
                {Object.entries(MODE_OPTIONS).map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Outline Color</span>
              <div className="control-row">
                <input
                  type="color"
                  value={outlineColor}
                  onChange={(e) => onOutlineColorChange(e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={outlineColor}
                  onChange={(e) => onOutlineColorChange(e.target.value)}
                  className="color-text-input"
                  placeholder="#ffffff"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Depth Bias</span>
              <div className="control-row">
                <input
                  type="range"
                  min="0.0"
                  max="5"
                  step="0.1"
                  value={depthBias}
                  onChange={(e) => onDepthBiasChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0.0"
                  max="5"
                  step="0.1"
                  value={depthBias.toFixed(1)}
                  onChange={(e) => onDepthBiasChange(parseFloat(e.target.value) || 0)}
                  className="number-input"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Depth Mult</span>
              <div className="control-row">
                <input
                  type="range"
                  min="0.0"
                  max="20"
                  step="0.1"
                  value={depthMult}
                  onChange={(e) => onDepthMultChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0.0"
                  max="20"
                  step="0.1"
                  value={depthMult.toFixed(1)}
                  onChange={(e) => onDepthMultChange(parseFloat(e.target.value) || 0)}
                  className="number-input"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Normal Bias</span>
              <div className="control-row">
                <input
                  type="range"
                  min="0.0"
                  max="20"
                  step="0.1"
                  value={normalBias}
                  onChange={(e) => onNormalBiasChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0.0"
                  max="20"
                  step="0.1"
                  value={normalBias.toFixed(1)}
                  onChange={(e) => onNormalBiasChange(parseFloat(e.target.value) || 0)}
                  className="number-input"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Normal Mult</span>
              <div className="control-row">
                <input
                  type="range"
                  min="0.0"
                  max="10"
                  step="0.1"
                  value={normalMult}
                  onChange={(e) => onNormalMultChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0.0"
                  max="10"
                  step="0.1"
                  value={normalMult.toFixed(1)}
                  onChange={(e) => onNormalMultChange(parseFloat(e.target.value) || 0)}
                  className="number-input"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Camera Near</span>
              <div className="control-row">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={cameraNear}
                  onChange={(e) => onCameraNearChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={cameraNear.toFixed(2)}
                  onChange={(e) => onCameraNearChange(parseFloat(e.target.value) || 0.1)}
                  className="number-input"
                />
              </div>
            </label>
          </div>

          <div className="control-group">
            <label>
              <span>Camera Far</span>
              <div className="control-row">
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={cameraFar}
                  onChange={(e) => onCameraFarChange(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={cameraFar.toFixed(0)}
                  onChange={(e) => onCameraFarChange(parseFloat(e.target.value) || 100)}
                  className="number-input"
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
