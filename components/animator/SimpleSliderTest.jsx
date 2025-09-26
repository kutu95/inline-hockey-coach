import React, { useState } from 'react';

const SimpleSliderTest = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const animationDuration = 20;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Simple Slider Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Timeline Slider Test</h2>
        
        <div className="mb-4 bg-blue-50 p-3 rounded">
          <div className="relative">
            <input
              type="range"
              min="0"
              max={animationDuration}
              step="0.01"
              value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              onInput={(e) => setCurrentTime(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>0s</span>
              <span className="font-bold text-blue-600">{currentTime.toFixed(2)}s</span>
              <span>{animationDuration}s</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>Current time: <strong>{currentTime.toFixed(2)}s</strong></p>
          <p>Progress: <strong>{((currentTime / animationDuration) * 100).toFixed(1)}%</strong></p>
        </div>
      </div>
    </div>
  );
};

export default SimpleSliderTest;
