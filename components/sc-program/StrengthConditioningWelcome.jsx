/*
FILE: /components/sc-program/StrengthConditioningWelcome.jsx
DESCRIPTION:
Welcome page for the Strength & Conditioning program that handles:
- Program enrollment for new users
- Automatic redirection to current phase for enrolled users
- Navigation to all phases
- Program overview and benefits

Adapted for existing React app structure (not Next.js)
*/

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { useConsent, CONSENT_TYPES } from '../../src/hooks/useConsent'
import DataConsentModal from './DataConsentModal'

// ---------------------- Helper Functions ----------------------

function getPhaseDisplayName(phase) {
  const phaseNames = {
    'PHASE_0': 'Phase 0: Preparation & Onboarding',
    'PHASE_I': 'Phase I: Foundation Building',
    'PHASE_II': 'Phase II: Strength Development',
    'PHASE_III': 'Phase III: Power & Speed',
    'PHASE_IV': 'Phase IV: Competition Prep',
    'PHASE_V': 'Phase V: Recovery & Reset'
  }
  return phaseNames[phase] || phase
}

function getPhaseDescription(phase) {
  const descriptions = {
    'PHASE_0': 'Complete your baseline assessments and program setup',
    'PHASE_I': 'Build fundamental movement patterns and aerobic base',
    'PHASE_II': 'Develop strength and movement quality',
    'PHASE_III': 'Focus on power, speed, and sport-specific training',
    'PHASE_IV': 'Peak performance and competition preparation',
    'PHASE_V': 'Active recovery and off-season maintenance'
  }
  return descriptions[phase] || ''
}

function getPhaseRoute(phase) {
  const routes = {
    'PHASE_0': '/strength-conditioning/phase-0',
    'PHASE_I': '/strength-conditioning',
    'PHASE_II': '/strength-conditioning/phase-2',
    'PHASE_III': '/strength-conditioning/phase-3',
    'PHASE_IV': '/strength-conditioning/phase-4',
    'PHASE_V': '/strength-conditioning/phase-5'
  }
  return routes[phase] || '/strength-conditioning'
}

// ---------------------- Enrollment Component ----------------------

function EnrollmentPrompt({ onEnroll, loading }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Transform Your Game?</h2>
      <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
        Join our comprehensive 9-month Strength & Conditioning program designed specifically for inline hockey players. 
        Build strength, power, and endurance while reducing injury risk and improving performance on the rink.
      </p>
      
      <div className="grid md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Personalized Training</h3>
          <p className="text-sm text-gray-600">Heart rate zones and progress tracking tailored to your fitness level</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Progressive Phases</h3>
          <p className="text-sm text-gray-600">6 structured phases from foundation to peak performance</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Data-Driven</h3>
          <p className="text-sm text-gray-600">Track your progress with baseline tests and performance metrics</p>
        </div>
      </div>
      
      <button
        onClick={onEnroll}
        disabled={loading}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-lg"
      >
        {loading ? 'Enrolling...' : 'Enroll in Program'}
      </button>
    </div>
  )
}

// ---------------------- Current Phase Display ----------------------

