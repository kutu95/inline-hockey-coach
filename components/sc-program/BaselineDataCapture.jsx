/*
FILE: /components/sc-program/BaselineDataCapture.jsx
DESCRIPTION:
Component for capturing and storing baseline test data for S&C program participants.
Includes forms for user profile, baseline tests, and heart rate zone calculation.

Adapted for existing React app structure (not Next.js)
*/

import React, { useState, useEffect } from 'react'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { useConsent, CONSENT_TYPES } from '../../src/hooks/useConsent'

// ---------------------- Helper Functions ----------------------

function calculateAge(birthdate) {
  if (!birthdate) return null
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function estimateMaxHR(age) {
  return Math.round(208 - 0.7 * age)
}

function calculateHRZones(maxHR) {
  return {
    zone1: { min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60) },
    zone2: { min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70) },
    zone3: { min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80) },
    zone4: { min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90) },
    zone5: { min: Math.round(maxHR * 0.90), max: Math.round(maxHR * 1.00) }
  }
}

// ---------------------- User Profile Form ----------------------

function UserProfileForm({ onSave, onCancel }) {
  const { user } = useAuth()
  const { hasConsent, canAccessBaselineData } = useConsent()
  const [formData, setFormData] = useState({
    birthdate: '',
    height_cm: '',
    weight_kg: '',
    max_hr: '',
    resting_hr: '',
    training_experience: 'beginner',
    injury_history: '',
    medical_notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [birthdateFromPlayer, setBirthdateFromPlayer] = useState(false)

  useEffect(() => {
    loadExistingProfile()
  }, [user])

  const loadExistingProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // First, try to get the player record to fetch birthdate
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('birthdate')
        .eq('user_id', user.id)

      // Then get the existing S&C profile
      const { data: profileData, error: profileError } = await supabase
        .from('sc_user_profiles')
        .select('*')
        .eq('user_id', user.id)
      
      // Use player birthdate if available, otherwise use profile birthdate
      const playerBirthdate = playerData && playerData.length > 0 ? playerData[0].birthdate : null
      const profileBirthdate = profileData && profileData.length > 0 ? profileData[0].birthdate : null
      const birthdate = playerBirthdate || profileBirthdate || ''
      const isFromPlayer = !!playerBirthdate
      
      if (profileData && profileData.length > 0 && !profileError) {
        const profile = profileData[0]
        setFormData({
          birthdate: birthdate,
          height_cm: profile.height_cm || '',
          weight_kg: profile.weight_kg || '',
          max_hr: profile.max_hr || '',
          resting_hr: profile.resting_hr || '',
          training_experience: profile.training_experience || 'beginner',
          injury_history: profile.injury_history || '',
          medical_notes: profile.medical_notes || ''
        })
        setBirthdateFromPlayer(isFromPlayer)
      } else if (playerData && playerData.length > 0 && !playerError) {
        // If no S&C profile exists but player record exists, pre-fill with birthdate
        setFormData({
          birthdate: birthdate,
          height_cm: '',
          weight_kg: '',
          max_hr: '',
          resting_hr: '',
          training_experience: 'beginner',
          injury_history: '',
          medical_notes: ''
        })
        setBirthdateFromPlayer(isFromPlayer)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const age = calculateAge(formData.birthdate)
      const estimatedMaxHR = age ? estimateMaxHR(age) : null
      
      const profileData = {
        user_id: user.id,
        birthdate: formData.birthdate || null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        max_hr: formData.max_hr ? parseInt(formData.max_hr) : estimatedMaxHR,
        resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
        training_experience: formData.training_experience,
        injury_history: formData.injury_history || null,
        medical_notes: formData.medical_notes || null
      }

      const { error } = await supabase
        .from('sc_user_profiles')
        .upsert(profileData, { onConflict: 'user_id' })

      if (error) throw error

      // Calculate and save HR zones if we have max HR
      if (profileData.max_hr) {
        const zones = calculateHRZones(profileData.max_hr)
        const { error: zonesError } = await supabase
          .from('sc_hr_zones')
          .insert({
            user_id: user.id,
            max_hr: profileData.max_hr,
            resting_hr: profileData.resting_hr,
            zone_1_min: zones.zone1.min,
            zone_1_max: zones.zone1.max,
            zone_2_min: zones.zone2.min,
            zone_2_max: zones.zone2.max,
            zone_3_min: zones.zone3.min,
            zone_3_max: zones.zone3.max,
            zone_4_min: zones.zone4.min,
            zone_4_max: zones.zone4.max,
            zone_5_min: zones.zone5.min,
            zone_5_max: zones.zone5.max,
            calculation_method: formData.max_hr ? 'manual' : 'estimated'
          })

        if (zonesError) {
          console.error('Error saving HR zones:', zonesError)
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const age = calculateAge(formData.birthdate)
  const estimatedMaxHR = age ? estimateMaxHR(age) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birthdate *
            {birthdateFromPlayer && (
              <span className="text-xs text-green-600 ml-2">(from player profile)</span>
            )}
          </label>
          <input
            type="date"
            value={formData.birthdate}
            onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              birthdateFromPlayer 
                ? 'border-green-300 bg-green-50 focus:ring-green-500 cursor-not-allowed' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            readOnly={birthdateFromPlayer}
            required
          />
          {birthdateFromPlayer && (
            <p className="text-xs text-green-600 mt-1">
              Birthdate automatically loaded from your player profile. Edit it on your player profile page if needed.
            </p>
          )}
          {age && (
            <p className="text-xs text-gray-600 mt-1">Age: {age} years</p>
          )}
        </div>

        {hasConsent(CONSENT_TYPES.HEALTH_METRICS) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                min="100"
                max="250"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="175"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                min="30"
                max="200"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="70.0"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Heart Rate (bpm)
          </label>
          <input
            type="number"
            min="120"
            max="220"
            value={formData.max_hr}
            onChange={(e) => setFormData({ ...formData, max_hr: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={estimatedMaxHR ? estimatedMaxHR.toString() : ''}
          />
          {estimatedMaxHR && !formData.max_hr && (
            <p className="text-xs text-gray-600 mt-1">
              Estimated: {estimatedMaxHR} bpm (based on age)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resting Heart Rate (bpm)
          </label>
          <input
            type="number"
            min="40"
            max="100"
            value={formData.resting_hr}
            onChange={(e) => setFormData({ ...formData, resting_hr: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Training Experience
          </label>
          <select
            value={formData.training_experience}
            onChange={(e) => setFormData({ ...formData, training_experience: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {hasConsent(CONSENT_TYPES.HEALTH_METRICS) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injury History
            </label>
            <textarea
              value={formData.injury_history}
              onChange={(e) => setFormData({ ...formData, injury_history: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="List any past or current injuries, surgeries, or physical limitations..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical Notes
            </label>
            <textarea
              value={formData.medical_notes}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any medical conditions, medications, or other relevant health information..."
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------- Baseline Tests Form ----------------------

function BaselineTestsForm({ onSave, onCancel }) {
  const { user } = useAuth()
  const { hasConsent } = useConsent()
  const [tests, setTests] = useState([
    { type: 'aerobic_run_2_4km', name: '2.4km Run', value: '', unit: 'minutes', notes: '' },
    { type: 'aerobic_walk_1_6km', name: '1.6km Walk', value: '', unit: 'minutes', notes: '' },
    { type: 'movement_overhead_squat', name: 'Overhead Squat', value: '', unit: 'score', notes: '' },
    { type: 'movement_ankle_wall_test', name: 'Ankle Wall Test', value: '', unit: 'cm', notes: '' },
    { type: 'movement_single_leg_balance', name: 'Single Leg Balance', value: '', unit: 'seconds', notes: '' }
  ])
  const [saving, setSaving] = useState(false)

  const handleTestChange = (index, field, value) => {
    const updatedTests = [...tests]
    updatedTests[index] = { ...updatedTests[index], [field]: value }
    setTests(updatedTests)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const testDate = new Date().toISOString().split('T')[0]
      
      for (const test of tests) {
        if (test.value && test.value.trim() !== '') {
          const { error } = await supabase
            .from('sc_baseline_tests')
            .insert({
              user_id: user.id,
              test_type: test.type,
              test_date: testDate,
              result_value: parseFloat(test.value),
              result_unit: test.unit,
              result_notes: test.notes || null
            })

          if (error) {
            console.error(`Error saving ${test.name}:`, error)
          }
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving baseline tests:', error)
      alert('Error saving baseline tests. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Check if user has consented to baseline data collection
  if (!hasConsent(CONSENT_TYPES.BASELINE_DATA)) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Baseline Data Collection Not Enabled</h3>
        <p className="text-gray-600 mb-4">
          You haven't consented to baseline data collection. You can enable this in your consent preferences.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back to Profile
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Complete the baseline tests you've performed. Leave blank any tests you haven't done yet.
      </div>

      {tests.map((test, index) => (
        <div key={test.type} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">{test.name}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Result
              </label>
              <input
                type="number"
                step="0.1"
                value={test.value}
                onChange={(e) => handleTestChange(index, 'value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={test.unit}
                onChange={(e) => handleTestChange(index, 'unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={test.notes}
                onChange={(e) => handleTestChange(index, 'notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Baseline Tests'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------- Main Component ----------------------

export default function BaselineDataCapture() {
  const [currentStep, setCurrentStep] = useState('profile') // 'profile', 'tests', 'complete'
  const [userProfile, setUserProfile] = useState(null)

  const handleProfileSave = () => {
    setCurrentStep('tests')
  }

  const handleTestsSave = () => {
    setCurrentStep('complete')
  }

  const handleCancel = () => {
    setCurrentStep('profile')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Baseline Data Setup</h2>
        <p className="text-gray-600">
          Complete your profile and baseline tests to get the most out of your training program.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 'profile' ? 'bg-blue-600 text-white' : 
            ['tests', 'complete'].includes(currentStep) ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${
            ['tests', 'complete'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 'tests' ? 'bg-blue-600 text-white' : 
            currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${
            currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            3
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {currentStep === 'profile' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: User Profile</h3>
            <UserProfileForm onSave={handleProfileSave} onCancel={handleCancel} />
          </div>
        )}

        {currentStep === 'tests' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Baseline Tests</h3>
            <BaselineTestsForm onSave={handleTestsSave} onCancel={handleCancel} />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Complete!</h3>
            <p className="text-gray-600 mb-6">
              Your baseline data has been saved. You can now start your training program with personalized heart rate zones and progress tracking.
            </p>
            <button
              onClick={() => setCurrentStep('profile')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
