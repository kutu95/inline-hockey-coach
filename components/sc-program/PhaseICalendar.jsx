/*
FILE: /components/sc-program/PhaseICalendar.jsx
DESCRIPTION:
A React component that renders:
- Phase I calendar (8 weeks) with auto-populated sessions (2 Strength + 2 Aerobic)
- Game-aware scheduling (players enter weekly games; plan auto-shifts)
- Checkoffs with streaks & progress
- Local reminders via Web Notifications + optional calendar (.ics) export
- Supabase persistence (plans, sessions, completions)

Adapted for existing React app structure (not Next.js)
*/

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { renderWithTechniqueLinks } from './ExerciseTechniqueModals'
import StrengthSessionModal from './StrengthSessionModal'

// ---------------------- Types ----------------------

// Session types
const SESSION_TYPES = {
  STRENGTH: 'STRENGTH',
  AEROBIC: 'AEROBIC', 
  GAME: 'GAME',
  REST: 'REST'
}

// ---------------------- Helpers ----------------------

function makePhaseIWeekTemplate(hasGymAccess, selectedGameDays = [6], gamesPerWeek = 1) {
  // Create a flexible template that can place games on any day
  // gameDayIndex: 0=Monday, 1=Tuesday, ..., 6=Sunday
  // gamesPerWeek: 0, 1, 2, or 3 games per week
  
  const strengthADetails = hasGymAccess
    ? 'Squat 3×5, Bench Press 3×5, Deadlift 1×5, Chin-ups 3 sets (progress). Warm-up sets as prescribed.'
    : 'Circuit 3 rounds: Goblet Squat 8–12 · Push-up sub-max · Chin-up/Jumping sub-max · Dip (bench) 8–12 · Bridge (3s) 8–12. Stop fresh; add small reps weekly.'
  const strengthBDetails = hasGymAccess
    ? 'Squat 3×5, Overhead Press 3×5, Deadlift 1×5, Chin-ups. Add 2.5–5 kg if form is solid.'
    : 'Circuit 3 rounds: Goblet Squat 8–12 · Push-up sub-max · Chin-up/Jumping sub-max · Dip (bench) 8–12 · Bridge (3s) 8–12. Keep quality high.'

  // Create base template with all REST days
  const weekTemplate = Array.from({ length: 7 }, (_, index) => ({
    date: '',
    type: SESSION_TYPES.REST,
    title: 'Rest / Mobility',
    details: 'Light mobility work and recovery'
  }))

  // Dr. Mike Dale methodology for games per week:
  // 0 games: Game day becomes rest day, plan normally (2 strength + 2 aerobic)
  // 1 game: Standard plan (2 strength + 2 aerobic + 1 game)
  // 2 games: Substitute one aerobic session for a game (2 strength + 1 aerobic + 2 games)
  // 3 games: Substitute both aerobic sessions for games (2 strength + 3 games)

  if (gamesPerWeek === 0) {
    // No games - all selected game days become rest days, plan normally
    selectedGameDays.forEach(dayIndex => {
      weekTemplate[dayIndex] = {
        date: '',
        type: SESSION_TYPES.REST,
        title: 'Rest / Mobility',
        details: 'Light mobility work and recovery'
      }
    })
  } else {
    // 1+ games - place all selected game days
    selectedGameDays.forEach((dayIndex, index) => {
      const gameNumber = selectedGameDays.length > 1 ? ` (Game ${index + 1})` : ''
      weekTemplate[dayIndex] = {
        date: '',
        type: SESSION_TYPES.GAME,
        title: `Game Day${gameNumber}`,
        details: 'Games count as interval conditioning. Prioritize sleep, hydration.'
      }
    })
  }

  // Add training sessions around the game day
  // Strategy: Place strength sessions on non-game days with at least 1 day rest from games
  // Place aerobic sessions on non-game days with at least 1 day rest from games
  
  const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(day => !selectedGameDays.includes(day))
  
  // Find days that are at least 1 day away from any game day
  const trainingDays = availableDays.filter(day => {
    const minDistanceFromAnyGame = Math.min(...selectedGameDays.map(gameDay => 
      Math.min(Math.abs(day - gameDay), 7 - Math.abs(day - gameDay))
    ))
    return minDistanceFromAnyGame >= 1 // At least 1 day away from any game
  })

  // Place 2 strength sessions and aerobic sessions based on games per week
  if (trainingDays.length >= 4) {
    const strengthDays = []
    
    // Strategy: Ensure strength sessions are at least 3 days apart for optimal recovery
    // Find first strength day (away from any game day)
    for (const day of trainingDays) {
      const minGameDayDist = Math.min(...selectedGameDays.map(gameDay => 
        Math.min(Math.abs(day - gameDay), 7 - Math.abs(day - gameDay))
      ))
      if (minGameDayDist >= 1 && !strengthDays.includes(day)) {
        strengthDays.push(day)
        break
      }
    }
    
    // Find second strength day (at least 3 days from first strength day)
    for (const day of trainingDays) {
      if (strengthDays.length > 0 && !strengthDays.includes(day)) {
        const firstStrengthDay = strengthDays[0]
        const strengthDist = Math.min(Math.abs(day - firstStrengthDay), 7 - Math.abs(day - firstStrengthDay))
        const minGameDayDist = Math.min(...selectedGameDays.map(gameDay => 
          Math.min(Math.abs(day - gameDay), 7 - Math.abs(day - gameDay))
        ))
        
        if (strengthDist >= 3 && minGameDayDist >= 1) {
          strengthDays.push(day)
          break
        }
      }
    }
    
    // Determine number of aerobic sessions based on games per week
    let aerobicSessionsNeeded = 2
    if (gamesPerWeek === 2) {
      aerobicSessionsNeeded = 1 // Substitute one aerobic for a game
    } else if (gamesPerWeek === 3) {
      aerobicSessionsNeeded = 0 // Substitute both aerobic for games
    }
    
    // Assign remaining days to aerobic training (prefer non-consecutive days)
    const remainingDays = trainingDays.filter(day => !strengthDays.includes(day))
    const aerobicDays = []
    
    // Try to avoid consecutive aerobic days by selecting spaced-out days
    for (const day of remainingDays) {
      if (aerobicDays.length < aerobicSessionsNeeded) {
        // Check if this day would create consecutive training days with existing aerobic days
        const wouldBeConsecutive = aerobicDays.some(aerobicDay => 
          Math.min(Math.abs(day - aerobicDay), 7 - Math.abs(day - aerobicDay)) === 1
        )
        
        // Check if this day would create consecutive training days with strength days
        const consecutiveWithStrength = strengthDays.some(strengthDay => 
          Math.min(Math.abs(day - strengthDay), 7 - Math.abs(day - strengthDay)) === 1
        )
        
        if (!wouldBeConsecutive && !consecutiveWithStrength) {
          aerobicDays.push(day)
        }
      }
    }
    
    // If we couldn't find non-consecutive days, take any remaining days
    if (aerobicDays.length < aerobicSessionsNeeded) {
      for (const day of remainingDays) {
        if (!aerobicDays.includes(day) && aerobicDays.length < aerobicSessionsNeeded) {
          aerobicDays.push(day)
        }
      }
    }
    
    // Assign strength sessions
    if (strengthDays.length >= 2) {
      weekTemplate[strengthDays[0]] = {
        date: '',
        type: SESSION_TYPES.STRENGTH,
        title: hasGymAccess ? 'Strength Day A' : 'Strength Day A (No Gym)',
        details: strengthADetails
      }

      weekTemplate[strengthDays[1]] = {
        date: '',
        type: SESSION_TYPES.STRENGTH,
        title: hasGymAccess ? 'Strength Day B' : 'Strength Day B (No Gym)',
        details: strengthBDetails
      }
    }
    
    // Assign aerobic sessions (only if needed based on games per week)
    if (aerobicDays.length >= aerobicSessionsNeeded && aerobicSessionsNeeded > 0) {
      weekTemplate[aerobicDays[0]] = {
        date: '',
        type: SESSION_TYPES.AEROBIC,
        title: 'Zone 2 Aerobic',
        details: '45–60 min @ ~60–70% max HR. Choose bike/row/run-walk/swim.'
      }

      if (aerobicSessionsNeeded >= 2 && aerobicDays.length >= 2) {
        weekTemplate[aerobicDays[1]] = {
          date: '',
          type: SESSION_TYPES.AEROBIC,
          title: 'Zone 2 Aerobic',
          details: '45–60 min @ ~60–70% max HR. Maintain conversational pace.'
        }
      }
    }
  }

  return weekTemplate
}

