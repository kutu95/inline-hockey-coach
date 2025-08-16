import React from 'react'

const TextBlock = ({ content, isEditing, onChange, onSave, onCancel, className = '' }) => {
  // Simple function to convert markdown-style links to clickable HTML
  const renderMarkdownLinks = (text) => {
    if (!text) return ''
    
    // Convert markdown links [text](url) to clickable links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = text.split(linkRegex)
    
    if (parts.length === 1) {
      // No links found, just return the text with line breaks
      return text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    }
    
    // Links found, render with clickable elements
    const result = []
    for (let i = 0; i < parts.length; i += 3) {
      if (i + 2 < parts.length) {
        // This is a link: [text](url)
        const linkText = parts[i + 1]
        const linkUrl = parts[i + 2]
        
        // Add text before the link
        if (parts[i]) {
          result.push(
            <React.Fragment key={`text-${i}`}>
              {parts[i].split('\n').map((line, index) => (
                <React.Fragment key={`line-${i}-${index}`}>
                  {line}
                  {index < parts[i].split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          )
        }
        
        // Add the clickable link
        result.push(
          <a
            key={`link-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {linkText}
          </a>
        )
      } else {
        // This is remaining text after the last link
        if (parts[i]) {
          result.push(
            <React.Fragment key={`text-${i}`}>
              {parts[i].split('\n').map((line, index) => (
                <React.Fragment key={`line-${i}-${index}`}>
                  {line}
                  {index < parts[i].split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          )
        }
      }
    }
    
    return result
  }

  if (isEditing) {
    return (
      <div className={`bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Text Block</span>
          <div className="flex space-x-2">
            <button
              onClick={onSave}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              ✓ Save
            </button>
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ✗ Cancel
            </button>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your notes... Use [text](url) for links"
          className="w-full p-2 border border-gray-300 rounded-md bg-white"
          rows="4"
        />
        <div className="text-xs text-gray-500 mt-1">
          💡 Use [Link Text](https://example.com) to create clickable links
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 ${className}`}>
      <div className="text-gray-800">
        {renderMarkdownLinks(content)}
      </div>
    </div>
  )
}

export default TextBlock
