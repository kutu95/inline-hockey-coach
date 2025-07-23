import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const SessionTemplateView = () => {
  const [template, setTemplate] = useState(null)
  const [templateBlocks, setTemplateBlocks] = useState([])
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, hasRole } = useAuth()
  const { templateId, orgId } = useParams()

  useEffect(() => {
    fetchTemplateData()
  }, [templateId])

  const fetchTemplateData = async () => {
    try {
      setLoading(true)
      console.log('Fetching template with ID:', templateId)
      
      const { data, error } = await supabase.rpc('get_template_with_blocks', {
        template_uuid: templateId
      })

      console.log('RPC response:', { data, error })

      if (error) {
        console.error('RPC error:', error)
        throw error
      }

      if (data && data.length > 0) {
        const templateData = data[0] // RPC returns an array of objects
        console.log('Template data:', templateData)
        
        if (templateData.template) {
          setTemplate(templateData.template)
          setTemplateBlocks(templateData.template_blocks || [])
          
          // Fetch drill details for drill blocks
          const drillIds = templateData.template_blocks
            ?.filter(block => block.drill_id)
            .map(block => block.drill_id) || []
          
          if (drillIds.length > 0) {
            const { data: drillData, error: drillError } = await supabase
              .from('drills')
              .select('*')
              .in('id', drillIds)
            
            if (!drillError) {
              setDrills(drillData || [])
            }
          }
        } else {
          console.log('No template found in data')
          setError('Template not found')
        }
      } else {
        console.log('No data returned from RPC')
        setError('Template not found')
      }
    } catch (err) {
      setError('Failed to fetch template data')
      console.error('Error fetching template data:', err)
    } finally {
      setLoading(false)
    }
  }

  const canEditTemplate = () => {
    if (!template) return false
    
    if (orgId) {
      return template.author_id === user.id || hasRole('admin') || hasRole('superadmin')
    }
    return template.author_id === user.id
  }

  const canDeleteTemplate = () => {
    if (orgId) {
      return hasRole('admin') || hasRole('superadmin')
    }
    return template?.author_id === user.id
  }

  const handleDeleteTemplate = async () => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('session_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      // Navigate back to templates list
      window.location.href = orgId 
        ? `/organisations/${orgId}/session-templates`
        : '/session-templates'
    } catch (err) {
      console.error('Error deleting template:', err)
      alert('Failed to delete template')
    }
  }

  const renderBlock = (block) => {
    switch (block.block_type) {
      case 'text':
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            <div className="text-gray-700 whitespace-pre-wrap">{block.content}</div>
          </div>
        )

      case 'heading':
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{block.content}</h3>
          </div>
        )

      case 'drill':
        const drill = drills.find(d => d.id === block.drill_id)
        return (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
            {drill ? (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-semibold text-gray-900">{drill.title}</h4>
                {drill.short_description && (
                  <p className="text-sm text-gray-600 mt-1">{drill.short_description}</p>
                )}
                {drill.description && (
                  <p className="text-sm text-gray-700 mt-2">{drill.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {drill.features?.map(feature => (
                    <span key={feature} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {drill.min_players}{drill.max_players ? `-${drill.max_players}` : '+'} players
                  {drill.duration_minutes && ` • ${drill.duration_minutes} minutes`}
                </div>
                <div className="mt-3">
                  <Link
                    to={orgId 
                      ? `/organisations/${orgId}/drills/${drill.id}`
                      : `/drills/${drill.id}`
                    }
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Drill Details →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-red-600 text-sm">Drill not found</div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested template could not be found.'}</p>
          <Link
            to={orgId ? `/organisations/${orgId}/session-templates` : "/session-templates"}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {orgId && <OrganizationHeader />}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to={orgId ? `/organisations/${orgId}/session-templates` : "/session-templates"}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Back to Templates
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{template.title}</h1>
              </div>
              
              <div className="flex space-x-2">
                {canEditTemplate() && (
                  <Link
                    to={orgId 
                      ? `/organisations/${orgId}/session-templates/${template.id}/edit`
                      : `/session-templates/${template.id}/edit`
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Edit Template
                  </Link>
                )}
                {canDeleteTemplate() && (
                  <button
                    onClick={handleDeleteTemplate}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Delete Template
                  </button>
                )}
                <Link
                  to={orgId 
                    ? `/organisations/${orgId}/sessions/new?template=${template.id}`
                    : `/sessions/new?template=${template.id}`
                  }
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Use Template
                </Link>
              </div>
            </div>
          </div>

          {/* Template Details */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  {template.description && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700">{template.description}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{template.duration_minutes} minutes</span>
                    <span>•</span>
                    <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                    {template.updated_at !== template.created_at && (
                      <>
                        <span>•</span>
                        <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="md:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Template Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-900">Author:</dt>
                        <dd className="text-gray-700">
                          {template.author_id === user.id ? 'You' : 'Another user'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Type:</dt>
                        <dd className="text-gray-700">
                          {template.organization_id ? 'Organization Template' : 'Personal Template'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Content Blocks:</dt>
                        <dd className="text-gray-700">{templateBlocks.length}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Content */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Content</h2>
              
              {templateBlocks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>This template has no content blocks.</p>
                </div>
              ) : (
                <div>
                  {templateBlocks.map((block, index) => (
                    <div key={block.id}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionTemplateView 