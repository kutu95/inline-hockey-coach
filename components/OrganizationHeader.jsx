import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import UserHeader from './UserHeader'

const OrganizationHeader = ({ title, showBackButton = true, backLinkText = "← Back to Organisation", backLinkUrl = null, playerProfile, playerPhotoUrl }) => {
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const orgId = params.orgId

  useEffect(() => {
    if (orgId) {
      fetchOrganization()
    }
  }, [orgId])

  const fetchOrganization = async () => {
    // Don't fetch if orgId is undefined or invalid
    if (!orgId || orgId === 'undefined') {
      console.log('Skipping organization fetch - orgId is undefined or invalid')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      setOrganization(data)
    } catch (err) {
      console.error('Error fetching organization:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {showBackButton && (
                <Link
                  to={backLinkUrl || `/organisations/${orgId}`}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  {backLinkText}
                </Link>
              )}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
            <UserHeader playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} orgId={orgId} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {showBackButton && (
                <Link
                  to={backLinkUrl || `/organisations/${orgId}`}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  {backLinkText}
                </Link>
              )}
            </div>
            <UserHeader playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} orgId={orgId} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex flex-col space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {showBackButton && (
              <Link
                to={backLinkUrl || `/organisations/${orgId}`}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                {backLinkText}
              </Link>
            )}
            <Link
              to={`/organisations/${orgId}`}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              {organization.logo_url && (
                <img
                  src={organization.logo_url}
                  alt={`${organization.name} logo`}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              <div className="text-sm text-gray-600 font-medium">
                {organization.name}
              </div>
            </Link>
          </div>
          <UserHeader playerProfile={playerProfile} playerPhotoUrl={playerPhotoUrl} orgId={orgId} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
      </div>
    </div>
  )
}

export default OrganizationHeader 