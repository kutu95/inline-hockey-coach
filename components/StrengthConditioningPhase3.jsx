import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import PhaseIIICalendar from './sc-program/PhaseIIICalendar'
import PhaseNavigation from './sc-program/PhaseNavigation'
import UserHeader from './UserHeader'

const StrengthConditioningPhase3 = () => {
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
                  Phase III – Peak Power
                  <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">Beta</span>
                </h1>
                <p className="mt-2 text-gray-600">
                  Convert your base into game-like intensity with short maximal intervals and power training
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Phase III Program</p>
                  <p className="text-lg font-semibold text-gray-900">6 Weeks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
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
              <div className="rounded-xl bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 mb-6 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">🔥 Phase III: Peak power and game-like intensity — this is where champions are made.</span>
              </div>

              {/* Program Introduction */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
                <button
                  onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-red-100/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Welcome to Phase III – Peak Power
                  </h2>
                  <svg 
                    className={`w-5 h-5 text-red-600 transition-transform ${isWelcomeExpanded ? 'rotate-180' : ''}`}
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
                        Phase III converts your base and transition work into game-like intensity. The main goals are:
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Short maximal intervals</strong> – 8–15 × (1–1.5′ hard / 1–3′ easy) for game-like intensity.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Power training</strong> – hops, bounds, jumps, and sprints for explosive speed.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Maintenance focus</strong> – keep aerobic base and strength with minimal sessions.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Week 6 deload</strong> – reduced volume to shed fatigue before Phase IV.</span>
                        </li>
                      </ul>
                      <div className="bg-white rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Why this phase matters:</h3>
                        <p className="text-gray-700">
                          Hockey is about explosive bursts and quick recovery. Phase III trains your body to handle the exact demands 
                          of game shifts: short, maximal efforts followed by brief recovery periods. This is where you develop the 
                          power and speed that separates good players from great ones.
                        </p>
                      </div>
                      <div className="border-t border-red-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Power Training Guidelines
                        </h3>
                        
                        <p className="text-gray-700 mb-4">
                          Power training focuses on <strong>speed and explosiveness</strong>, not endurance. Each rep should be 
                          performed with maximum intent and full recovery between sets.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Power Training Principles:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Quality over quantity:</span>
                                <span>Stop when speed/explosiveness drops</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Full recovery:</span>
                                <span>2-5 minutes between sets</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Perfect technique:</span>
                                <span>Landing mechanics are crucial</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Freshness required:</span>
                                <span>Don't train power when fatigued</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div className="bg-red-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Example Power Exercises:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Pogo jumps (ankle stiffness)</li>
                              <li>• Box jumps (explosive power)</li>
                              <li>• Broad jumps (horizontal power)</li>
                              <li>• Medicine ball throws (rotational power)</li>
                              <li>• 10-30m sprints (linear speed)</li>
                            </ul>
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
                    How to Use Phase III
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
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">1</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Complete Phases I & II first</strong> – ensure you have a solid base before peak power training.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">2</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Warm up thoroughly</strong> – power work demands freshness and good movement preparation.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">3</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Focus on output, not heart rate</strong> – intervals should feel hard but sustainable for 1-1.5 minutes.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">4</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Stop when quality drops</strong> – power training requires perfect technique and maximum intent.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">5</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Recover fully between sets</strong> – power work needs 2-5 minutes between efforts.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">6</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Prioritize sleep and nutrition</strong> – this phase is demanding and requires optimal recovery.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">7</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Embrace the deload week</strong> – Week 6 reduces volume to prepare for Phase IV.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase III Calendar Component */}
              <PhaseIIICalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthConditioningPhase3