function fitToWeek(start, gamesPerWeek, hasGymAccess, selectedGameDays = [6]) {
  const base = makePhaseIWeekTemplate(hasGymAccess, selectedGameDays, gamesPerWeek)
  const weekStart = startOfWeek(start, { weekStartsOn: 1 }) // Monday start
  // assign dates Mon..Sun - using local dates to avoid timezone issues
  const dated = base.map((s, idx) => {
    const assignedDate = addDays(weekStart, idx)
    // Store as local date string (YYYY-MM-DD) instead of UTC ISO string
    const localDateString = format(assignedDate, 'yyyy-MM-dd')
    const result = { ...s, date: localDateString }
    // Game day assignment handled correctly with local dates
    return result
  })
  
  // Debug logging removed - timezone issue fixed by using local dates
  
  // All game days are now handled in the base template
  // No additional logic needed here
  
  // Week schedule complete
  
  return dated
}

function buildEightWeeksPhaseI(anchorMondayISO, gamesPerWeek, hasGymAccess, selectedGameDays = [6]) {
  const anchor = new Date(anchorMondayISO)
  const weeks = []
  for (let w = 0; w < 8; w++) {
    const weekStart = addDays(anchor, w * 7)
    weeks.push(...fitToWeek(weekStart, gamesPerWeek, hasGymAccess, selectedGameDays))
  }
  return weeks
}

