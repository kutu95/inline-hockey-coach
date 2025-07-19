import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import OrganizationHeader from './OrganizationHeader';

const AdminPanel = () => {
  const { orgId } = useParams();
  const [playerProfile, setPlayerProfile] = useState(null);
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
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

  const adminLinks = [
    {
      title: 'Locations',
      description: 'Manage training locations and facilities',
      href: `/organisations/${orgId}/locations`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Clubs',
      description: 'Manage hockey clubs and teams',
      href: `/organisations/${orgId}/clubs`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
              <OrganizationHeader title="Admin Panel" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage your organization's settings and data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((link) => (
            <Link
              key={link.title}
              to={link.href}
              className="block group"
            >
              <div className={`${link.color} text-white p-6 rounded-lg shadow-lg transition-all duration-200 group-hover:shadow-xl group-hover:scale-105`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white">
                    {link.icon}
                  </div>
                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{link.title}</h3>
                <p className="text-blue-100">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to={`/organisations/${orgId}`}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-gray-700">Back to Organization</span>
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-gray-700">Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 