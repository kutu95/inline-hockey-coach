import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const UserHeader = ({ playerProfile, playerPhotoUrl, orgId, variant = 'default' }) => {
  const { user, signOut } = useAuth()
  const [localProfile, setLocalProfile] = useState(null)
  const [localPhotoUrl, setLocalPhotoUrl] = useState(null)

  // Fetch minimal player profile if not provided
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || playerProfile) return
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, organization_id, first_name, last_name, photo_url')
          .eq('user_id', user.id)
        if (!error && data && data.length > 0) {
          const prof = data[0]
          setLocalProfile(prof)
          if (prof.photo_url && prof.photo_url.includes('supabase.co') && prof.photo_url.includes('/storage/')) {
            // Attempt to create a signed URL
            try {
              const urlParts = prof.photo_url.split('/')
              const filePath = urlParts.slice(-2).join('/')
              const { data: signed } = await supabase.storage
                .from('player-photos')
                .createSignedUrl(filePath, 60 * 60 * 24 * 7)
              if (signed?.signedUrl) setLocalPhotoUrl(signed.signedUrl)
            } catch (_) {
              // ignore, will fallback to original URL
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchProfile()
  }, [user, playerProfile])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const effectiveProfile = playerProfile || localProfile
  const effectivePhotoUrl = playerPhotoUrl || localPhotoUrl || effectiveProfile?.photo_url || '/backcheck-logo.png'
  const avatarBorderClass = variant === 'onBlue' ? 'border-white/70' : 'border-gray-300'
  const signOutClass = variant === 'onBlue'
    ? 'text-white hover:text-blue-200 text-sm font-medium transition duration-150 ease-in-out'
    : 'text-red-600 hover:text-red-800 text-sm font-medium transition duration-150 ease-in-out'

  return (
    <div className="flex flex-col items-end space-y-2">
      {effectiveProfile && (
        <Link
          to={`/organisations/${effectiveProfile.organization_id}/players/${effectiveProfile.id}`}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <img
            src={effectivePhotoUrl}
            alt={`${effectiveProfile.first_name || 'Player'} ${effectiveProfile.last_name || ''}`}
            className={`w-10 h-10 object-cover rounded-full border ${avatarBorderClass}`}
          />
        </Link>
      )}
      <button
        onClick={handleSignOut}
        className={signOutClass}
      >
        Sign out
      </button>
    </div>
  )
}

export default UserHeader 