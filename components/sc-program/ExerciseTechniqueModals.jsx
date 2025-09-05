/*
FILE: /components/sc-program/ExerciseTechniqueModals.jsx
DESCRIPTION:
Exercise technique modals and helpers to render exercise terms as clickable links.
Covers: Squat, Bench Press, Deadlift, Chin-up, Overhead Press, Goblet Squat, Push-up, Bridge
*/

import React, { useState } from 'react'

const TECHNIQUE_CONTENT = {
  'squat': {
    title: 'Squat — Key Execution',
    bullets: [
      'Set rack: bar hooks ~mid‑chest; safeties just below bottom position.',
      'Bar on upper back (not neck); hands as close as comfortable; elbows drive back.',
      'Feet hip‑width, toes ~30° out; brace torso.',
      'Sit hips back and down; knees track over toes; thighs to parallel; stand up.',
      'Warm‑up: bar ×10, ~50% ×5, ~75% ×2–3, ~90% ×1–2; then work sets (typically 3×5).'
    ],
    links: [
      { label: 'Video: squat overview 1', href: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
      { label: 'Video: squat overview 2', href: 'https://www.youtube.com/watch?v=nhoikoUEI8U' }
    ]
  },
  'bench press': {
    title: 'Bench Press — Key Execution',
    bullets: [
      'Feet flat; eyes under the bar; shoulder blades set (“proud chest”).',
      'Grip wider than shoulders so forearms are vertical at the chest.',
      'Lower to just above nipples with elbows tucked toward ribs; press to lockout.',
      'Warm‑up bar ×10; then add load to reach work sets (typically 3×5).'
    ],
    links: [ { label: 'Video: bench press', href: 'https://www.youtube.com/watch?v=rxD321l2svE' } ]
  },
  'deadlift': {
    title: 'Deadlift — Key Execution',
    bullets: [
      'Shoes off/flat soles; bar over mid‑foot.',
      'Grip bar with double overhand; shins to bar; squeeze chest up to set neutral spine.',
      'Stand up with the bar close to legs; no lean‑back at top; control down.',
      'Warm‑up (e.g., 60 kg ×5) then one work set of 5 reps; add load gradually.'
    ],
    links: [
      { label: 'Video: deadlift 1', href: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
      { label: 'Video: deadlift 2', href: 'https://www.youtube.com/watch?v=p2OPUi4xGrM' }
    ]
  },
  'chin-up': {
    title: 'Chin-up — Key Execution',
    bullets: [
      'Underhand grip, just wider than shoulder width; full hang start.',
      'Pull until the bar touches mid‑chest; lower under control to full hang.',
      'If needed: use jumping or band‑assisted reps; build toward clean sets.'
    ],
    links: [ { label: 'Video: chin-up', href: 'https://www.youtube.com/watch?v=Yrzap8ycnRU' } ]
  },
  'overhead press': {
    title: 'Overhead Press — Key Execution',
    bullets: [
      'Start with bar at upper chest; hands just wider than shoulder width.',
      'Tuck chin, press the bar overhead; finish over ears; shrug at top.',
      'Keep bar close to face on the way down; stand tall without leaning back.'
    ],
    links: [ { label: 'Video: overhead press', href: 'https://www.youtube.com/watch?v=8dacy5hjaE8' } ]
  },
  'goblet squat': {
    title: 'Goblet Squat — Key Execution',
    bullets: [
      'Hold a kettlebell/dumbbell at chest; feet shoulder‑width; brace.',
      'Sit hips back and down; keep chest tall; knees track over toes.',
      'Use moderate load for balance/technique; add small reps week to week.'
    ],
    links: [ { label: 'Video: goblet squat', href: 'https://www.youtube.com/watch?v=fnuHKfySEsU' } ]
  },
  'push-up': {
    title: 'Push-up — Key Execution',
    bullets: [
      'Hands under shoulders; elbows tuck toward ribs; body in one line.',
      'Lower under control; press smoothly; stop with 1–2 reps in reserve at start.'
    ],
    links: [ { label: 'Video: push-up', href: 'https://www.youtube.com/watch?v=i9sTjhN4Z3M' } ]
  },
  'bridge': {
    title: 'Bridge — Key Execution',
    bullets: [
      'Squeeze glutes to lift hips; hold 3 s at top; lower slowly with control.',
      'Light touch at bottom; do not fully relax between reps.'
    ],
    links: [ { label: 'Video: bridge', href: 'https://www.youtube.com/watch?v=Q_Bpj91Yiis' } ]
  }
}

function TechniqueModal({ title, bullets, links, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {bullets.map((b, i) => (<li key={i}>{b}</li>))}
            </ul>
            {links?.length ? (
              <div className="mt-4 space-y-1 text-sm">
                {links.map((l, i) => (
                  <div key={i}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">{l.label}</a>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExerciseTechniqueLink({ term, children, className }) {
  const key = canonicalKey(term)
  const content = TECHNIQUE_CONTENT[key]
  const [open, setOpen] = useState(false)
  if (!content) return <>{children || term}</>
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`text-blue-700 hover:text-blue-900 underline ${className || ''}`}>{children || term}</button>
      {open && (
        <TechniqueModal title={content.title} bullets={content.bullets} links={content.links} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function canonicalKey(raw) {
  const t = raw.toLowerCase()
  if (/bench/.test(t)) return 'bench press'
  if (/overhead\s*press/.test(t)) return 'overhead press'
  if (/goblet\s*squat/.test(t)) return 'goblet squat'
  if (/push-?up/.test(t)) return 'push-up'
  if (/chin-?up/.test(t)) return 'chin-up'
  if (/deadlift/.test(t)) return 'deadlift'
  if (/squat/.test(t)) return 'squat'
  if (/bridge/.test(t)) return 'bridge'
  return t
}

export function renderWithTechniqueLinks(text) {
  if (!text) return null
  const patterns = [
    { re: /(overhead\s*press)/ig, key: 'overhead press' },
    { re: /(bench\s*press|bench)/ig, key: 'bench press' },
    { re: /(goblet\s*squat)/ig, key: 'goblet squat' },
    { re: /(push-?ups?)/ig, key: 'push-up' },
    { re: /(chin-?ups?)/ig, key: 'chin-up' },
    { re: /(deadlift(?:\s*technique)?)/ig, key: 'deadlift' },
    { re: /(squats?|squat)/ig, key: 'squat' },
    { re: /(bridges?|bridge)/ig, key: 'bridge' },
  ]

  // Build a single regex that matches any term
  const combined = new RegExp(patterns.map(p => p.re.source).join('|'), 'ig')
  const nodes = []
  let lastIndex = 0
  let m
  while ((m = combined.exec(text)) !== null) {
    const match = m[0]
    const index = m.index
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    // Determine which pattern matched to get canonical key
    let key = null
    for (const p of patterns) {
      p.re.lastIndex = 0
      if (p.re.test(match)) { key = p.key; break }
    }
    nodes.push(<ExerciseTechniqueLink key={`${index}-${match}`} term={key || match}>{match}</ExerciseTechniqueLink>)
    lastIndex = index + match.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return <span>{nodes}</span>
}

export default ExerciseTechniqueLink


