import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'

const OrganizationHeader = ({ title, showBackButton = true }) => {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link
                to={`/organisations/${orgId}`}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Back to Organisation
              </Link>
            )}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link
                to={`/organisations/${orgId}`}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Back to Organisation
              </Link>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Link
              to={`/organisations/${orgId}`}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back to Organisation
            </Link>
          )}
          <div className="flex items-center space-x-3">
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
          </div>
          <div className="text-gray-400">|</div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>
    </div>
  )
}

export default OrganizationHeader 