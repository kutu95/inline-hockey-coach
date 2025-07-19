import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'

const MediaAttachments = ({ type, itemId, title }) => {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (itemId) {
      loadMedia()
    }
  }, [itemId, type])

  const loadMedia = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Loading media for:', { type, itemId })
      
      let query
      if (type === 'drill') {
        query = supabase
          .from('drill_media')
          .select(`
            media_id,
            media_attachments!inner(*)
          `)
          .eq('drill_id', itemId)
      } else if (type === 'session') {
        query = supabase
          .from('session_media')
          .select(`
            media_id,
            media_attachments!inner(*)
          `)
          .eq('session_id', itemId)
      } else {
        throw new Error('Invalid type specified')
      }

      const { data, error } = await query
      
      console.log('📊 Media query result:', { data, error })

      if (error) {
        console.error('❌ Error loading media:', error)
        setError(error.message)
        return
      }

      // Transform the data to match expected format
      const transformedData = data.map(item => ({
        media_id: item.media_id || item.media_attachments?.id,
        title: item.media_attachments?.title || item.title,
        description: item.media_attachments?.description || item.description,
        file_type: item.media_attachments?.file_type || item.file_type,
        file_name: item.media_attachments?.file_name || item.file_name,
        file_size: item.media_attachments?.file_size || item.file_size,
        mime_type: item.media_attachments?.mime_type || item.mime_type,
        storage_path: item.media_attachments?.storage_path || item.storage_path,
        duration_seconds: item.media_attachments?.duration_seconds || item.duration_seconds,
        frame_count: item.media_attachments?.frame_count || item.frame_count,
        frame_rate: item.media_attachments?.frame_rate || item.frame_rate,
        created_at: item.media_attachments?.created_at || item.created_at
      }))

      console.log('🔄 Transformed media data:', transformedData)
      setMedia(transformedData)
    } catch (err) {
      console.error('💥 Error in loadMedia:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteMedia = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this media attachment?')) {
      return
    }

    try {
      // Delete the link first
      if (type === 'drill') {
        await supabase
          .from('drill_media')
          .delete()
          .eq('drill_id', itemId)
          .eq('media_id', mediaId)
      } else {
        await supabase
          .from('session_media')
          .delete()
          .eq('session_id', itemId)
          .eq('media_id', mediaId)
      }

      // Delete the media attachment
      await supabase
        .from('media_attachments')
        .delete()
        .eq('id', mediaId)

      // Reload media
      await loadMedia()
    } catch (err) {
      console.error('Error deleting media:', err)
      alert('Failed to delete media attachment')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMediaIcon = (fileType) => {
    switch (fileType) {
      case 'video': return '🎬'
      case 'audio': return '🎵'
      case 'image': return '🖼️'
      case 'animation': return '🎭'
      default: return '📎'
    }
  }

  const getSignedUrl = async (storagePath) => {
    console.log('🔍 Getting URL for storage path:', storagePath)
    
    try {
      // First try to get a signed URL
      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7 days expiry
      
      console.log('📋 Signed URL response:', { data, error })
      
      if (error) {
        console.error('❌ Error creating signed URL:', error)
        // Fallback to public URL
        const { data: publicData } = supabase.storage
          .from('media')
          .getPublicUrl(storagePath)
        
        console.log('🔗 Public URL fallback:', publicData)
        return publicData?.publicUrl || null
      }
      
      console.log('✅ Signed URL created:', data?.signedUrl)
      return data?.signedUrl || null
    } catch (err) {
      console.error('💥 Error getting signed URL:', err)
      // Fallback to public URL
      try {
        const { data: publicData } = supabase.storage
          .from('media')
          .getPublicUrl(storagePath)
        
        console.log('🔗 Public URL fallback (catch):', publicData)
        return publicData?.publicUrl || null
      } catch (fallbackErr) {
        console.error('💥 Error getting public URL:', fallbackErr)
        return null
      }
    }
  }

  const MediaPlayer = ({ media }) => {
    const [signedUrl, setSignedUrl] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const loadSignedUrl = async () => {
        console.log('🎬 Loading URL for media:', media)
        const url = await getSignedUrl(media.storage_path)
        console.log('🔗 Generated URL:', url)
        setSignedUrl(url)
        setLoading(false)
      }
      loadSignedUrl()
    }, [media.storage_path])

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )
    }

    if (!signedUrl) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">Failed to load media</p>
          <p className="text-red-500 text-xs mt-1">Storage path: {media.storage_path}</p>
        </div>
      )
    }

    switch (media.file_type) {
      case 'video':
        return (
          <div className="relative">
            <video 
              controls 
              className="w-full rounded-lg shadow-sm max-h-96 object-contain"
              preload="metadata"
            >
              <source src={signedUrl} type={media.mime_type} />
              Your browser does not support the video tag.
            </video>
          </div>
        )
      
      case 'audio':
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <audio 
              controls 
              className="w-full"
              preload="metadata"
            >
              <source src={signedUrl} type={media.mime_type} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        )
      
      case 'image':
        return (
          <div className="flex justify-center">
            <img 
              src={signedUrl} 
              alt={media.title}
              className="max-w-full max-h-96 rounded-lg shadow-sm object-contain"
              loading="lazy"
            />
          </div>
        )
      
      case 'animation':
        // For animations, we'll show a download link since they're typically ZIP files
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">📦</span>
              <span className="text-blue-800 font-medium">Animation Package</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              This is an animation package containing frames and metadata.
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = signedUrl
                link.download = media.file_name
                link.click()
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition duration-150 ease-in-out"
            >
              Download Animation
            </button>
          </div>
        )
      
      default:
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm">Unsupported media type</p>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = signedUrl
                link.download = media.file_name
                link.click()
              }}
              className="mt-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition duration-150 ease-in-out"
            >
              Download File
            </button>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Media Attachments</h3>
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Media Attachments</h3>
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Media Attachments</h3>
        <p className="text-sm text-gray-600 mt-1">Videos, animations, and other media related to this drill</p>
      </div>
      
      <div className="p-6">
      
      {media.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          <div className="text-4xl mb-2">📎</div>
          <p>No media attachments yet</p>
          <p className="text-sm">Create animations in the Drill Designer to attach them here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {media.map((item) => (
            <div key={item.media_id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Media Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-2xl">{getMediaIcon(item.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{item.file_name}</span>
                        <span>{formatFileSize(item.file_size)}</span>
                        {item.duration_seconds && (
                          <span>{formatDuration(item.duration_seconds)}</span>
                        )}
                        {item.frame_count && (
                          <span>{item.frame_count} frames</span>
                        )}
                        {item.frame_rate && (
                          <span>{item.frame_rate} FPS</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Download the file
                        const { data } = supabase.storage
                          .from('media')
                          .getPublicUrl(item.storage_path)
                        
                        const link = document.createElement('a')
                        link.href = data.publicUrl
                        link.download = item.file_name
                        link.click()
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => deleteMedia(item.media_id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Media Player */}
              <div className="p-4">
                <MediaPlayer media={item} />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

export default MediaAttachments 