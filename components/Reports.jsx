import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/contexts/AuthContext";
import OrganizationHeader from "./OrganizationHeader";

const Reports = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalSquads: 0,
    totalSessions: 0,
    totalDrills: 0,
    totalClubs: 0,
    totalLocations: 0
  });
  const [playerProfile, setPlayerProfile] = useState(null);
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrganizationData();
    fetchStats();
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

  const fetchOrganizationData = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) {
        console.error('Error fetching organisation:', error);
        return;
      }

      setOrganization(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch counts for each table
      const [playersResult, squadsResult, sessionsResult, drillsResult, clubsResult, locationsResult] = await Promise.all([
        supabase.from('players').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('squads').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('sessions').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('drills').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('clubs').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('locations').select('id', { count: 'exact' }).eq('organization_id', orgId)
      ]);

      setStats({
        totalPlayers: playersResult.count || 0,
        totalSquads: squadsResult.count || 0,
        totalSessions: sessionsResult.count || 0,
        totalDrills: drillsResult.count || 0,
        totalClubs: clubsResult.count || 0,
        totalLocations: locationsResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Organisation Not Found</h2>
            <p className="text-gray-600 mb-4">The organisation you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/organisations')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Back to Organisations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
              <OrganizationHeader title="Reports" showBackButton={false} playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive overview and insights for {organization.name}</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Players</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPlayers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Squads</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSquads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Drills</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDrills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Clubs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalClubs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Locations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalLocations}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate(`/organisations/${orgId}/players`)}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Players</p>
                <p className="text-sm text-gray-500">View and edit player information</p>
              </div>
            </button>

            <button
              onClick={() => navigate(`/organisations/${orgId}/sessions`)}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Sessions</p>
                <p className="text-sm text-gray-500">Schedule and organize training sessions</p>
              </div>
            </button>

            <button
              onClick={() => navigate(`/organisations/${orgId}/attendance`)}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">Attendance Tracking</p>
                <p className="text-sm text-gray-500">Monitor session attendance</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 