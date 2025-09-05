import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import PhaseICalendar from './sc-program/PhaseICalendar'
import PhaseNavigation from './sc-program/PhaseNavigation'
import UserHeader from './UserHeader'

const StrengthConditioningPhase1 = () => {
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
                to="/strength-conditioning" 
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back to Program</span>
              </Link>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img 
                  src="/backcheck-logo.png" 
                  alt="Backcheck" 
                  className="h-16 w-auto"
                />
                <h1 className="text-2xl font-bold">Phase I: Foundation Building</h1>
              </div>
              <p className="text-blue-200 text-sm">Strength and Conditioning Program</p>
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
                  Phase I: Foundation Building
                  <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">Beta</span>
                </h1>
                <p className="mt-2 text-gray-600">
                  Build strength, endurance, and hockey-specific fitness with our structured 8-week program
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Phase I Program</p>
                  <p className="text-lg font-semibold text-gray-900">8 Weeks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
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
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 mb-6 flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">🏒 Every rep and every shift builds your edge — consistency wins games.</span>
              </div>
              
              {/* Program Introduction */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <button
                  onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-orange-100/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Welcome to Phase I – Foundation
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
                        This 8-week block lays the foundation for inline hockey performance. The main goals are:
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Build your aerobic base</strong> – longer shifts, faster recovery.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Develop whole-body strength</strong> – stronger stride, reduced injury risk.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Improve movement quality</strong> – mobility, posture, and coordination.</span>
                        </li>
                      </ul>
                      <div className="bg-white rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Why it matters:</h3>
                        <p className="text-gray-700">
                          Hockey is high-intensity and interval-based. Games push your heart rate near max, so we don't need to train that every day. 
                          Instead, this program strengthens your base systems so you can perform better and recover faster during the season.
                        </p>
                      </div>
                      <div className="border-t border-orange-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Heart Rate Zones
                        </h3>
                        
                        <p className="text-gray-700 mb-4">
                          Aerobic training in this program uses <strong>Zone 2</strong> (about 60–70% of your maximum heart rate). 
                          Staying here builds endurance without burnout.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">How to find your Max HR:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Measured:</span>
                                <span>Wear a chest-strap HR monitor during a game. The highest number you hit is close to your max.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Estimated:</span>
                                <span>Use the formula: <strong>Max HR ≈ 208 – (0.7 × age)</strong></span>
                              </li>
                            </ul>
                          </div>
                          
                          <div className="bg-orange-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Example:</h4>
                            <p className="text-sm text-gray-700 mb-2">Age 30 → 208 – 21 = <strong>~187 bpm</strong></p>
                            <p className="text-sm text-gray-700">
                              <strong>Zone 2 target:</strong> 60–70% of your max HR<br/>
                              For 187 bpm, Zone 2 ≈ <strong>112–131 bpm</strong>
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
                    How to Use This Plan
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
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">1</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Set your Anchor Monday</strong> – choose the Monday that starts your 8-week block.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">2</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Enter how many games you play per week</strong> – the schedule will adjust around them.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">3</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Follow the calendar</strong> – aim for 2 Strength + 2 Aerobic sessions each week, plus your games.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">4</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Check off each session</strong> – mark it as done to track progress and keep your streak alive.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">5</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Stay in Zone 2 for aerobic sessions</strong> – use your max HR to calculate your target range.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">6</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Progress gradually</strong> – add small increases in weight or reps only when your form feels solid.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">7</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Prioritize recovery</strong> – sleep, hydration, mobility work, and proper nutrition matter as much as the workouts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase I Calendar Component */}
              <PhaseICalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthConditioningPhase1
