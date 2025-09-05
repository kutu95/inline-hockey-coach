import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import PhaseIICalendar from './sc-program/PhaseIICalendar'
import PhaseNavigation from './sc-program/PhaseNavigation'
import UserHeader from './UserHeader'

const StrengthConditioningPhase2 = () => {
  const { user } = useAuth()
  const [isWelcomeExpanded, setIsWelcomeExpanded] = useState(true)
  const [isHowToUseExpanded, setIsHowToUseExpanded] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Brand Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back to Main Menu</span>
              </Link>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img 
                  src="/backcheck-logo.png" 
                  alt="Backcheck" 
                  className="h-16 w-auto"
                />
                <h1 className="text-2xl font-bold">Strength and Conditioning Program</h1>
              </div>
              <p className="text-blue-200 text-sm">for Inline Hockey</p>
            </div>
            <div className="flex items-center"><UserHeader variant="onBlue" /></div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  Phase II – Transition
                  <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">Beta</span>
                </h1>
                <p className="mt-2 text-gray-600">
                  Turn your Phase I "engine" into race pace with intervals and hockey-specific strength
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Phase II Program</p>
                  <p className="text-lg font-semibold text-gray-900">8 Weeks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!user ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Please log in</h3>
              <p className="text-gray-600">You need to be logged in to access the strength and conditioning program.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Phase Navigation */}
              <PhaseNavigation />
              
              {/* Motivational Banner */}
              <div className="rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 mb-6 flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">⚡ Phase II: Turn your foundation into race pace — intervals build game speed.</span>
              </div>

              {/* Program Introduction */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <button
                  onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-orange-100/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Welcome to Phase II – Transition
                  </h2>
                  <svg 
                    className={`w-5 h-5 text-orange-600 transition-transform ${isWelcomeExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isWelcomeExpanded && (
                  <div className="px-6 pb-6">
                    <div className="max-w-4xl">
                      <p className="text-gray-700 mb-4">
                        Phase II builds on your Phase I foundation by introducing race-pace training. The main goals are:
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Introduce intervals</strong> – 6–10 × (2–3′ @ 75–85% max HR) to build race pace.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Hockey-specific strength</strong> – single-leg and rotational patterns for on-ice performance.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Maintain aerobic base</strong> – keep one Zone-2 session per week for endurance.</span>
                        </li>
                      </ul>
                      <div className="bg-white rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Why intervals matter:</h3>
                        <p className="text-gray-700">
                          Hockey is an interval sport. Games are 60 minutes of high-intensity bursts with short recovery. 
                          Phase II intervals train your body to handle the specific demands of game pace and recovery.
                        </p>
                      </div>
                      <div className="border-t border-orange-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Interval Training Zones
                        </h3>
                        
                        <p className="text-gray-700 mb-4">
                          Phase II intervals target <strong>75–85% of your maximum heart rate</strong> – this is upper Zone 3 to low Zone 4. 
                          This intensity matches the demands of game shifts.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Interval Structure:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Work:</span>
                                <span>2–3 minutes at 75–85% max HR</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Rest:</span>
                                <span>Equal time at easy pace (60–70% max HR)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Total:</span>
                                <span>6–10 intervals (≈40′ including warm-up/cool-down)</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div className="bg-orange-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Example (Age 30, Max HR 187):</h4>
                            <p className="text-sm text-gray-700 mb-2">Interval target: <strong>140–159 bpm</strong></p>
                            <p className="text-sm text-gray-700 mb-2">Recovery target: <strong>112–131 bpm</strong></p>
                            <p className="text-sm text-gray-700">
                              <strong>Feel:</strong> Hard but sustainable for 2–3 minutes
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* How to Use This Plan */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setIsHowToUseExpanded(!isHowToUseExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    How to Use Phase II
                  </h2>
                  <svg 
                    className={`w-5 h-5 text-blue-600 transition-transform ${isHowToUseExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isHowToUseExpanded && (
                  <div className="px-6 pb-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">1</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Complete Phase I first</strong> – ensure you have a solid aerobic base before starting intervals.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">2</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Set your anchor Monday</strong> – choose the Monday that starts your 8-week Phase II block.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">3</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Start conservatively</strong> – begin with 6 intervals and build to 10 over the 8 weeks.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">4</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Focus on form</strong> – single-leg and rotational exercises require perfect technique.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">5</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Monitor intensity</strong> – use heart rate to stay in the 75–85% range during intervals.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">6</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Recovery is key</strong> – intervals are demanding; prioritize sleep and nutrition.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">7</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Track progress</strong> – note how intervals feel easier and you can handle more volume.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase II Calendar Component */}
              <PhaseIICalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthConditioningPhase2
