import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionTemplatesList = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, hasRole } = useAuth()
  const { orgId } = useParams()

  useEffect(() => {
    fetchTemplates()
  }, [orgId])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      console.log('Fetching templates, orgId:', orgId)
      
      let query = supabase
        .from('session_templates')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by organization if in org context
      if (orgId && orgId !== 'undefined') {
        console.log('Filtering by organization:', orgId)
        query = query.eq('organization_id', orgId)
      } else {
        console.log('Filtering for personal templates (no organization)')
        // Personal templates only
        query = query.is('organization_id', null)
      }

      const { data, error } = await query

      console.log('Templates query result:', { data, error })

      if (error) throw error
      
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('session_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      // Refresh the list
      fetchTemplates()
    } catch (err) {
      console.error('Error deleting template:', err)
      alert('Failed to delete template')
    }
  }

  const canCreateTemplate = () => {
    if (orgId) {
      return hasRole('coach') || hasRole('admin') || hasRole('superadmin')
    }
    return true // Personal templates
  }

  const canEditTemplate = (template) => {
    if (orgId) {
      return template.author_id === user.id || hasRole('admin') || hasRole('superadmin')
    }
    return template.author_id === user.id
  }

  const canDeleteTemplate = () => {
    if (orgId) {
      return hasRole('admin') || hasRole('superadmin')
    }
    return true // Personal templates - author can delete
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {orgId && <OrganizationHeader />}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to={orgId ? `/organisations/${orgId}/sessions` : "/sessions"}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Back to Sessions
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Session Templates</h1>
              </div>
              
              {canCreateTemplate() && (
                <Link
                  to={orgId ? `/organisations/${orgId}/session-templates/new` : "/session-templates/new"}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Create Template
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-4">
                  {orgId 
                    ? "No session templates have been created for this organization yet."
                    : "You haven't created any personal session templates yet."
                  }
                </p>
                {canCreateTemplate() && (
                  <Link
                    to={orgId ? `/organisations/${orgId}/session-templates/new` : "/session-templates/new"}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Create Your First Template
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {template.title}
                      </h3>
                      <div className="flex space-x-2 ml-4">
                        {canEditTemplate(template) && (
                          <Link
                            to={orgId 
                              ? `/organisations/${orgId}/session-templates/${template.id}/edit`
                              : `/session-templates/${template.id}/edit`
                            }
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Edit
                          </Link>
                        )}
                        {canDeleteTemplate() && (
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {template.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{template.duration_minutes} minutes</span>
                      <span>
                        by {template.author_id ? 'User' : 'Unknown'}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <Link
                          to={orgId 
                            ? `/organisations/${orgId}/session-templates/${template.id}`
                            : `/session-templates/${template.id}`
                          }
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md text-center text-sm transition duration-150 ease-in-out"
                        >
                          View
                        </Link>
                        <Link
                          to={orgId 
                            ? `/organisations/${orgId}/sessions/new?template=${template.id}`
                            : `/sessions/new?template=${template.id}`
                          }
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-md text-center text-sm transition duration-150 ease-in-out"
                        >
                          Use Template
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionTemplatesList 