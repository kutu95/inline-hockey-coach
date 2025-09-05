/*
FILE: /components/sc-program/Phase0Calendar.jsx
DESCRIPTION:
Phase 0 – Preparation / Onboarding (2 weeks)
Focus: profile & consent, equipment check, HR max & zones, baseline tests (2.4 km run OR 1.6 km walk),
movement screen, technique orientation, Zone-2 familiarisation, and app orientation.
Output: player is ready to start Phase I with an Anchor Monday, known HR zones, and verified exercises.

Adapted for existing React app structure (not Next.js)
*/

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { HRMaxZonesNote, BaselinesNote, QuickGuideCard } from './Phase0Notes'
import BaselineDataCapture from './BaselineDataCapture'
import { renderWithTechniqueLinks } from './ExerciseTechniqueModals'

// ---------------------- Types ----------------------

// Session types
const SESSION_TYPES = {
  ONBOARD: 'ONBOARD',     // profile, consent, medical history
  SETUP: 'SETUP',         // equipment, app, HR monitor, calendar sync
  TEST: 'TEST',           // aerobic test, strength baseline, movement screen
  AEROBIC: 'AEROBIC',     // Zone-2 familiarisation
  STRENGTH: 'STRENGTH',   // technique orientation
  MOBILITY: 'MOBILITY',   // mobility & posture
  EDU: 'EDU',             // learning modules
  REST: 'REST'
}

// ---------------------- Helpers ----------------------

