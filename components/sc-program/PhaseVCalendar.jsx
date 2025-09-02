/*
FILE: /components/sc-program/PhaseVCalendar.jsx
DESCRIPTION:
Phase V – Recovery / Off-Season Reset (2–4 weeks)
Focus: Decompress, keep joints happy, and rebuild desire to train.
Weekly rhythm: Mobility & tissue care, optional Zone-2 easy, light strength-endurance,
"fun activity" day, and plenty of rest. No hard intervals, no heavy lifting.

Adapted for existing React app structure (not Next.js)
*/

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'

// ---------------------- Types ----------------------

// Session types
const SESSION_TYPES = {
  MOBILITY: 'MOBILITY',
  AEROBIC: 'AEROBIC',
  FUN: 'FUN',
  STRENGTH: 'STRENGTH',
  RECOVERY: 'RECOVERY',
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
    <div className="bg-white rounded-lg shadow border border-purple-200">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Phase V — Recovery / Off-Season Reset (2–4 Weeks)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Goal: <strong>decompress and feel better</strong>. Keep joints happy, maintain a little easy engine work,
            and rebuild motivation before the next training cycle. Err on the side of <em>doing less</em> and feeling fresher.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Mobility & tissue care:</strong> 10–20′ most days (hips, adductors, ankles, T-spine).</li>
            <li><strong>Optional Zone-2:</strong> 20–45′ easy pace (60–70% max HR), conversational.</li>
            <li><strong>Light strength-endurance:</strong> simple circuits, no grinders, stop fresh.</li>
            <li><strong>Fun activity:</strong> hike, swim, casual cycle—something you enjoy.</li>
            <li><strong>Sleep & nutrition:</strong> keep routines, hydrate, plenty of protein.</li>
          </ul>
          <p className="opacity-80">
            If anything increases soreness or fatigue for the next day, scale it back or skip it.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Templates ----------------------
function makePhaseVWeekTemplate() {
  // Mon..Sun (Mon start): Mobility, Optional Z2, Light Strength-Endurance, Mobility, Fun, Recovery Walk/Stretch, Rest
  return [
    { type: SESSION_TYPES.MOBILITY, title: 'Mobility & Tissue Care (10–20′)', details: 'Hips/adductors/ankles/T-spine + light band work. Easy flow.' },
    { type: SESSION_TYPES.AEROBIC, title: 'Optional Zone-2 Easy (20–45′)', details: 'Bike/row/walk/swim @ ~60–70% max HR. Conversational.' },
    { type: SESSION_TYPES.STRENGTH, title: 'Light Strength-Endurance Circuit', details: '2–3 rounds: Goblet Squat 8–12 · Push-Ups sub-max · Bridge (3s) 8–12 · Chin-Ups/Jumping sub-max. Stop fresh.' },
    { type: SESSION_TYPES.MOBILITY, title: 'Mobility & Posture (10–20′)', details: 'Add dead bugs, bird-dogs, side plank 2×20–30s/side.' },
    { type: SESSION_TYPES.FUN, title: 'Fun Activity (30–60′)', details: 'Hike, beach swim, casual cycle, throw-and-catch—keep it playful.' },
    { type: SESSION_TYPES.RECOVERY, title: 'Recovery Walk + Stretch (20–30′)', details: 'Easy 10–15′ walk → 8–10′ stretch. Hydrate; legs up 5–10′.' },
    { type: SESSION_TYPES.REST, title: 'Full Rest / Social / Hobbies', details: 'No structured training. Sleep well.' },
  ]
}

function fitToWeek(start) {
  const base = makePhaseVWeekTemplate()
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  return base.map((s, idx) => ({ ...s, date: addDays(weekStart, idx).toISOString() }))
}

function buildPhaseV(anchorMondayISO, weeks) {
  const anchor = new Date(anchorMondayISO)
  const all = []
  for (let w = 0; w < weeks; w++) {
    all.push(...fitToWeek(addDays(anchor, w * 7)))
  }
  return all
}

// ---------------------- Component ----------------------

export default function PhaseVCalendar() {
  const { user } = useAuth()
  const [weeksSpan, setWeeksSpan] = useState(2) // 2–4 typical
  const [anchorMonday, setAnchorMonday] = useState(() => {
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday.toISOString()
  })
  const [sessions, setSessions] = useState([])
  const [completions, setCompletions] = useState({})
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(false)

  const weeks = useMemo(() => buildPhaseV(anchorMonday, weeksSpan), [anchorMonday, weeksSpan])

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
        .select('id, anchor_monday, games_per_week') // reuse games_per_week as generic numeric if needed
        .eq('user_id', user.id)
        .eq('phase', 'PHASE_V')
        .maybeSingle()
      if (plan) {
        setPlanId(plan.id)
        setAnchorMonday(plan.anchor_monday)
        // If you previously repurposed games_per_week, you could use it here for weeksSpan; we keep weeksSpan from DB optional.
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
          {
            user_id: user.id,
            phase: 'PHASE_V',
            anchor_monday: anchorMonday,
            games_per_week: weeksSpan, // harmless reuse as a simple integer setting
          },
          { onConflict: 'user_id,phase' }
        )
        .select('id')
        .single()
      if (planErr) throw planErr
      const pid = planRes.id
      setPlanId(pid)

      await supabase.from('sc_plan_sessions').delete().eq('plan_id', pid)

      const toInsert = (buildPhaseV(anchorMonday, weeksSpan)).map(s => ({
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
      alert('Error saving Phase V plan')
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
      new Notification('Recovery Reminder', { body: title })
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
      'PRODID:-//MR Inline Hockey//S&C Phase V//EN'
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
    a.download = 'phase5-plan.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderGrid = (list) => (
    <div className="grid md:grid-cols-2 gap-4">
      {list.map((s, idx) => (
        <div key={idx} className={`border rounded-lg p-4 ${isToday(s.date) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-base">
              {format(new Date(s.date), 'EEE, dd MMM')} – {s.title}
            </h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{s.details || '—'}</p>
            {'id' in s && s.id ? (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(s.id && completions[s.id])}
                  onChange={() => toggleComplete(s)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
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
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h1 className="text-2xl font-bold">Phase V – Recovery Plan</h1>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phase length (weeks)</label>
              <input
                type="number"
                min={2}
                max={4}
                value={weeksSpan}
                onChange={(e) => setWeeksSpan(Math.max(2, Math.min(4, Number(e.target.value) || 2)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={savePlan}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
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
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
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
