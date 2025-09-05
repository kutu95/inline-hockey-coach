import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import Phase0Calendar from './sc-program/Phase0Calendar'
import PhaseNavigation from './sc-program/PhaseNavigation'
import UserHeader from './UserHeader'

const StrengthConditioningPhase0 = () => {
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
                  Phase 0 – Preparation
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">Beta</span>
                </h1>
                <p className="mt-2 text-gray-600">
                  Onboarding: Get ready to train with profile setup, baseline tests, and program orientation
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Phase 0 Program</p>
                  <p className="text-lg font-semibold text-gray-900">2 Weeks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 p-4 mb-6 flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-sm font-medium text-gray-800">🚀 Phase 0: Let's get you ready to train! Complete your setup and baseline tests to start strong.</span>
              </div>

              {/* Program Introduction */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <button
                  onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Welcome to Phase 0 – Preparation
                  </h2>
                  <svg 
                    className={`w-5 h-5 text-blue-600 transition-transform ${isWelcomeExpanded ? 'rotate-180' : ''}`}
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
                        Phase 0 is your preparation phase - the foundation that sets you up for success in the full training program. 
                        Over these two weeks, you'll establish your baseline, learn the fundamentals, and get everything ready for Phase I:
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Profile & Setup</strong> – Complete your profile, set up equipment, and configure the app.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Baseline Testing</strong> – Establish your starting point with aerobic and movement tests.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Heart Rate Zones</strong> – Learn your training zones for optimal aerobic development.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Technique Orientation</strong> – Learn proper form for key exercises before adding load.</span>
                        </li>
                      </ul>
                      <div className="bg-white rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Why Phase 0 matters:</h3>
                        <p className="text-gray-700">
                          This preparation phase ensures you start Phase I with confidence, proper technique, and a clear understanding 
                          of your capabilities. It's like laying the foundation before building the house - the stronger the foundation, 
                          the better everything that follows will be.
                        </p>
                      </div>
                      <div className="border-t border-blue-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          What You'll Accomplish
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Week 1 - Setup & Testing:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Profile:</span>
                                <span>Complete your training profile and medical history</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Equipment:</span>
                                <span>Check gear, set up HR monitor, sync calendar</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Aerobic Test:</span>
                                <span>2.4km run or 1.6km walk baseline</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Movement Screen:</span>
                                <span>Assess mobility and movement patterns</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Week 2 - Learning & Preparation:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Strength technique orientation</li>
                              <li>• Zone-2 familiarization</li>
                              <li>• Heart rate zone calculation</li>
                              <li>• Program overview (Phases I-V)</li>
                              <li>• Set Phase I start date</li>
                              <li>• Final preparation</li>
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
                    How to Use Phase 0
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
                            <strong>Start with setup</strong> – Complete your profile, equipment check, and app configuration first.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">2</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Take baseline tests seriously</strong> – These establish your starting point and help track progress.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">3</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Learn proper technique</strong> – Focus on form over intensity during orientation sessions.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">4</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Understand your zones</strong> – Heart rate zones are crucial for effective aerobic training.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">5</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Ask questions</strong> – Use the education modules to understand the program philosophy.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">6</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Flag any issues</strong> – If anything hurts or feels wrong, note it for Phase I adjustments.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">7</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Set your start date</strong> – Choose your Phase I anchor Monday and prepare for the journey ahead.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase 0 Calendar Component */}
              <Phase0Calendar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthConditioningPhase0
