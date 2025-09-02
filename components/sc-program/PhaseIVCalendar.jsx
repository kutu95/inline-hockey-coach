/*
FILE: /components/sc-program/PhaseIVCalendar.jsx
DESCRIPTION:
Phase IV – Competition (Nationals tournament window; typically 1–2 weeks)
Focus: Recovery, sleep, nutrition, light mobility. Minimal formal training.
Each day includes: AM Mobility Primer, (optional) Pre-Game Primer, Game(s), Post-Game Recovery, Sleep Hygiene.
Supports 1–2 games/day via settings.

Adapted for existing React app structure (not Next.js)
*/

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'

// ---------------------- Types ----------------------

// Session types
const SESSION_TYPES = {
  GAME: 'GAME',
  RECOVERY: 'RECOVERY',
  MOBILITY: 'MOBILITY',
  PRIMER: 'PRIMER',
  SLEEP: 'SLEEP',
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
    <div className="bg-white rounded-lg shadow border border-green-200">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Phase IV — Competition (Tournament Mode)
        </h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            This phase prioritizes <strong>recovery and consistency</strong>. Keep mobility daily, do the minimum effective work,
            and manage sleep, hydration, and fueling between games.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>AM Mobility Primer (10–15′):</strong> Hips/adductors/ankles + T-spine; gentle activation.</li>
            <li><strong>Pre-Game Primer (8–10′):</strong> Dynamic warm-up + a few fast strides/jumps; stop while fresh.</li>
            <li><strong>Game(s):</strong> Count as your high-intensity work.</li>
            <li><strong>Post-Game Recovery (20–30′):</strong> Cool-down walk/ride 10′ → light stretch 8–10′ → protein+carbs, rehydrate, elevate legs, optional compression/cold if you like it.</li>
            <li><strong>Sleep Hygiene:</strong> Wind-down routine, limit screens late, consistent lights-out.</li>
          </ul>
          <p className="opacity-80">
            Rule of thumb: if anything makes you feel <em>more</em> tired for the next game, skip it. Movement quality beats volume.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Templates ----------------------
function dayBlocks(gamesToday) {
  const base = [
    { type: SESSION_TYPES.MOBILITY, title: 'AM Mobility Primer (10–15′)', details: 'Hips/adductors/ankles + T-spine. Easy flow, no strain.' },
    { type: SESSION_TYPES.PRIMER, title: 'Pre-Game Primer (8–10′)', details: 'Dynamic warm-up + 2–4 short strides/jumps. Stop fresh.' },
    { type: SESSION_TYPES.GAME, title: 'Game 1', details: 'Hydrate in warm-up. Post-game recovery protocol after.' },
    { type: SESSION_TYPES.RECOVERY, title: 'Post-Game Recovery (20–30′)', details: '10′ easy walk/ride → 8–10′ light stretch → protein+carbs; fluids+sodium; elevate legs; optional compression/cold.' },
    { type: SESSION_TYPES.SLEEP, title: 'Sleep Hygiene', details: 'Wind-down, low light, consistent lights-out, room cool & dark.' },
  ]
  if (gamesToday >= 2) {
    base.splice(3, 0,
      { type: SESSION_TYPES.PRIMER, title: 'Pre-Game Primer 2 (6–8′)', details: 'Very light; just re-activate. Stop fresh.' },
      { type: SESSION_TYPES.GAME, title: 'Game 2', details: 'Fuel/fluids between games. Keep warm.' },
    )
  }
  return base
}

function makePhaseIVWeekTemplate(gamesPerDay) {
  // Mon..Sun
  return [
    dayBlocks(gamesPerDay),
    dayBlocks(gamesPerDay),
    dayBlocks(gamesPerDay),
    dayBlocks(gamesPerDay),
    dayBlocks(gamesPerDay),
    [{ type: SESSION_TYPES.REST, title: 'Logistics / Light Walk', details: 'Travel, laundry, snacks stock-up, venue timings. 15–20′ easy walk optional.' }],
    dayBlocks(gamesPerDay),
  ]
}

function fitToWeek(start, gamesPerDay) {
  const weekStart = startOfWeek(start, { weekStartsOn: 1 }) // Monday
  const week = makePhaseIVWeekTemplate(gamesPerDay)
  const out = []
  week.forEach((blocks, idx) => {
    const dayISO = addDays(weekStart, idx).toISOString()
    blocks.forEach((b) => out.push({ ...b, date: dayISO }))
  })
  return out
}

function buildTournamentPhase(anchorMondayISO, weeks, gamesPerDay) {
  const anchor = new Date(anchorMondayISO)
  const all = []
  for (let w = 0; w < weeks; w++) {
    all.push(...fitToWeek(addDays(anchor, w * 7), gamesPerDay))
  }
  return all
}

// ---------------------- Component ----------------------

export default function PhaseIVCalendar() {
  const { user } = useAuth()
  const [gamesPerDay, setGamesPerDay] = useState(1)      // 1 or 2
  const [weeksSpan, setWeeksSpan] = useState(1)          // 1–2 typical
  const [anchorMonday, setAnchorMonday] = useState(() => {
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday.toISOString()
  })
  const [sessions, setSessions] = useState([])
  const [completions, setCompletions] = useState({})
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(false)

  const weeks = useMemo(
    () => buildTournamentPhase(anchorMonday, weeksSpan, gamesPerDay),
    [anchorMonday, weeksSpan, gamesPerDay]
  )

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
        .select('id, anchor_monday, games_per_week')
        .eq('user_id', user.id)
        .eq('phase', 'PHASE_IV')
        .maybeSingle()
      if (plan) {
        setPlanId(plan.id)
        setAnchorMonday(plan.anchor_monday)
        // reuse games_per_week column to store gamesPerDay for Phase IV (saves a migration)
        setGamesPerDay(Math.max(1, Math.min(2, plan.games_per_week || 1)))
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
            phase: 'PHASE_IV',
            anchor_monday: anchorMonday,
            games_per_week: gamesPerDay, // repurposed as games/day for Phase IV
          },
          { onConflict: 'user_id,phase' }
        )
        .select('id')
        .single()
      if (planErr) throw planErr
      const pid = planRes.id
      setPlanId(pid)

      await supabase.from('sc_plan_sessions').delete().eq('plan_id', pid)

      const toInsert = (buildTournamentPhase(anchorMonday, weeksSpan, gamesPerDay)).map(s => ({
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
      alert('Error saving Phase IV plan')
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
      new Notification('Competition Reminder', { body: title })
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
      'PRODID:-//MR Inline Hockey//S&C Phase IV//EN'
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
    a.download = 'phase4-plan.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderGrid = (list) => (
    <div className="grid md:grid-cols-2 gap-4">
      {list.map((s, idx) => (
        <div key={idx} className={`border rounded-lg p-4 ${isToday(s.date) ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
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
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
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
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold">Phase IV – Tournament Plan</h1>
        </div>
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anchor Monday</label>
              <input
                type="date"
                value={format(new Date(anchorMonday), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00')
                  setAnchorMonday(d.toISOString())
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament length (weeks)</label>
              <input
                type="number"
                min={1}
                max={2}
                value={weeksSpan}
                onChange={(e) => setWeeksSpan(Math.max(1, Math.min(2, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Games per day</label>
              <input
                type="number"
                min={1}
                max={2}
                value={gamesPerDay}
                onChange={(e) => setGamesPerDay(Math.max(1, Math.min(2, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={savePlan}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
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
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
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
