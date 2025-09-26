import React, { useState } from 'react'

const MinimalSliderTest = () => {
  const [value, setValue] = useState(10)
  const [value2, setValue2] = useState(5)

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Minimal Slider Test</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Slider 1</h2>
        <input
          type="range"
          min="0"
          max="20"
          step="0.1"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <p className="mt-2 text-sm">Value: {value.toFixed(1)}</p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Slider 2</h2>
        <input
          type="range"
          min="0"
          max="20"
          step="0.01"
          value={value2}
          onChange={(e) => setValue2(parseFloat(e.target.value))}
          className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <p className="mt-2 text-sm">Value: {value2.toFixed(2)}</p>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Try dragging both sliders</li>
          <li>Check if they respond to mouse drag</li>
          <li>Check if they respond to click-to-position</li>
          <li>Report which one works and which doesn't</li>
        </ol>
      </div>
    </div>
  )
}

export default MinimalSliderTest
