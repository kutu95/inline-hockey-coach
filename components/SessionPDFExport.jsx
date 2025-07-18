import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const SessionPDFExport = () => {
  const [session, setSession] = useState(null)
  const [pdfData, setPdfData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [imageUrls, setImageUrls] = useState({})
  
  const { user } = useAuth()
  const params = useParams()
  const sessionId = params.sessionId
  const orgId = params.orgId

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_session_pdf_data', {
        session_uuid: sessionId
      })

      if (error) throw error

      if (data) {
        setSession(data.session)
        setPdfData(data)
        
        // Get signed URLs for drill images
        await getSignedUrls(data)
      }
    } catch (err) {
      setError('Failed to fetch session data')
      console.error('Error fetching session data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSignedUrls = async (data) => {
    const urls = {}
    
    // Get signed URLs for planning content drill images
    if (data.planning_content) {
      for (const block of data.planning_content) {
        if (block.type === 'drill' && block.content.image_url) {
          try {
            const urlParts = block.content.image_url.split('/')
            const filePath = urlParts.slice(-2).join('/')
            
            const { data: { signedUrl } } = await supabase.storage
              .from('drill-images')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
            
            urls[block.content.title] = signedUrl
          } catch (err) {
            console.error('Error getting signed URL for drill image:', err)
          }
        }
      }
    }
    
    // Get signed URLs for session drills images
    if (data.session_drills) {
      for (const sessionDrill of data.session_drills) {
        if (sessionDrill.drill.image_url) {
          try {
            const urlParts = sessionDrill.drill.image_url.split('/')
            const filePath = urlParts.slice(-2).join('/')
            
            const { data: { signedUrl } } = await supabase.storage
              .from('drill-images')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry
            
            urls[sessionDrill.drill.title] = signedUrl
          } catch (err) {
            console.error('Error getting signed URL for drill image:', err)
          }
        }
      }
    }
    
    setImageUrls(urls)
  }

  const generatePDF = async () => {
    if (!pdfData) return

    try {
      setGenerating(true)
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      let yPosition = margin

      // Helper function to add text with word wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 12) => {
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y)
        return lines.length * (fontSize * 0.4) // Approximate line height
      }

      // Helper function to add image
      const addImage = async (imageUrl, x, y, maxWidth, maxHeight) => {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          return new Promise((resolve) => {
            img.onload = () => {
              const aspectRatio = img.width / img.height
              let width = maxWidth
              let height = width / aspectRatio
              
              if (height > maxHeight) {
                height = maxHeight
                width = height * aspectRatio
              }
              
              doc.addImage(img, 'JPEG', x, y, width, height)
              resolve(height + 10) // Return height used + spacing
            }
            
            img.onerror = () => {
              resolve(0) // No height used if image fails to load
            }
            
            img.src = imageUrl
          })
        } catch (err) {
          console.error('Error adding image:', err)
          return 0
        }
      }

      // Header
      doc.setFontSize(24)
      doc.setFont(undefined, 'bold')
      doc.text(pdfData.session.title, margin, yPosition)
      yPosition += 15

      // Session details
      doc.setFontSize(12)
      doc.setFont(undefined, 'normal')
      const sessionDetails = [
        `Date: ${new Date(pdfData.session.date).toLocaleDateString()}`,
        `Time: ${pdfData.session.start_time}`,
        `Duration: ${pdfData.session.duration_minutes} minutes`,
        `Location: ${pdfData.session.location}`
      ]
      
      sessionDetails.forEach(detail => {
        doc.text(detail, margin, yPosition)
        yPosition += 8
      })

      yPosition += 10

      // Session description
      if (pdfData.session.description) {
        yPosition += addWrappedText(`Description: ${pdfData.session.description}`, margin, yPosition, contentWidth)
        yPosition += 10
      }

      // Planning content
      if (pdfData.planning_content && pdfData.planning_content.length > 0) {
        doc.setFontSize(16)
        doc.setFont(undefined, 'bold')
        doc.text('Session Plan', margin, yPosition)
        yPosition += 15

        doc.setFontSize(12)
        doc.setFont(undefined, 'normal')

        for (const block of pdfData.planning_content) {
          // Check if we need a new page
          if (yPosition > doc.internal.pageSize.height - 50) {
            doc.addPage()
            yPosition = margin
          }

          switch (block.type) {
            case 'heading':
              doc.setFontSize(14)
              doc.setFont(undefined, 'bold')
              yPosition += addWrappedText(block.content, margin, yPosition, contentWidth, 14)
              yPosition += 8
              doc.setFontSize(12)
              doc.setFont(undefined, 'normal')
              break

            case 'drill':
              // Drill title
              doc.setFontSize(13)
              doc.setFont(undefined, 'bold')
              yPosition += addWrappedText(block.content.title, margin, yPosition, contentWidth, 13)
              yPosition += 8

              // Drill description
              doc.setFontSize(11)
              doc.setFont(undefined, 'normal')
              if (block.content.short_description) {
                yPosition += addWrappedText(block.content.short_description, margin, yPosition, contentWidth, 11)
                yPosition += 6
              }

              if (block.content.description) {
                yPosition += addWrappedText(block.content.description, margin, yPosition, contentWidth, 11)
                yPosition += 6
              }

              // Drill details
              const drillDetails = [
                `Players: ${block.content.min_players}-${block.content.max_players || '∞'}`,
                `Features: ${(block.content.features || []).join(', ')}`
              ]
              
              drillDetails.forEach(detail => {
                doc.text(detail, margin, yPosition)
                yPosition += 6
              })

              // Drill image
              if (block.content.image_url && imageUrls[block.content.title]) {
                const imageHeight = await addImage(imageUrls[block.content.title], margin, yPosition, contentWidth, 100)
                yPosition += imageHeight
              }

              // Session-specific notes
              if (block.content.session_notes) {
                yPosition += 5
                doc.setFontSize(10)
                doc.setFont(undefined, 'italic')
                yPosition += addWrappedText(`Notes: ${block.content.session_notes}`, margin, yPosition, contentWidth, 10)
                yPosition += 8
                doc.setFontSize(12)
                doc.setFont(undefined, 'normal')
              }

              yPosition += 10
              break

            case 'text':
            default:
              yPosition += addWrappedText(block.content, margin, yPosition, contentWidth)
              yPosition += 10
              break
          }
        }
      }

      // Session drills section
      if (pdfData.session_drills && pdfData.session_drills.length > 0) {
        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage()
          yPosition = margin
        }

        doc.setFontSize(16)
        doc.setFont(undefined, 'bold')
        doc.text('Session Drills', margin, yPosition)
        yPosition += 15

        doc.setFontSize(12)
        doc.setFont(undefined, 'normal')

        for (const sessionDrill of pdfData.session_drills) {
          // Check if we need a new page
          if (yPosition > doc.internal.pageSize.height - 100) {
            doc.addPage()
            yPosition = margin
          }

          const drill = sessionDrill.drill

          // Drill title
          doc.setFontSize(13)
          doc.setFont(undefined, 'bold')
          yPosition += addWrappedText(drill.title, margin, yPosition, contentWidth, 13)
          yPosition += 8

          // Drill details
          doc.setFontSize(11)
          doc.setFont(undefined, 'normal')
          
          if (sessionDrill.duration_minutes) {
            doc.text(`Duration: ${sessionDrill.duration_minutes} minutes`, margin, yPosition)
            yPosition += 6
          }

          if (drill.short_description) {
            yPosition += addWrappedText(drill.short_description, margin, yPosition, contentWidth, 11)
            yPosition += 6
          }

          if (drill.description) {
            yPosition += addWrappedText(drill.description, margin, yPosition, contentWidth, 11)
            yPosition += 6
          }

          // Drill image
          if (drill.image_url && imageUrls[drill.title]) {
            const imageHeight = await addImage(imageUrls[drill.title], margin, yPosition, contentWidth, 100)
            yPosition += imageHeight
          }

          // Session-specific notes
          if (sessionDrill.notes) {
            yPosition += 5
            doc.setFontSize(10)
            doc.setFont(undefined, 'italic')
            yPosition += addWrappedText(`Notes: ${sessionDrill.notes}`, margin, yPosition, contentWidth, 10)
            yPosition += 8
            doc.setFontSize(12)
            doc.setFont(undefined, 'normal')
          }

          yPosition += 10
        }
      }

      // Footer
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, doc.internal.pageSize.height - 10)

      // Save the PDF
      const fileName = `${pdfData.session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_session_plan.pdf`
      doc.save(fileName)

    } catch (err) {
      setError('Failed to generate PDF')
      console.error('Error generating PDF:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Session PDF Export</h1>
                  <p className="text-gray-600 mt-1">Generate a professional PDF of your session plan</p>
                </div>
                <button
                  onClick={generatePDF}
                  disabled={generating || !pdfData}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {/* Session Preview */}
            <div className="px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Preview</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{session.title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Date:</span> {new Date(session.date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {session.start_time}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {session.location}
                  </div>
                </div>
                {session.description && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Description:</span> {session.description}
                  </div>
                )}
              </div>

              {/* Content Preview */}
              {pdfData && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Content Preview</h3>
                  
                  {pdfData.planning_content && pdfData.planning_content.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Session Plan ({pdfData.planning_content.length} blocks)</h4>
                      <div className="text-sm text-gray-600">
                        {pdfData.planning_content.map((block, index) => (
                          <div key={index} className="mb-1">
                            • {block.type === 'drill' ? `Drill: ${block.content.title}` : `${block.type}: ${block.content.substring(0, 50)}...`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pdfData.session_drills && pdfData.session_drills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Session Drills ({pdfData.session_drills.length} drills)</h4>
                      <div className="text-sm text-gray-600">
                        {pdfData.session_drills.map((sessionDrill, index) => (
                          <div key={index} className="mb-1">
                            • {sessionDrill.drill.title} {sessionDrill.duration_minutes && `(${sessionDrill.duration_minutes} min)`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionPDFExport 