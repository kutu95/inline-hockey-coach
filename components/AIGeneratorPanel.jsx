import React, { useState } from 'react';
import { testAPIConnectivity } from '../src/lib/ai.js';

const AIGeneratorPanel = ({ open, onClose, onGenerate }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testingAPI, setTestingAPI] = useState(false);

  if (!open) return null;

  const handleGenerate = async () => {
    setError('');
    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }
    setLoading(true);
    try {
      await onGenerate(description);
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

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white shadow-2xl rounded-xl border border-gray-200 p-6 flex flex-col space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">🤖 AI Animation Generator</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl font-bold focus:outline-none"
          title="Close"
        >
          ×
        </button>
      </div>
      <textarea
        className="w-full h-28 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 resize-none"
        placeholder="Describe your drill animation..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        disabled={loading}
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex space-x-2">
        <button
          onClick={handleTestAPI}
          disabled={testingAPI || loading}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md disabled:opacity-50 flex items-center justify-center text-sm"
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
    </div>
  );
};

export default AIGeneratorPanel; 