function CurrentPhaseCard({ enrollment, onContinue }) {
  const currentPhase = enrollment?.current_phase || 'PHASE_0'
  const phaseRoute = getPhaseRoute(currentPhase)
  
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Welcome back! You're currently in:
          </h2>
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            {getPhaseDisplayName(currentPhase)}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {getPhaseDescription(currentPhase)}
          </p>
          <div className="flex gap-3">
            <Link
              to={phaseRoute}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              Continue Training
            </Link>
            <button
              onClick={onContinue}
              className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 font-medium"
            >
              View All Phases
            </button>
          </div>
        </div>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Phase Navigation Grid ----------------------

function PhaseNavigationGrid({ enrollment }) {
  const phases = [
    { id: 'PHASE_0', name: 'Phase 0', route: '/strength-conditioning/phase-0', color: 'blue' },
    { id: 'PHASE_I', name: 'Phase I', route: '/strength-conditioning', color: 'green' },
    { id: 'PHASE_II', name: 'Phase II', route: '/strength-conditioning/phase-2', color: 'yellow' },
    { id: 'PHASE_III', name: 'Phase III', route: '/strength-conditioning/phase-3', color: 'orange' },
    { id: 'PHASE_IV', name: 'Phase IV', route: '/strength-conditioning/phase-4', color: 'red' },
    { id: 'PHASE_V', name: 'Phase V', route: '/strength-conditioning/phase-5', color: 'purple' }
  ]

  const currentPhase = enrollment?.current_phase || 'PHASE_0'
  const currentPhaseIndex = phases.findIndex(p => p.id === currentPhase)

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {phases.map((phase, index) => {
        const isCurrentPhase = phase.id === currentPhase
        const isCompleted = index < currentPhaseIndex
        const isLocked = index > currentPhaseIndex
        
        return (
          <Link
            key={phase.id}
            to={phase.route}
            className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
              isCurrentPhase 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : isCompleted
                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                : isLocked
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {isCurrentPhase && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            {isCompleted && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            {isLocked && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            <div className="text-center">
              <h3 className={`font-bold text-lg mb-2 ${
                isCurrentPhase ? 'text-blue-700' : 
                isCompleted ? 'text-green-700' : 
                isLocked ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {phase.name}
              </h3>
              <p className={`text-sm ${
                isCurrentPhase ? 'text-blue-600' : 
                isCompleted ? 'text-green-600' : 
                isLocked ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {getPhaseDescription(phase.id)}
              </p>
              
              {isCurrentPhase && (
                <div className="mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Current Phase
                </div>
              )}
              
              {isCompleted && (
                <div className="mt-3 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Completed
                </div>
              )}
              
              {isLocked && (
                <div className="mt-3 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                  Locked
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ---------------------- Main Component ----------------------

export default function StrengthConditioningWelcome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { needsConsent, hasConsent, grantMultipleConsent } = useConsent()
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [showAllPhases, setShowAllPhases] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadEnrollment()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadEnrollment = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('sc_program_enrollment')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (data && !error) {
        setEnrollment(data)
        // Auto-redirect to current phase if not showing all phases
        if (!showAllPhases) {
          const currentPhaseRoute = getPhaseRoute(data.current_phase)
          navigate(currentPhaseRoute, { replace: true })
          return
        }
      }
    } catch (error) {
      console.error('Error loading enrollment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!user) return
    
    // Check if user needs to provide consent first
    if (needsConsent()) {
      setShowConsentModal(true)
      return
    }
    
    await enrollUser()
  }

  const enrollUser = async () => {
    if (!user) return
    
    setEnrolling(true)
    try {
      const { error } = await supabase
        .from('sc_program_enrollment')
        .insert({
          user_id: user.id,
          current_phase: 'PHASE_0',
          phase_started_at: new Date().toISOString(),
          enrollment_notes: 'Enrolled via welcome page'
        })

      if (error) throw error

      // Reload enrollment data
      await loadEnrollment()
      
      // Redirect to Phase 0
      navigate('/strength-conditioning/phase-0')
    } catch (error) {
      console.error('Error enrolling:', error)
      alert('Error enrolling in program. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleShowAllPhases = () => {
    setShowAllPhases(true)
  }

  const handleConsentGranted = async (consentChoices) => {
    try {
      // Grant consent for selected options
      const consentTypes = []
      if (consentChoices.programParticipation) consentTypes.push(CONSENT_TYPES.PROGRAM_PARTICIPATION)
      if (consentChoices.baselineData) consentTypes.push(CONSENT_TYPES.BASELINE_DATA)
      if (consentChoices.healthMetrics) consentTypes.push(CONSENT_TYPES.HEALTH_METRICS)
      if (consentChoices.progressTracking) consentTypes.push(CONSENT_TYPES.PROGRESS_TRACKING)
      if (consentChoices.trainingData) consentTypes.push(CONSENT_TYPES.TRAINING_DATA)
      if (consentChoices.dataSharing) consentTypes.push(CONSENT_TYPES.DATA_SHARING)

      await grantMultipleConsent(consentTypes)
      setShowConsentModal(false)
      
      // Proceed with enrollment
      await enrollUser()
    } catch (error) {
      console.error('Error processing consent:', error)
      alert('Error saving consent preferences. Please try again.')
    }
  }

  const handleConsentDeclined = () => {
    setShowConsentModal(false)
    // User declined consent, don't proceed with enrollment
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading program status...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Consent Modal */}
      <DataConsentModal
        isOpen={showConsentModal}
        onConsent={handleConsentGranted}
        onDecline={handleConsentDeclined}
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Strength & Conditioning Program
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          A comprehensive 9-month training program designed specifically for inline hockey players. 
          Build strength, power, and endurance while reducing injury risk.
        </p>
      </div>

      {/* Main Content */}
      {!enrollment ? (
        <EnrollmentPrompt onEnroll={handleEnroll} loading={enrolling} />
      ) : showAllPhases ? (
        <div className="space-y-6">
          <CurrentPhaseCard enrollment={enrollment} onContinue={() => setShowAllPhases(false)} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Training Phases</h2>
            <PhaseNavigationGrid enrollment={enrollment} />
          </div>
        </div>
      ) : (
        <CurrentPhaseCard enrollment={enrollment} onContinue={handleShowAllPhases} />
      )}

      {/* Program Benefits */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Program Benefits</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Physical Development</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Improved strength and power output</li>
              <li>• Enhanced aerobic and anaerobic capacity</li>
              <li>• Better movement quality and mobility</li>
              <li>• Reduced injury risk through proper preparation</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Performance Benefits</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Faster acceleration and top speed</li>
              <li>• Improved endurance during games</li>
              <li>• Better recovery between shifts</li>
              <li>• Enhanced confidence on the rink</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
