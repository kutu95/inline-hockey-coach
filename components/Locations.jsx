import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import OrganizationHeader from './OrganizationHeader';

const Locations = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: '',
    google_maps_pin: ''
  });
  const [playerProfile, setPlayerProfile] = useState(null);
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLocations();
    if (orgId) {
      fetchPlayerProfile();
    }
  }, [orgId]);

  // Function to get signed URL for player photos
  const getSignedUrlForPlayerPhoto = async (url) => {
    // Only process URLs that are from Supabase storage
    if (!url || !url.includes('supabase.co') || !url.includes('/storage/')) {
      return null;
    }
    
    try {
      // Extract file path from the URL
      const urlParts = url.split('/');
      if (urlParts.length < 2) return null;
      
      const filePath = urlParts.slice(-2).join('/'); // Get user_id/filename
      
      // First check if the file exists
      const { data: existsData, error: existsError } = await supabase.storage
        .from('player-photos')
        .list(filePath.split('/')[0]); // List files in the user directory
      
      if (existsError) {
        // Silently skip if we can't check file existence
        return null;
      }
      
      // Check if the file exists in the list
      const fileName = filePath.split('/')[1];
      const fileExists = existsData?.some(file => file.name === fileName);
      
      if (!fileExists) {
        // Silently skip missing files - this is expected for some records
        return null;
      }
      
      const { data, error } = await supabase.storage
        .from('player-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry
      
      if (error) {
        // Silently skip if we can't get signed URL
        return null;
      }
      
      return data?.signedUrl || null;
    } catch (err) {
      // Silently skip if there's an error
      return null;
    }
  };

  // Fetch current user's player profile
  const fetchPlayerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, organization_id, first_name, last_name, photo_url')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching player profile:', error);
        return;
      }

      if (data) {
        setPlayerProfile(data);
        
        // Get signed URL for photo if it exists
        if (data.photo_url) {
          const signedUrl = await getSignedUrlForPlayerPhoto(data.photo_url);
          setPlayerPhotoUrl(signedUrl);
        }
      }
    } catch (err) {
      console.error('Error in fetchPlayerProfile:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const locationData = {
        ...formData,
        organization_id: orgId
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('locations')
          .insert(locationData);

        if (error) throw error;
      }

      setFormData({ name: '', description: '', website_url: '', google_maps_pin: '' });
      setEditingLocation(null);
      setShowAddForm(false);
      fetchLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      setError(err.message);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || '',
      website_url: location.website_url || '',
      google_maps_pin: location.google_maps_pin || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      fetchLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', website_url: '', google_maps_pin: '' });
    setEditingLocation(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader title="Locations" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizationHeader title="Locations" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Maps Pin
                  </label>
                  <input
                    type="text"
                    value={formData.google_maps_pin}
                    onChange={(e) => setFormData({ ...formData, google_maps_pin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Google Maps place ID or coordinates"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a Google Maps place ID, coordinates (lat,lng), or custom pin data
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {locations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-lg font-medium">No locations found</p>
              <p className="text-sm">Get started by adding your first location.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {locations.map((location) => (
                <div key={location.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                                      <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{location.name}</h3>
                    {location.description && (
                      <p className="text-gray-600 mt-1">{location.description}</p>
                    )}
                    {location.website_url && (
                      <a
                        href={location.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mt-1"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        Website
                      </a>
                    )}
                    {location.google_maps_pin && (
                      <a
                        href={location.google_maps_pin.startsWith('http') ? location.google_maps_pin : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.google_maps_pin)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-green-600 hover:text-green-800 text-sm mt-1"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        View on Google Maps
                      </a>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(location.created_at).toLocaleDateString()}
                    </p>
                  </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(location)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Locations; 