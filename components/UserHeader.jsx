import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const UserHeader = ({ playerProfile, playerPhotoUrl, orgId }) => {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      {playerProfile && (
        <Link
          to={`/organisations/${playerProfile.organization_id}/players/${playerProfile.id}`}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          {playerProfile.photo_url ? (
            <img
              src={playerPhotoUrl || playerProfile.photo_url}
              alt={`${playerProfile.first_name} ${playerProfile.last_name}`}
              className="w-10 h-10 object-cover rounded-full border border-gray-300"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
              onLoad={(e) => {
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'none'
                }
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center" style={{ display: playerProfile.photo_url ? 'none' : 'flex' }}>
              <span className="text-gray-500 text-sm font-medium">
                {playerProfile.first_name?.charAt(0)}{playerProfile.last_name?.charAt(0)}
              </span>
            </div>
          )}
        </Link>
      )}
      <button
        onClick={handleSignOut}
        className="text-red-600 hover:text-red-800 text-sm font-medium transition duration-150 ease-in-out"
      >
        Sign out
      </button>
    </div>
  )
}

export default UserHeader 