function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// ---------------------- Intro Card Component ----------------------
function IntroCard() {
  return (
    <div className="bg-white rounded-lg shadow border border-blue-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Phase 0 — Preparation / Onboarding (2 Weeks)
          </h2>
          <div className="flex items-center gap-2">
            <HRMaxZonesNote />
            <BaselinesNote />
          </div>
        </div>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>Goal:</strong> get you ready to train. Over the next two weeks you'll set up your profile, check gear,
            learn the plan, establish your heart-rate zones, and complete simple baseline tests so Phase I starts smoothly.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>HR Max & Zones:</strong> measured (peak in a game with chest strap) or estimated using <code className="bg-gray-100 px-1 rounded">208 − (0.7 × age)</code>. Zone-2 ≈ 60–70% max HR.</li>
            <li><strong>Baselines:</strong> choose either 2.4 km run or 1.6 km brisk walk; basic movement screen; optional submax strength technique.</li>
            <li><strong>Setup:</strong> app login, calendar sync (.ics), notification permissions, equipment check (shoes, barbell access, bands), and safety notes.</li>
          </ul>
          <p className="opacity-80">If anything hurts (sharp pain), stop and flag it in the app so we can adjust Phase I.</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Templates ----------------------
function makeWeekTemplate(weekIndex) {
  // Monday start; keep load light and educational
  if (weekIndex === 0) {
    return [
      { type: SESSION_TYPES.ONBOARD, title: 'Onboarding: Profile, Consent, History', details: 'Fill profile (age, height, weight), training history, injuries, meds; agree to terms.' },
      { type: SESSION_TYPES.SETUP, title: 'Setup: App, HR Monitor, Calendar', details: 'Enable notifications, pair chest-strap if available, export .ics to device calendar.' },
      { type: SESSION_TYPES.TEST, title: 'Aerobic Baseline: 2.4 km Run OR 1.6 km Walk', details: 'Warm-up 8–10′. Time the test. Record time + avg HR (if available).' },
      { type: SESSION_TYPES.TEST, title: 'Movement Screen', details: 'Overhead squat view; ankle wall test (knee-to-wall); single-leg balance 30–45s/side. Note any limits.' },
      { type: SESSION_TYPES.EDU, title: 'Learn: Zone-2 & Why Strength Matters', details: 'Read/watch short modules on Zone-2 benefits and strength carryover to skating.' },
      { type: SESSION_TYPES.REST, title: 'Rest / Family / Hobbies', details: 'No formal training. Hydrate, sleep.' },
    ]
  }
  // Week 2
  return [
    { type: SESSION_TYPES.STRENGTH, title: 'Technique Orientation (Gym or Bodyweight)', details: 'Learn form: squat, deadlift technique, push-up, chin-up regressions; stop fresh. No maxing.' },
    { type: SESSION_TYPES.AEROBIC, title: 'Zone 2 Familiarisation (20–30′)', details: 'Find pace that keeps HR in 60–70% max; conversational effort.' },
    { type: SESSION_TYPES.TEST, title: 'HR Max Review & Zone Calculator', details: 'Enter measured peak (game or hard effort) or estimate (208−0.7×age). App computes zones.' },
    { type: SESSION_TYPES.EDU, title: 'How the Program Works (Phases I–V)', details: 'Read quick guide; plan your training times; add game days to calendar.' },
    { type: SESSION_TYPES.SETUP, title: 'Set Anchor Monday for Phase I', details: 'Choose the Monday you will start Phase I; confirm reminders work.' },
    { type: SESSION_TYPES.REST, title: 'Rest & Prepare', details: 'Lay out gear, sleep well. Phase I starts next week.' },
  ]
}

function fitToWeek(start, weekIndex) {
  const base = makeWeekTemplate(weekIndex)
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  return base.map((s, idx) => ({ ...s, date: addDays(weekStart, idx).toISOString() }))
}

function buildTwoWeeksPhase0(anchorMondayISO) {
  const anchor = new Date(anchorMondayISO)
  const weeks = []
  for (let w = 0; w < 2; w++) {
    const weekStart = addDays(anchor, w * 7)
    weeks.push(...fitToWeek(weekStart, w))
  }
  return weeks
}

// ---------------------- Component ----------------------

export default function Phase0Calendar() {
  const { user } = useAuth()
  const [anchorMonday, setAnchorMonday] = useState(() => {
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday.toISOString()
  })
  const [sessions, setSessions] = useState([])
  const [completions, setCompletions] = useState({})
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showBaselineCapture, setShowBaselineCapture] = useState(false)

  const weeks = useMemo(() => buildTwoWeeksPhase0(anchorMonday), [anchorMonday])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadPlan()
    }
  }, [user])

  async function loadPlan() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: plan } = await supabase
        .from('sc_plans')
        .select('id, anchor_monday')
        .eq('user_id', user.id)
        .eq('phase', 'PHASE_0')
        .maybeSingle()
      if (plan) {
        setPlanId(plan.id)
        setAnchorMonday(plan.anchor_monday)
        const { data: sess } = await supabase
          .from('sc_plan_sessions')
          .select('id, date, type, title, details')
          .eq('plan_id', plan.id)
          .order('date')
        if (sess) setSessions(sess)
        const { data: comp } = await supabase
          .from('sc_completions')
          .select('plan_session_id')
          .eq('user_id', user.id)
          .in('plan_session_id', (sess || []).map(s => s.id))
        if (comp) {
          const map = {}
          comp.forEach(c => (map[c.plan_session_id] = true))
          setCompletions(map)
        }
      } else {
        setSessions(weeks)
      }
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: planRes, error: planErr } = await supabase
        .from('sc_plans')
        .upsert(
          { user_id: user.id, phase: 'PHASE_0', anchor_monday: anchorMonday, games_per_week: 0 },
          { onConflict: 'user_id,phase' }
        )
        .select('id')
        .single()
      if (planErr) throw planErr
      const pid = planRes.id
      setPlanId(pid)

      await supabase.from('sc_plan_sessions').delete().eq('plan_id', pid)

      const toInsert = (buildTwoWeeksPhase0(anchorMonday)).map(s => ({
        plan_id: pid,
        date: s.date,
        type: s.type,
        title: s.title,
        details: s.details ?? null,
      }))
      const { error: sessErr } = await supabase.from('sc_plan_sessions').insert(toInsert)
      if (sessErr) throw sessErr

      await loadPlan()
    } catch (e) {
      console.error(e)
      alert('Error saving Phase 0 plan')
    } finally {
      setLoading(false)
    }
  }

  async function toggleComplete(s) {
    if (!planId || !s.id) return
    const done = !completions[s.id]
    setCompletions(prev => ({ ...prev, [s.id]: done }))
    if (done) {
      await supabase.from('sc_completions').insert({
        plan_session_id: s.id,
        user_id: user.id,
        completed_at: new Date().toISOString()
      })
    } else {
      await supabase.from('sc_completions').delete()
        .eq('plan_session_id', s.id)
        .eq('user_id', user.id)
    }
  }

  function scheduleNotification(dateISO, title) {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (isToday(dateISO)) {
      new Notification('Onboarding Reminder', { body: title })
    }
  }

  const progress = useMemo(() => {
    const total = (sessions.length ? sessions : weeks).filter(s => s.type !== SESSION_TYPES.REST).length
    const done = Object.values(completions).filter(Boolean).length
    return total ? Math.round((done / total) * 100) : 0
  }, [sessions, weeks, completions])

  function exportICS() {
    const items = (sessions.length ? sessions : weeks)
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MR Inline Hockey//S&C Phase 0//EN'
    ]
    items.forEach((s) => {
      const dt = new Date(s.date)
      const dtstamp = format(dt, 'yyyyMMdd')
      const uid = `${dt.getTime()}-${s.title.replace(/\W+/g, '')}`
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}@mr-inline-hockey`,
        `DTSTART;VALUE=DATE:${dtstamp}`,
        `SUMMARY:${s.title}`,
        `DESCRIPTION:${(s.details || '').replace(/[\n\r]+/g, ' ')}`,
        'END:VEVENT'
      )
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'phase0-plan.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderGrid = (list) => (
    <div className="grid md:grid-cols-2 gap-4">
      {list.map((s, idx) => (
        <div key={idx} className={`border rounded-lg p-4 ${isToday(s.date) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-base">
              {format(new Date(s.date), 'EEE, dd MMM')} – {s.title}
            </h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{s.details ? renderWithTechniqueLinks(s.details) : '—'}</p>
            {'id' in s && s.id ? (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(s.id && completions[s.id])}
                  onChange={() => toggleComplete(s)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm">Mark done</label>
                <button
                  onClick={() => scheduleNotification(s.date, s.title)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Ping me today"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5L19.5 4.5M15 17h5l-5 5v-5z" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to access the strength and conditioning program.</p>
        </div>
      </div>
    )
  }

  if (showBaselineCapture) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Baseline Data Setup</h2>
          <button
            onClick={() => setShowBaselineCapture(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Back to Phase 0
          </button>
        </div>
        <BaselineDataCapture onCancel={() => setShowBaselineCapture(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <IntroCard />
      
      {/* Helpful Notes and Guides */}
      <QuickGuideCard className="mt-2" />
      
      {/* Baseline Data Capture Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Baseline Data Setup</h3>
            <p className="text-gray-600 text-sm mt-1">
              Complete your profile and baseline tests to get personalized heart rate zones and track your progress.
            </p>
          </div>
          <button
            onClick={() => setShowBaselineCapture(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Setup Baseline Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h1 className="text-2xl font-bold">Phase 0 – 2-Week Onboarding Plan</h1>
        </div>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anchor Monday</label>
              <input
                type="date"
                value={format(new Date(anchorMonday), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00')
                  setAnchorMonday(d.toISOString())
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={savePlan}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving…' : 'Save / Rebuild Plan'}
              </button>
              <button
                onClick={exportICS}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export .ics
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Progress</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs mt-1 text-gray-600">{progress}% complete</p>
          </div>
        </div>
      </div>

      {renderGrid(sessions.length ? sessions : weeks)}
    </div>
  )
}
