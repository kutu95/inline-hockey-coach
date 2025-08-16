import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import OrganizationHeader from './OrganizationHeader';
import { getAccreditationBadges, calculateAge } from '../src/utils/formatters';

const ViewClub = () => {
  const { orgId, id: clubId } = useParams();
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null);
  const { user, hasRole } = useAuth();
  
  // Debug logging
  console.log('ViewClub: orgId =', orgId);
  console.log('ViewClub: clubId =', clubId);
  
  // Determine user permissions
  const canAddPlayers = hasRole('superadmin') || hasRole('admin') || hasRole('coach');
  const canViewPlayers = hasRole('superadmin') || hasRole('admin') || hasRole('coach');

  useEffect(() => {
    console.log('ViewClub useEffect triggered with clubId:', clubId, 'orgId:', orgId);
    if (clubId && clubId !== 'undefined') {
      console.log('Calling fetchClub and fetchPlayers');
      fetchClub();
      fetchPlayers();
    } else {
      console.log('clubId is not valid, skipping fetchClub and fetchPlayers');
    }
    if (orgId && orgId !== 'undefined') {
      console.log('Calling fetchPlayerProfile');
      fetchPlayerProfile();
    } else {
      console.log('orgId is not valid, skipping fetchPlayerProfile');
    }
  }, [clubId, orgId]);

  const fetchClub = async () => {
    console.log('fetchClub called with clubId:', clubId);
    if (!clubId || clubId === 'undefined') {
      console.log('clubId is undefined, skipping fetchClub');
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;
      setClub(clubData);

    } catch (err) {
      console.error('Error fetching club data:', err);
      setError('Failed to fetch club data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    console.log('fetchPlayers called with clubId:', clubId);
    if (!clubId || clubId === 'undefined') {
      console.log('clubId is undefined, skipping fetchPlayers');
      return;
    }
    
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, first_name, last_name, birthdate, email, phone, accreditations, status, user_id')
        .eq('club_id', clubId)
        .order('first_name')
        .order('last_name');

      if (playersError) throw playersError;
      setPlayers(playersData || []);

    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to fetch players: ' + err.message);
    }
  };

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

  // Helper functions to count players by accreditation
  const countPlayersByAccreditation = (accreditation) => {
    return players.filter(player => 
      player.accreditations && player.accreditations.includes(accreditation)
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader organizationId={orgId} showBackButton={false} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader organizationId={orgId} showBackButton={false} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link
                to={orgId ? `/organisations/${orgId}/clubs` : '/clubs'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Back to Clubs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader organizationId={orgId} showBackButton={false} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Club Not Found</h2>
              <p className="text-gray-600 mb-6">The requested club could not be found.</p>
              <Link
                to={orgId ? `/organisations/${orgId}/clubs` : '/clubs'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Back to Clubs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
              <OrganizationHeader 
          title="Club Details" 
          showBackButton={false} 
          playerProfile={playerProfile} 
          playerPhotoUrl={playerPhotoUrl}
        />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Link
                  to={orgId ? `/organisations/${orgId}/clubs` : '/clubs'}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Back to Clubs
                </Link>
                <div className="flex items-center">
                  {club.logo_url && (
                    <img
                      src={club.logo_url}
                      alt={`${club.name} logo`}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain mr-3 sm:mr-4"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{club.name}</h1>
                    {club.description && (
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">{club.description}</p>
                    )}
                    {/* Social Media Links */}
                    {(club.facebook_url || club.instagram_url || club.website_url) && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {club.website_url && (
                          <a
                            href={club.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                            Website
                          </a>
                        )}
                        {club.facebook_url && (
                          <a
                            href={club.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook
                          </a>
                        )}
                        {club.instagram_url && (
                          <a
                            href={club.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-pink-600 hover:text-pink-800 text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"/>
                            </svg>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Created {new Date(club.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Club Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Total Players</h3>
                <p className="text-2xl font-bold text-blue-600">{players.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Coaches</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {countPlayersByAccreditation('coach')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Referees</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {countPlayersByAccreditation('referee')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Goalies</h3>
                <p className="text-2xl font-bold text-green-600">
                  {countPlayersByAccreditation('goalie')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Club Members</h2>
              {canAddPlayers && (
                <Link
                  to={orgId ? `/organisations/${orgId}/players/add?club_id=${clubId}` : `/players/add?club_id=${clubId}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Player
                </Link>
              )}
            </div>
          </div>
          
          {players.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-lg font-medium">No players in this club</p>
              <p className="text-sm">Players will appear here when they join this club</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {players.map((player) => {
                const accreditationBadges = getAccreditationBadges(player.accreditations);
                return (
                  <div key={player.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {player.first_name?.[0]}{player.last_name?.[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {player.first_name} {player.last_name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {player.email && (
                            <span>{player.email}</span>
                          )}
                          {player.phone && (
                            <span>{player.phone}</span>
                          )}
                          {player.birthdate && (
                            <span>{calculateAge(player.birthdate)} years old</span>
                          )}
                        </div>
                        {accreditationBadges.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            {accreditationBadges.map((badge, index) => (
                              <span
                                key={index}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                              >
                                {badge.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        player.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.status || 'active'}
                      </span>
                      {(canViewPlayers || player.user_id === user?.id) ? (
                        <Link
                          to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Profile
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">
                          View Profile
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewClub; 