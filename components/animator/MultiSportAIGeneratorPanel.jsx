import React, { useState } from 'react';
import { testAPIConnectivity, generateMultiSportAnimation } from '../../src/lib/ai/multiSportAI.js';
import { getAllSports, getSportConfig } from '../../src/lib/sports/config';

const MultiSportAIGeneratorPanel = ({ 
  open, 
  onClose, 
  onGenerate, 
  currentSport = 'hockey' 
}) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testingAPI, setTestingAPI] = useState(false);
  const [selectedSport, setSelectedSport] = useState(currentSport);
  
  const availableSports = getAllSports();
  const sportConfig = getSportConfig(selectedSport);

  if (!open) return null;

  const handleGenerate = async () => {
    setError('');
    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }
    setLoading(true);
    try {
      const animationData = await generateMultiSportAnimation(description, selectedSport);
      await onGenerate(animationData, selectedSport);
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate animation.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAPI = async () => {
    setError('');
    setTestingAPI(true);
    try {
      const isConnected = await testAPIConnectivity();
      if (isConnected) {
        setError('✅ API connection successful!');
      } else {
        setError('❌ API connection failed. Check console for details.');
      }
    } catch (err) {
      setError(`❌ API test error: ${err.message}`);
    } finally {
      setTestingAPI(false);
    }
  };

  const getSportIcon = (sportId) => {
    switch (sportId) {
      case 'hockey': return '🏒';
      case 'soccer': return '⚽';
      case 'basketball': return '🏀';
      case 'football': return '🏈';
      case 'tennis': return '🎾';
      default: return '🏃';
    }
  };

  const getExamplePrompts = () => {
    switch (selectedSport) {
      case 'hockey':
        return [
          '2-on-1 passing drill with 3 players',
          'Breakout play from defensive zone',
          'Powerplay setup with puck movement'
        ];
      case 'soccer':
        return [
          'Passing drill with 4 players in diamond formation',
          'Shooting drill from penalty area',
          'Counter attack with 3 players'
        ];
      case 'basketball':
        return [
          'Pick and roll play with 2 players',
          'Fast break with 3 players',
          'Shooting drill from three-point line'
        ];
      default:
        return [
          'Basic drill with 2 players',
          'Passing sequence with 3 players',
          'Shooting drill from key area'
        ];
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white shadow-2xl rounded-xl border border-gray-200 p-6 flex flex-col space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          🤖 AI Animation Generator
          <span className="ml-2 text-sm font-normal text-gray-500">
            {getSportIcon(selectedSport)} {sportConfig.displayName}
          </span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl font-bold focus:outline-none"
          title="Close"
        >
          ×
        </button>
      </div>
      
      {/* Sport Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Sport</label>
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {availableSports.map(sport => (
            <option key={sport.id} value={sport.id}>
              {getSportIcon(sport.id)} {sport.displayName}
            </option>
          ))}
        </select>
      </div>
      
      {/* Description Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          className="w-full h-28 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 resize-none text-sm"
          placeholder={`Describe your ${sportConfig.displayName.toLowerCase()} drill animation...`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>
      
      {/* Example Prompts */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Example prompts:</label>
        <div className="space-y-1">
          {getExamplePrompts().map((prompt, index) => (
            <button
              key={index}
              onClick={() => setDescription(prompt)}
              className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-blue-50"
              disabled={loading}
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className={`text-sm p-2 rounded ${
          error.includes('✅') 
            ? 'text-green-700 bg-green-50 border border-green-200' 
            : 'text-red-600 bg-red-50 border border-red-200'
        }`}>
          {error}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleTestAPI}
          disabled={testingAPI || loading}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md disabled:opacity-50 flex items-center justify-center text-sm flex-shrink-0"
        >
          {testingAPI && (
            <svg className="animate-spin h-4 w-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          )}
          Test API
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading || testingAPI}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 flex items-center justify-center flex-1"
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          )}
          Generate Animation
        </button>
      </div>
      
      {/* Sport Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <div className="font-medium mb-1">{sportConfig.displayName} Settings:</div>
        <div>Field: {sportConfig.field.width}m × {sportConfig.field.height}m</div>
        <div>Default FPS: {sportConfig.animation.defaultFrameRate}</div>
        <div>Max Frames: {sportConfig.animation.maxFrames}</div>
      </div>
    </div>
  );
};

export default MultiSportAIGeneratorPanel;
