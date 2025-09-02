import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../src/contexts/AuthContext'
import PhaseVCalendar from './sc-program/PhaseVCalendar'
import PhaseNavigation from './sc-program/PhaseNavigation'
import UserHeader from './UserHeader'

const StrengthConditioningPhase5 = () => {
  const { user } = useAuth()
  const [isWelcomeExpanded, setIsWelcomeExpanded] = useState(true)
  const [isHowToUseExpanded, setIsHowToUseExpanded] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      
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
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  Phase V – Recovery
                  <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">Beta</span>
                </h1>
                <p className="mt-2 text-gray-600">
                  Off-season reset: decompress, keep joints happy, and rebuild desire to train
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Phase V Program</p>
                  <p className="text-lg font-semibold text-gray-900">2-4 Weeks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 p-4 mb-6 flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">🌱 Phase V: Recovery and renewal — decompress, heal, and fall in love with training again.</span>
              </div>

              {/* Program Introduction */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <button
                  onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-purple-100/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Welcome to Phase V – Recovery
                  </h2>
                  <svg 
                    className={`w-5 h-5 text-purple-600 transition-transform ${isWelcomeExpanded ? 'rotate-180' : ''}`}
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
                        Phase V is your off-season reset - the time to decompress, heal, and rebuild your love for training. The focus is on feeling better, not getting better:
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Decompress mentally</strong> – step away from structured training and competition pressure.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Keep joints happy</strong> – mobility and tissue care to address accumulated stress.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Rebuild motivation</strong> – fun activities and easy movement to remember why you love training.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-gray-700"><strong>Maintain habits</strong> – keep some structure without the intensity or pressure.</span>
                        </li>
                      </ul>
                      <div className="bg-white rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">The recovery mindset:</h3>
                        <p className="text-gray-700">
                          This phase is about healing - physically, mentally, and emotionally. You've pushed hard through the previous phases, 
                          and now it's time to let your body and mind recover. The goal is to finish this phase feeling refreshed, 
                          motivated, and ready to start the next training cycle with enthusiasm.
                        </p>
                      </div>
                      <div className="border-t border-purple-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Recovery Activities
                        </h3>
                        
                        <p className="text-gray-700 mb-4">
                          Phase V activities are designed to be restorative rather than challenging:
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Gentle Movement:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Mobility:</span>
                                <span>10-20′ daily tissue care and joint mobility</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Zone-2:</span>
                                <span>Optional easy aerobic work (20-45′)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-medium">Light circuits:</span>
                                <span>Simple strength-endurance, no grinders</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div className="bg-purple-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Fun & Recovery:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Hiking or nature walks</li>
                              <li>• Swimming or water activities</li>
                              <li>• Casual cycling</li>
                              <li>• Playful sports or games</li>
                              <li>• Yoga or gentle stretching</li>
                              <li>• Social activities</li>
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
                    How to Use Phase V
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
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">1</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Set your recovery period</strong> – choose 2-4 weeks based on your season length and fatigue level.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">2</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Prioritize mobility</strong> – 10-20′ daily tissue care to address accumulated stress.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">3</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Keep it easy</strong> – if anything increases soreness or fatigue, scale it back or skip it.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">4</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Have fun</strong> – choose activities you genuinely enjoy, not what you think you should do.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">5</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Maintain routines</strong> – keep sleep, nutrition, and hydration habits consistent.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">6</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Listen to your body</strong> – this is the time to honor what you need, not what you want to do.
                          </p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">7</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Rebuild motivation</strong> – use this time to remember why you love training and competition.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase V Calendar Component */}
              <PhaseVCalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrengthConditioningPhase5
