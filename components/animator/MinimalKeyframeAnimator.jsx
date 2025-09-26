import React, { useState, useRef } from 'react';

const MinimalKeyframeAnimator = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [keyframes, setKeyframes] = useState([
    { id: 'kf_1', time: 0, objects: [] },
    { id: 'kf_2', time: 10, objects: [] }
  ]);
  const [selectedKeyframe, setSelectedKeyframe] = useState('kf_1');
  const [isDraggingKeyframe, setIsDraggingKeyframe] = useState(false);
  const [draggedKeyframeId, setDraggedKeyframeId] = useState(null);
  const timelineRef = useRef(null);
  const animationDuration = 20;

  // Handle keyframe dragging with simple throttling
  const handleKeyframeMouseDown = (event, keyframeId) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingKeyframe(true);
    setDraggedKeyframeId(keyframeId);
    setSelectedKeyframe(keyframeId);

    let lastUpdate = 0;
    const throttleDelay = 16; // ~60fps

    const handleMouseMove = (e) => {
      if (!timelineRef.current) return;
      
      const now = Date.now();
      if (now - lastUpdate < throttleDelay) return;
      lastUpdate = now;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newTime = (percentage / 100) * animationDuration;

      setKeyframes(prev => prev.map(kf => 
        kf.id === keyframeId ? { ...kf, time: newTime } : kf
      ));
    };

    const handleMouseUp = () => {
      setIsDraggingKeyframe(false);
      setDraggedKeyframeId(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Minimal Keyframe Animator Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Timeline Controls</h2>
        
        {/* Timeline slider */}
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
        
        {/* Keyframe markers */}
        <div 
          ref={timelineRef}
          className="relative h-12 bg-gray-200 rounded mb-4"
        >
          {keyframes.map(keyframe => {
            const leftPosition = (keyframe.time / animationDuration) * 100
            const isSelected = keyframe.id === selectedKeyframe
            const isDragged = isDraggingKeyframe && keyframe.id === draggedKeyframeId
            
            return (
              <div
                key={keyframe.id}
                className={`absolute top-0 w-5 h-12 cursor-move select-none rounded-sm transition-all duration-200 z-10 ${
                  isSelected 
                    ? 'bg-blue-700 border-3 border-blue-900 shadow-lg ring-2 ring-blue-300' 
                    : 'bg-blue-400 hover:bg-blue-500'
                } ${isDragged ? 'opacity-75 scale-110' : ''}`}
                style={{ left: `${leftPosition}%` }}
                onMouseDown={(e) => handleKeyframeMouseDown(e, keyframe.id)}
                title={`Keyframe at ${keyframe.time.toFixed(1)}s - Drag to move`}
              >
                <div className="text-xs text-white text-center mt-1 font-bold">
                  {keyframe.objects.length}
                </div>
              </div>
            )
          })}
          
          {/* Current time indicator */}
          <div
            className="absolute top-0 w-1 h-12 bg-red-500 pointer-events-none"
            style={{ left: `${(currentTime / animationDuration) * 100}%` }}
          />
        </div>
        
        <div className="text-sm text-gray-600">
          <p>Current time: <strong>{currentTime.toFixed(2)}s</strong></p>
          <p>Selected keyframe: <strong>{selectedKeyframe}</strong></p>
          <p>Progress: <strong>{((currentTime / animationDuration) * 100).toFixed(1)}%</strong></p>
        </div>
      </div>
    </div>
  );
};

export default MinimalKeyframeAnimator;
