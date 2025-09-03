/*
FILE: /src/hooks/useConsent.js
DESCRIPTION:
Custom hook for managing data consent in the S&C program.
Provides functions to check, grant, and withdraw consent for different data types.

Adapted for existing React app structure (not Next.js)
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Consent type mappings
export const CONSENT_TYPES = {
  PROGRAM_PARTICIPATION: 'program_participation',
  BASELINE_DATA: 'baseline_data',
  HEALTH_METRICS: 'health_metrics',
  PROGRESS_TRACKING: 'progress_tracking',
  TRAINING_DATA: 'training_data',
  DATA_SHARING: 'data_sharing'
}

export function useConsent() {
  const { user } = useAuth()
  const [consentState, setConsentState] = useState({})
  const [loading, setLoading] = useState(true)

  // Load user's consent preferences
  useEffect(() => {
    if (user) {
      loadConsentState()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadConsentState = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('sc_data_consent')
        .select('consent_type, granted, granted_at, withdrawn_at')
        .eq('user_id', user.id)

      if (error) {
        // If table doesn't exist or other error, just set empty state
        console.warn('Could not load consent state:', error.message)
        setConsentState({})
        return
      }

      // Convert array to object for easier access
      const consentMap = {}
      data?.forEach(record => {
        consentMap[record.consent_type] = {
          granted: record.granted,
          grantedAt: record.granted_at,
          withdrawnAt: record.withdrawn_at
        }
      })

      setConsentState(consentMap)
    } catch (error) {
      console.error('Error loading consent state:', error)
      // Set empty state on error
      setConsentState({})
    } finally {
      setLoading(false)
    }
  }

  // Check if user has granted consent for a specific type
  const hasConsent = (consentType) => {
    return consentState[consentType]?.granted === true
  }

  // Check if user has granted consent for multiple types
  const hasAnyConsent = (consentTypes) => {
    return consentTypes.some(type => hasConsent(type))
  }

  // Check if user has granted consent for all specified types
  const hasAllConsent = (consentTypes) => {
    return consentTypes.every(type => hasConsent(type))
  }

  // Grant consent for a specific type
  const grantConsent = async (consentType, options = {}) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const now = new Date().toISOString()
      const consentData = {
        user_id: user.id,
        consent_type: consentType,
        granted: true,
        granted_at: now,
        consent_version: options.version || '1.0',
        user_agent: navigator.userAgent,
        retention_period: options.retentionPeriod || '2 years',
        auto_delete_at: options.autoDeleteAt || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
      }

      const { error } = await supabase
        .from('sc_data_consent')
        .upsert(consentData, { onConflict: 'user_id,consent_type' })

      if (error) throw error

      // Update local state
      setConsentState(prev => ({
        ...prev,
        [consentType]: {
          granted: true,
          grantedAt: now,
          withdrawnAt: null
        }
      }))

      return true
    } catch (error) {
      console.error('Error granting consent:', error)
      throw error
    }
  }

  // Withdraw consent for a specific type
  const withdrawConsent = async (consentType) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const now = new Date().toISOString()
      
      const { error } = await supabase
        .from('sc_data_consent')
        .update({
          granted: false,
          withdrawn_at: now,
          updated_at: now
        })
        .eq('user_id', user.id)
        .eq('consent_type', consentType)

      if (error) throw error

      // Update local state
      setConsentState(prev => ({
        ...prev,
        [consentType]: {
          ...prev[consentType],
          granted: false,
          withdrawnAt: now
        }
      }))

      return true
    } catch (error) {
      console.error('Error withdrawing consent:', error)
      throw error
    }
  }

  // Grant consent for multiple types at once
  const grantMultipleConsent = async (consentTypes, options = {}) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const now = new Date().toISOString()
      const consentRecords = consentTypes.map(consentType => ({
        user_id: user.id,
        consent_type: consentType,
        granted: true,
        granted_at: now,
        consent_version: options.version || '1.0',
        user_agent: navigator.userAgent,
        retention_period: options.retentionPeriod || '2 years',
        auto_delete_at: options.autoDeleteAt || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
      }))

      const { error } = await supabase
        .from('sc_data_consent')
        .upsert(consentRecords, { onConflict: 'user_id,consent_type' })

      if (error) throw error

      // Update local state
      const newConsentState = { ...consentState }
      consentTypes.forEach(consentType => {
        newConsentState[consentType] = {
          granted: true,
          grantedAt: now,
          withdrawnAt: null
        }
      })
      setConsentState(newConsentState)

      return true
    } catch (error) {
      console.error('Error granting multiple consent:', error)
      throw error
    }
  }

  // Get consent status for all types
  const getAllConsentStatus = () => {
    return Object.values(CONSENT_TYPES).map(consentType => ({
      type: consentType,
      granted: hasConsent(consentType),
      grantedAt: consentState[consentType]?.grantedAt,
      withdrawnAt: consentState[consentType]?.withdrawnAt
    }))
  }

  // Check if user needs to provide consent for S&C program
  const needsConsent = () => {
    return !hasConsent(CONSENT_TYPES.PROGRAM_PARTICIPATION)
  }

  // Check if user can access baseline data collection
  const canAccessBaselineData = () => {
    return hasConsent(CONSENT_TYPES.BASELINE_DATA) || hasConsent(CONSENT_TYPES.HEALTH_METRICS)
  }

  // Check if user can access progress tracking
  const canAccessProgressTracking = () => {
    return hasConsent(CONSENT_TYPES.PROGRESS_TRACKING)
  }

  return {
    consentState,
    loading,
    hasConsent,
    hasAnyConsent,
    hasAllConsent,
    grantConsent,
    withdrawConsent,
    grantMultipleConsent,
    getAllConsentStatus,
    needsConsent,
    canAccessBaselineData,
    canAccessProgressTracking,
    refreshConsent: loadConsentState
  }
}