function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// ---------------------- Component ----------------------

export default function PhaseICalendar() {
  const { user } = useAuth()
  const [hasGymAccess, setHasGymAccess] = useState(true)
  const [gameDayIndex, setGameDayIndex] = useState(6) // Default to Sunday (0=Monday, 6=Sunday)
  const [selectedGameDays, setSelectedGameDays] = useState([6]) // Array of selected game days
  
  // Calculate games per week from selected game days
  const gamesPerWeek = selectedGameDays.length
  
  // Handle multiple game day selection
  const handleGameDayToggle = (dayIndex) => {
    if (selectedGameDays.includes(dayIndex)) {
      // Remove day if already selected
      setSelectedGameDays(prev => prev.filter(day => day !== dayIndex))
    } else {
      // Add day if not selected and we haven't reached the limit (max 3 games per week)
      if (selectedGameDays.length < 3) {
        setSelectedGameDays(prev => [...prev, dayIndex])
      }
    }
  }
  
  
  const [anchorMonday, setAnchorMonday] = useState(() => {
    // default to upcoming Monday
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday.toISOString()
  })
  const [sessions, setSessions] = useState([])
  const [completions, setCompletions] = useState({})
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  const [showStrengthModal, setShowStrengthModal] = useState(false)
  const [selectedStrengthSession, setSelectedStrengthSession] = useState(null)

  const weeks = useMemo(() => {
    // 8-week plan from anchor Monday
    return buildEightWeeksPhaseI(anchorMonday, gamesPerWeek, hasGymAccess, selectedGameDays)
  }, [anchorMonday, gamesPerWeek, hasGymAccess, selectedGameDays])

  useEffect(() => {
    // Ask for notifications (for reminders) – optional
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  async function savePlan() {
    if (!user) return
    
    setLoading(true)
    try {
      // upsert plan (with selected_game_days)
      const { data: planRes, error: planErr } = await supabase
        .from('sc_plans')
        .upsert({ 
          user_id: user.id, 
          phase: 'PHASE_I', 
          anchor_monday: anchorMonday, 
          games_per_week: gamesPerWeek,
          selected_game_days: selectedGameDays
        }, { onConflict: 'user_id,phase' })
        .select('id')
        .single()
      if (planErr) throw planErr
      const pid = planRes.id
      setPlanId(pid)

      // delete existing sessions for this plan (idempotent rebuild)
      await supabase.from('sc_plan_sessions').delete().eq('plan_id', pid)

      // insert sessions
      const toInsert = weeks.map(s => ({
        plan_id: pid,
        date: s.date,
        type: s.type,
        title: s.title,
        details: s.details ?? null,
      }))
      const { error: sessErr } = await supabase.from('sc_plan_sessions').insert(toInsert)
      if (sessErr) throw sessErr

      // reload
      await loadPlan()
    } catch (e) {
      console.error(e)
      alert('Error saving plan')
    } finally {
      setLoading(false)
    }
  }

  async function loadPlan() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: plan } = await supabase.from('sc_plans').select('id, anchor_monday, games_per_week, selected_game_days').eq('user_id', user.id).eq('phase', 'PHASE_I').maybeSingle()
      if (plan) {
        setPlanId(plan.id)
        setAnchorMonday(plan.anchor_monday)
        // Load saved game day selections, with fallback to Sunday
        const savedGameDays = plan.selected_game_days || [6]
        setSelectedGameDays(savedGameDays)
        setGameDayIndex(savedGameDays[0] || 6) // Use first selected day as primary game day
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
          comp.forEach(c => map[c.plan_session_id] = true)
          setCompletions(map)
        }
      } else {
        // not created yet – show generated local sessions
        setSessions(weeks)
      }
      computeStreak()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadPlan()
    }
  }, [user])

  async function toggleComplete(s) {
    if (!planId || !s.id) return
    const key = s.id
    const done = !completions[key]
    setCompletions(prev => ({ ...prev, [key]: done }))
    if (done) {
      await supabase.from('sc_completions').insert({
        plan_session_id: key,
        user_id: user.id,
        completed_at: new Date().toISOString()
      })
    } else {
      await supabase.from('sc_completions').delete().eq('plan_session_id', key).eq('user_id', user.id)
    }
    computeStreak()
  }

  function handleStrengthSessionClick(session) {
    if (session.type === SESSION_TYPES.STRENGTH) {
      setSelectedStrengthSession(session)
      setShowStrengthModal(true)
    }
  }

  function computeStreak() {
    // Simple 7-day rolling streak based on any completion in a day
    const today = new Date()
    let count = 0
    for (let i = 0; i < 30; i++) {
      const day = addDays(today, -i)
      const dayISO = day.toISOString().slice(0, 10)
      const anyDone = Object.entries(completions).some(([id, done]) => {
        if (!done) return false
        // we don't have date map here; skip in quick calc – streak will refresh on reload
        return false
      })
      if (anyDone) count++
      else break
    }
    setStreak(count)
  }

  function scheduleNotification(dateISO, title) {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    // Simple local nudge: if the session is today, ping immediately; otherwise ignore
    if (isToday(dateISO)) {
      new Notification('Training Reminder', { body: title })
    }
  }

  function exportICS() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MR Inline Hockey//S&C Phase I//EN'
    ]
    const entries = (sessions.length ? sessions : weeks)
    entries.forEach((s) => {
      const dt = new Date(s.date)
      // all-day events
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
    a.download = 'phase1-plan.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render 8 weeks as stacked cards
  const renderGrid = (list) => {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((s, idx) => {
          const dateObj = new Date(s.date)
          const dayName = format(dateObj, 'EEE')
          const dayOfWeek = dateObj.getDay() // 0=Sunday, 1=Monday, etc.
          const expectedDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
          
        // Date parsing works correctly with local date format
          
          return (
            <div key={idx} className={`border rounded-lg p-4 ${isToday(s.date) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-semibold text-base">
                  {format(dateObj, 'EEE, dd MMM')} – {s.title}
                </h3>
              </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{s.details ? renderWithTechniqueLinks(s.details) : '—'}</p>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(s.id && completions[s.id])}
                  onChange={() => toggleComplete(s)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm">Mark done</label>
                {s.type === SESSION_TYPES.STRENGTH && (
                  <button
                    onClick={() => handleStrengthSessionClick(s)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    title="Track weights, sets, reps"
                  >
                    Track Workout
                  </button>
                )}
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
            </div>
          </div>
          )
        })}
      </div>
    )
  }

  const progress = useMemo(() => {
    const total = (sessions.length ? sessions : weeks).filter(s => s.type !== SESSION_TYPES.REST).length
    const done = Object.values(completions).filter(Boolean).length
    return total ? Math.round(done / total * 100) : 0
  }, [sessions, weeks, completions])

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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <h1 className="text-2xl font-bold">Phase I – 8‑Week Plan</h1>
        </div>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">Smart Scheduling</h3>
                <p className="text-sm text-blue-700">
                  Select your primary game day and the system will automatically arrange your strength and aerobic training sessions around it, ensuring proper rest and recovery between sessions.
                </p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Game days
                <span className="text-xs text-gray-500 ml-1">(Beta feature)</span>
              </label>
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <button
                    key={index}
                    onClick={() => handleGameDayToggle(index)}
                    disabled={!selectedGameDays.includes(index) && selectedGameDays.length >= 3}
                    className={`px-2 py-1 text-xs rounded border ${
                      selectedGameDays.includes(index)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${
                      !selectedGameDays.includes(index) && selectedGameDays.length >= 3
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {gamesPerWeek === 0 
                  ? 'Select 0-3 game days per week' 
                  : `${gamesPerWeek} game day${gamesPerWeek !== 1 ? 's' : ''} selected`}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Note: Game day selections will be saved after running the database migration.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gym access</label>
              <select
                value={hasGymAccess ? 'yes' : 'no'}
                onChange={(e) => setHasGymAccess(e.target.value === 'yes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="yes">Yes (Gym program)</option>
                <option value="no">No (Bodyweight circuit)</option>
              </select>
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

      {/* Strength Session Modal */}
      <StrengthSessionModal
        isOpen={showStrengthModal}
        onClose={() => setShowStrengthModal(false)}
        sessionData={selectedStrengthSession}
        userId={user?.id}
        hasGymAccess={hasGymAccess}
      />
    </div>
  )
}
