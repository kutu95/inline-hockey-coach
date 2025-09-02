/*
FILE: /components/sc-program/DataConsentModal.jsx
DESCRIPTION:
Modal component for collecting user consent for data collection in the S&C program.
Implements GDPR-compliant consent management with granular options.

Adapted for existing React app structure (not Next.js)
*/

import React, { useState } from 'react'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'

// ---------------------- Consent Section Component ----------------------

function ConsentSection({ title, description, items, required, checked, onToggle, disabled }) {
  return (
    <div className={`border rounded-lg p-4 ${required ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
            className={`w-4 h-4 rounded border-2 ${
              required 
                ? 'border-blue-500 bg-blue-500 text-white' 
                : 'border-gray-300 text-blue-600'
            } focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {required && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Required
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Main Consent Modal Component ----------------------

export default function DataConsentModal({ isOpen, onConsent, onDecline }) {
  const { user } = useAuth()
  const [consentState, setConsentState] = useState({
    programParticipation: true, // Required
    baselineData: false,
    healthMetrics: false,
    progressTracking: false,
    trainingData: false,
    dataSharing: false
  })
  const [saving, setSaving] = useState(false)

  const handleConsentChange = (type, granted) => {
    setConsentState(prev => ({
      ...prev,
      [type]: granted
    }))
  }

  const handleSubmit = async () => {
    if (!user) return

    setSaving(true)
    try {
      const consentRecords = []
      const now = new Date().toISOString()
      const userAgent = navigator.userAgent
      const consentVersion = '1.0'

      // Map consent types to database values
      const consentMapping = {
        programParticipation: 'program_participation',
        baselineData: 'baseline_data',
        healthMetrics: 'health_metrics',
        progressTracking: 'progress_tracking',
        trainingData: 'training_data',
        dataSharing: 'data_sharing'
      }

      // Create consent records for each granted consent
      for (const [key, granted] of Object.entries(consentState)) {
        if (granted) {
          consentRecords.push({
            user_id: user.id,
            consent_type: consentMapping[key],
            granted: true,
            granted_at: now,
            consent_version: consentVersion,
            user_agent: userAgent,
            retention_period: '2 years',
            auto_delete_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // 2 years from now
          })
        }
      }

      // Insert all consent records
      if (consentRecords.length > 0) {
        const { error } = await supabase
          .from('sc_data_consent')
          .upsert(consentRecords, { onConflict: 'user_id,consent_type' })

        if (error) throw error
      }

      onConsent(consentState)
    } catch (error) {
      console.error('Error saving consent:', error)
      alert('Error saving consent preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canProceed = consentState.programParticipation // At minimum, program participation is required

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Data Consent & Privacy</h2>
              <p className="text-sm text-gray-600">Please review and select your data sharing preferences</p>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Your Privacy Matters</h3>
            <p className="text-sm text-gray-700">
              We respect your privacy and only collect data necessary for your training program. 
              You can change these preferences at any time in your account settings. 
              All data is stored securely and never shared with third parties without your explicit consent.
            </p>
          </div>

          {/* Consent Sections */}
          <div className="space-y-4 mb-6">
            {/* Program Participation - Required */}
            <ConsentSection
              title="Program Participation"
              description="Essential data needed to participate in the Strength & Conditioning program"
              items={[
                'Your name and email address',
                'Program enrollment status',
                'Training phase progress',
                'Basic account information'
              ]}
              required={true}
              checked={consentState.programParticipation}
              onToggle={(checked) => handleConsentChange('programParticipation', checked)}
              disabled={true} // Always required
            />

            {/* Baseline Data - Optional */}
            <ConsentSection
              title="Baseline Assessment Data"
              description="Initial fitness assessments to personalize your training program"
              items={[
                'Fitness test results (2.4km run, movement screens)',
                'Starting fitness level assessment',
                'Baseline performance metrics'
              ]}
              required={false}
              checked={consentState.baselineData}
              onToggle={(checked) => handleConsentChange('baselineData', checked)}
            />

            {/* Health Metrics - Optional */}
            <ConsentSection
              title="Health & Body Metrics"
              description="Personal health information for safe and effective training"
              items={[
                'Birthdate and age',
                'Height and weight',
                'Heart rate zones',
                'Medical history and injury information'
              ]}
              required={false}
              checked={consentState.healthMetrics}
              onToggle={(checked) => handleConsentChange('healthMetrics', checked)}
            />

            {/* Progress Tracking - Optional */}
            <ConsentSection
              title="Progress Tracking"
              description="Monitor your improvements and training consistency over time"
              items={[
                'Workout completion records',
                'Performance improvements',
                'Training consistency metrics',
                'Progress reports and analytics'
              ]}
              required={false}
              checked={consentState.progressTracking}
              onToggle={(checked) => handleConsentChange('progressTracking', checked)}
            />

            {/* Training Data - Optional */}
            <ConsentSection
              title="Training Session Data"
              description="Detailed information about your training sessions"
              items={[
                'Workout details and exercises',
                'Training intensity and duration',
                'Session notes and feedback',
                'Training schedule and preferences'
              ]}
              required={false}
              checked={consentState.trainingData}
              onToggle={(checked) => handleConsentChange('trainingData', checked)}
            />

            {/* Data Sharing - Optional */}
            <ConsentSection
              title="Data Sharing with Coaches"
              description="Allow your coaches to view your training progress and health metrics"
              items={[
                'Share progress reports with your coach',
                'Allow coach access to health metrics',
                'Enable training plan adjustments based on your data',
                'Participate in team performance analytics'
              ]}
              required={false}
              checked={consentState.dataSharing}
              onToggle={(checked) => handleConsentChange('dataSharing', checked)}
            />
          </div>

          {/* Data Retention Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Data Retention</h3>
            <p className="text-sm text-blue-800">
              Your data will be retained for up to 2 years after you withdraw consent or leave the program. 
              You can request data deletion at any time through your account settings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onDecline}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canProceed || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Accept Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
