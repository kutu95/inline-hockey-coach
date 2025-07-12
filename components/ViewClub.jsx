import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import OrganizationHeader from './OrganizationHeader';
import { getAccreditationBadges, calculateAge } from '../src/utils/formatters';

const ViewClub = () => {
  const params = useParams();
  const clubId = params.id;
  const orgId = params.orgId;
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (clubId) {
      fetchClubData();
    }
  }, [clubId]);

  const fetchClubData = async () => {
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

      // Fetch players in this club
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', clubId)
        .order('first_name')
        .order('last_name');

      if (playersError) throw playersError;
      setPlayers(playersData || []);

    } catch (err) {
      console.error('Error fetching club data:', err);
      setError('Failed to fetch club data: ' + err.message);
    } finally {
      setLoading(false);
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
        <OrganizationHeader organizationId={orgId} />
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
        <OrganizationHeader organizationId={orgId} />
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
        <OrganizationHeader organizationId={orgId} />
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
      <OrganizationHeader organizationId={orgId} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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
                      className="w-12 h-12 object-contain mr-4"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
                    {club.description && (
                      <p className="text-gray-600 mt-1">{club.description}</p>
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
              <Link
                to={orgId ? `/organisations/${orgId}/players/add?club_id=${clubId}` : `/players/add?club_id=${clubId}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Player
              </Link>
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
                      <Link
                        to={orgId ? `/organisations/${orgId}/players/${player.id}` : `/players/${player.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Profile
                      </Link>
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