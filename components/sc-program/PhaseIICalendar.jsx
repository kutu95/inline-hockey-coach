/*
FILE: /components/sc-program/PhaseIICalendar.jsx
DESCRIPTION:
Phase II – Transition (Weeks 9–14)
- Sessions/week: Strength A, Intervals, Strength B, Zone-2 (+ Game/Rest)
- Intervals: 6–10 × (2–3' @ 75–85% max HR) with equal rest; total ≈ 40' including WU/CD
- Strength shifts toward single-leg / rotational patterns (hockey-specific)
- Matches Phase I component style (Supabase plan/sessions/completions)

Adapted for existing React app structure (not Next.js)
*/

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { renderWithTechniqueLinks } from './ExerciseTechniqueModals'

// ---------------------- Types ----------------------

// Session types
const SESSION_TYPES = {
  STRENGTH: 'STRENGTH',
  AEROBIC: 'AEROBIC', 
  GAME: 'GAME',
  REST: 'REST'
}

// ---------------------- Helpers ----------------------

function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// ---------- Phase II weekly template & builder ----------
function makePhaseIIWeekTemplate() {
  // Mon..Sun (Mon start): Rest, Strength A, Intervals, Strength B, Zone-2, Rest, Game
  return [
    { date: '', type: SESSION_TYPES.REST, title: 'Rest / Mobility', details: 'Light mobility: hips/adductors/ankles + T-spine rotation (10–15′).' },
    { date: '', type: SESSION_TYPES.STRENGTH, title: 'Strength A (Single-Leg)', details: [
      'Rear-Foot Elevated Split Squat 3×5–6/leg',
      'Chin-Ups 3 sets (work toward 3×15; add load if easy)',
      'DB/KB deadlift technique 3×6–8',
      'Pallof (anti-rotation) 3×10–12/side',
      'Progress only when form is clean.',
    ].join(' · ') },
    { date: '', type: SESSION_TYPES.AEROBIC, title: 'Intervals (75–85% max HR)', details: [
      'WU 10–12′ easy',
      '6–10× (2–3′ @ 75–85% max HR, equal easy rest)',
      'CD 5–10′ easy',
      'Total ≈ 40′ including WU/CD. Choose bike/row/run-walk/swim.',
    ].join(' · ') },
    { date: '', type: SESSION_TYPES.STRENGTH, title: 'Strength B (Rotational + PC)', details: [
      'Walking Lunge (long stride) 3×6–8/leg',
      'Bench Press or Push-Ups 3×5–8',
      'Single-leg deadlift technique 3×6–8/leg',
      'Cable/Band Rotational Chop 3×8–10/side',
    ].join(' · ') },
    { date: '', type: SESSION_TYPES.AEROBIC, title: 'Zone-2 Aerobic (Maintenance)', details: '45–60′ @ ~60–70% max HR. Conversational pace.' },
    { date: '', type: SESSION_TYPES.REST, title: 'Rest / Light Movement', details: 'Optional easy walk/cycle; keep joints happy.' },
    { date: '', type: SESSION_TYPES.GAME, title: 'Game Day', details: 'Games count as high-intensity conditioning. Prioritize sleep/hydration.' },
  ]
}

function fitToWeek(start, gamesPerWeek) {
  const base = makePhaseIIWeekTemplate()
  const weekStart = startOfWeek(start, { weekStartsOn: 1 }) // Monday
  const dated = base.map((s, idx) => ({ ...s, date: addDays(weekStart, idx).toISOString() }))
  // If ≥2 games: convert Saturday REST -> GAME
  if (gamesPerWeek >= 2) {
    dated[5] = { ...dated[5], type: SESSION_TYPES.GAME, title: 'Game Day', details: 'Second weekly game' }
  }
  // If ≥3 games: convert Tuesday Intervals -> GAME, and advise doubling a day for missed Intervals
  if (gamesPerWeek >= 3) {
    dated[2] = { ...dated[2], type: SESSION_TYPES.GAME, title: 'Game Day', details: 'Third weekly game (consider doubling another day to include Intervals)' }
  }
  return dated
}

function buildEightWeeksPhaseII(anchorMondayISO, gamesPerWeek) {
  const anchor = new Date(anchorMondayISO)
  const weeks = []
  for (let w = 0; w < 8; w++) {
    const weekStart = addDays(anchor, w * 7)
    weeks.push(...fitToWeek(weekStart, gamesPerWeek))
  }
  return weeks
}

// ---------- Intro Card Component ----------
function IntroCard() {
  return (
    <div className="bg-white rounded-lg shadow border border-blue-200">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Phase II — Transition (Weeks 9–14)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <p><strong>Purpose:</strong> Turn your Phase I "engine" into race pace. We introduce moderate-length intervals and shift strength toward hockey-specific single-leg and rotational patterns.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Intervals:</strong> 6–10 × (2–3′ @ ~75–85% max HR) with equal rest; total work ≈ game duration (≈40′ including warm-up/cool-down).</li>
            <li><strong>Strength A/B:</strong> single-leg + rotational emphasis while maintaining posterior-chain strength.</li>
            <li><strong>Zone-2:</strong> keep one easy aerobic session/week (45–60′) to maintain the base.</li>
          </ul>
          <p><strong>Finding Max HR:</strong> Measured (chest-strap during a game: peak ≈ max) or Estimated <code className="bg-gray-100 px-1 rounded">208 − (0.7 × age)</code>. Intervals target upper Zone 3 / low Zone 4 (~75–85%).</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Component ----------------------

export default function PhaseIICalendar() {
  const { user } = useAuth()
  const [gamesPerWeek, setGamesPerWeek] = useState(1)
  const [anchorMonday, setAnchorMonday] = useState(() => {
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday.toISOString()
  })
  const [sessions, setSessions] = useState([])
  const [completions, setCompletions] = useState({})
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(false)

  const weeks = useMemo(() => buildEightWeeksPhaseII(anchorMonday, gamesPerWeek), [anchorMonday, gamesPerWeek])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  async function loadPlan() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: plan } = await supabase
        .from('sc_plans')
        .select('id, anchor_monday, games_per_week')
        .eq('user_id', user.id)
        .eq('phase', 'PHASE_II')
        .maybeSingle()
      if (plan) {
        setPlanId(plan.id)
        setAnchorMonday(plan.anchor_monday)
        setGamesPerWeek(plan.games_per_week)
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

  useEffect(() => {
    if (user) {
      loadPlan()
    }
  }, [user])

  async function savePlan() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: planRes, error: planErr } = await supabase
        .from('sc_plans')
        .upsert(
          { user_id: user.id, phase: 'PHASE_II', anchor_monday: anchorMonday, games_per_week: gamesPerWeek },
          { onConflict: 'user_id,phase' }
        )
        .select('id')
        .single()
      if (planErr) throw planErr
      const pid = planRes.id
      setPlanId(pid)

      await supabase.from('sc_plan_sessions').delete().eq('plan_id', pid)

      const toInsert = weeks.map(s => ({
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
      alert('Error saving Phase II plan')
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
      new Notification('Training Reminder', { body: title })
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
      'PRODID:-//MR Inline Hockey//S&C Phase II//EN'
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
    a.download = 'phase2-plan.ics'
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

  return (
    <div className="space-y-6 p-6">
      <IntroCard />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <h1 className="text-2xl font-bold">Phase II – 8-Week Plan</h1>
        </div>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Games per week</label>
              <input
                type="number"
                min={1}
                max={3}
                value={gamesPerWeek}
                onChange={(e) => setGamesPerWeek(Number(e.target.value))}
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
