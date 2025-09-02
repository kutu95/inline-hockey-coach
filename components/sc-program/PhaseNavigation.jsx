import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { useState, useEffect } from 'react'

const PhaseNavigation = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [userProgress, setUserProgress] = useState({})

  const phases = [
    { id: 'PHASE_0', name: 'Phase 0', title: 'Pre-Season Prep', weeks: '4 weeks', description: 'Foundation building', color: 'gray' },
    { id: 'PHASE_I', name: 'Phase I', title: 'Foundation', weeks: '8 weeks', description: 'Base building', color: 'blue' },
    { id: 'PHASE_II', name: 'Phase II', title: 'Transition', weeks: '8 weeks', description: 'Race pace development', color: 'orange' },
    { id: 'PHASE_III', name: 'Phase III', title: 'Peak Power', weeks: '6 weeks', description: 'High intensity', color: 'red' },
    { id: 'PHASE_IV', name: 'Phase IV', title: 'Competition', weeks: '8 weeks', description: 'Game ready', color: 'green' },
    { id: 'PHASE_V', name: 'Phase V', title: 'Recovery', weeks: '4 weeks', description: 'Active recovery', color: 'purple' }
  ]

  useEffect(() => {
    if (user) {
      loadUserProgress()
    }
  }, [user])

  async function loadUserProgress() {
    try {
      const { data: plans } = await supabase
        .from('sc_plans')
        .select('phase, created_at')
        .eq('user_id', user.id)
        .order('created_at')

      if (plans) {
        const progress = {}
        plans.forEach(plan => {
          progress[plan.phase] = {
            started: true,
            startedAt: plan.created_at
          }
        })
        setUserProgress(progress)
      }
    } catch (error) {
      console.error('Error loading user progress:', error)
    }
  }

  const getPhaseStatus = (phaseId) => {
    if (userProgress[phaseId]) {
      return 'started'
    }
    
    // For now, make all phases available for testing
    // In a real implementation, you'd check completion status
    const phaseIndex = phases.findIndex(p => p.id === phaseId)
    if (phaseIndex >= 0) {
      return 'available'
    }
    
    return 'locked'
  }

  const getColorClasses = (phase, status) => {
    const baseColors = {
      gray: 'bg-gray-100 border-gray-200 text-gray-700',
      blue: 'bg-blue-100 border-blue-200 text-blue-700',
      orange: 'bg-orange-100 border-orange-200 text-orange-700',
      red: 'bg-red-100 border-red-200 text-red-700',
      green: 'bg-green-100 border-green-200 text-green-700',
      purple: 'bg-purple-100 border-purple-200 text-purple-700'
    }

    const statusClasses = {
      available: 'hover:shadow-md cursor-pointer',
      started: 'ring-2 ring-blue-500 shadow-md',
      locked: 'opacity-50 cursor-not-allowed'
    }

    return `${baseColors[phase.color]} ${statusClasses[status]}`
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'started':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'available':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )
      case 'locked':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getPhaseRoute = (phaseId) => {
    switch (phaseId) {
      case 'PHASE_0':
        return '/strength-conditioning/phase-0'
      case 'PHASE_I':
        return '/strength-conditioning/phase-1'
      case 'PHASE_II':
        return '/strength-conditioning/phase-2'
      case 'PHASE_III':
        return '/strength-conditioning/phase-3'
      case 'PHASE_IV':
        return '/strength-conditioning/phase-4'
      case 'PHASE_V':
        return '/strength-conditioning/phase-5'
      default:
        return '/strength-conditioning'
    }
  }

  const isCurrentPhase = (phaseId) => {
    const currentPath = location.pathname
    const phaseRoute = getPhaseRoute(phaseId)
    return currentPath === phaseRoute
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Training Phases</h2>
        <p className="text-sm text-gray-600">Complete each phase to unlock the next level of training</p>

      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase) => {
          const status = getPhaseStatus(phase.id)
          const isCurrent = isCurrentPhase(phase.id)
          const isClickable = status === 'available' || status === 'started'
          
          const content = (
            <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${getColorClasses(phase, status)} ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{phase.name}</h3>
                {getStatusIcon(status)}
              </div>
              <h4 className="font-bold text-base mb-1">{phase.title}</h4>
              <p className="text-xs opacity-75 mb-1">{phase.weeks}</p>
              <p className="text-xs opacity-75">{phase.description}</p>
              {status === 'started' && userProgress[phase.id] && (
                <div className="mt-2 text-xs opacity-75">
                  Started {new Date(userProgress[phase.id].startedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )

          if (isClickable) {
            return (
              <Link key={phase.id} to={getPhaseRoute(phase.id)}>
                {content}
              </Link>
            )
          }

          return (
            <div key={phase.id} className="cursor-not-allowed">
              {content}
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Progress Tip:</span>
          <span>Complete each phase in order to build a strong foundation for the next level.</span>
        </div>
      </div>
    </div>
  )
}

export default PhaseNavigation
