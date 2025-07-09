// Helper function to format accreditations for display
export const formatAccreditations = (accreditations) => {
  if (!accreditations || accreditations.length === 0) {
    return 'None'
  }
  return accreditations.map(acc => acc.charAt(0).toUpperCase() + acc.slice(1)).join(', ')
}

// Helper function to calculate age from birthdate
export const calculateAge = (birthdate) => {
  if (!birthdate) return null
  
  const today = new Date()
  const birthDate = new Date(birthdate)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Helper function to format birthdate
export const formatBirthdate = (birthdate) => {
  if (!birthdate) return null
  
  return new Date(birthdate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to get accreditation badges
export const getAccreditationBadges = (accreditations) => {
  if (!accreditations || accreditations.length === 0) {
    return []
  }
  
  const badgeColors = {
    skater: 'bg-blue-100 text-blue-800',
    goalie: 'bg-green-100 text-green-800',
    coach: 'bg-purple-100 text-purple-800',
    referee: 'bg-orange-100 text-orange-800'
  }
  
  return accreditations.map(acc => ({
    text: acc.charAt(0).toUpperCase() + acc.slice(1),
    color: badgeColors[acc] || 'bg-gray-100 text-gray-800'
  }))
} 