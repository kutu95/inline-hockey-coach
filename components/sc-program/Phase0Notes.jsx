/*
FILE: /components/sc-program/Phase0Notes.jsx
DESCRIPTION:
Phase 0 – Notes & Quick Guide (modals + helper UI)
Includes:
- HRMaxZonesNote → modal with detailed guidance + zone calculator
- BaselinesNote → modal with detailed testing & "submax strength technique" explainer
- QuickGuideCard → compact how-the-program-works card
- hrCalc utils → maxHR estimate + zones

Adapted for existing React app structure (not Next.js)
*/

import React, { useMemo, useState } from 'react'

// ---------- HR zone helpers ----------
export function estimateMaxHR(age) {
  // Tanaka et al. 2001: 208 − (0.7 × age)
  return Math.round(208 - 0.7 * age)
}

export function zoneRange(max, lowPct, highPct) {
  const lo = Math.round(max * lowPct)
  const hi = Math.round(max * highPct)
  return [lo, hi]
}

// ---------- HR Max & Zones Modal ----------
export function HRMaxZonesNote({ triggerClassName }) {
  const [age, setAge] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const max = useMemo(() => (age && !isNaN(age) && age > 0) ? estimateMaxHR(age) : undefined, [age])
  const z2 = useMemo(() => max ? zoneRange(max, 0.60, 0.70) : undefined, [max])
  const z3 = useMemo(() => max ? zoneRange(max, 0.71, 0.80) : undefined, [max])
  const z4 = useMemo(() => max ? zoneRange(max, 0.81, 0.90) : undefined, [max])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${triggerClassName || ''}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        HR Max & Zones
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setIsOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">HR Max & Training Zones</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">How to establish max heart rate and use it to set Zone 2/3/4 targets.</p>

                <div className="space-y-4 text-sm leading-relaxed">
                  <section className="space-y-2">
                    <p><strong>Two ways to set Max HR</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><em>Measured (preferred):</em> Wear a chest-strap during a <strong>game or hard session</strong>. The highest value you hit is a practical Max HR proxy.</li>
                      <li><em>Estimated:</em> <code className="bg-gray-100 px-1 rounded">Max HR ≈ 208 − (0.7 × age)</code>. Good starting point when you don't have measured data.</li>
                    </ul>
                    <p className="opacity-80">Re-check occasionally; Max HR can vary with fitness, heat, hydration, sleep, and device placement.</p>
                  </section>

                  <div className="border-t border-gray-200"></div>

                  <section className="space-y-2">
                    <p className="flex items-center gap-2 font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Quick Zone Calculator
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs w-28">Age (years)</label>
                      <input
                        type="number" 
                        min={10} 
                        max={90} 
                        placeholder="30"
                        value={age} 
                        onChange={(e) => {
                          const value = e.target.value
                          setAge(value === '' ? '' : Number(value))
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {age && !isNaN(age) && age > 0 && (
                      <div className="rounded-md border p-3 text-xs space-y-1">
                        <div><strong>Estimated Max HR:</strong> {max} bpm</div>
                        <div>Zone 2 (60–70%): {z2?.[0]}–{z2?.[1]} bpm</div>
                        <div>Zone 3 (71–80%): {z3?.[0]}–{z3?.[1]} bpm</div>
                        <div>Zone 4 (81–90%): {z4?.[0]}–{z4?.[1]} bpm</div>
                      </div>
                    )}
                    <p className="opacity-80">Zone 2 should feel conversational; if you're gasping, you're likely above it.</p>
                  </section>

                  <div className="border-t border-gray-200"></div>

                  <section className="space-y-2">
                    <p><strong>Common pitfalls</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Using wrist-only sensors: they often lag on intervals. Prefer a <strong>chest-strap</strong> for accuracy.</li>
                      <li>Chasing high intensity every day: games already supply it. Build the <em>engine</em> with Zone 2.</li>
                      <li>Ignoring recovery: dehydration, low sleep, and illness distort HR—scale effort on those days.</li>
                    </ul>
                  </section>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
                <div className="text-xs text-gray-500 mt-2 sm:mt-0 sm:mr-3">Tip: save your measured Max HR in your profile so plans can auto-calculate zones.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------- Baselines Modal ----------
export function BaselinesNote({ triggerClassName }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${triggerClassName || ''}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Baselines
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setIsOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Baselines: Aerobic, Movement, Submax Strength Technique</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">What to record in Phase 0 and how to run each baseline safely.</p>

                <div className="space-y-5 text-sm leading-relaxed">
                  <section className="space-y-2">
                    <p className="font-medium">Aerobic baseline (choose one)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>2.4 km run (1.5 mi):</strong> Warm-up 8–10′ easy, then time the distance on a flat course or treadmill. Log total time and average HR (if available).</li>
                      <li><strong>1.6 km brisk walk (1 mi):</strong> For newer runners or joint concerns. Same warm-up; walk as fast as sustainable. Log time and average HR.</li>
                    </ul>
                    <p className="opacity-80">Re-test at the end of Phase I to see engine gains at similar or lower HR.</p>
                  </section>

                  <div className="border-t border-gray-200"></div>

                  <section className="space-y-2">
                    <p className="font-medium">Movement screen (quick & simple)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Overhead squat view:</strong> Film from front/side. Note heels lifting, knees collapsing, or excessive forward lean.</li>
                      <li><strong>Ankle wall test:</strong> Knee to wall without heel lift (measure distance). Limited range often limits squat depth and stride mechanics.</li>
                      <li><strong>Single-leg balance:</strong> 30–45 s/side, barefoot if safe. Note wobble or hip drop.</li>
                    </ul>
                  </section>

                  <div className="border-t border-gray-200"></div>

                  <section className="space-y-2">
                    <p className="font-medium">Submax strength technique — what it means</p>
                    <p>
                      "Submax" = <strong>practice the movement well below your limit</strong> to learn positions and bracing.
                      Use <strong>RPE 6</strong> (~4 reps in reserve). Move crisply; stop before grindy reps.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Squat:</strong> Bodyweight → goblet → empty bar. Focus on depth, knees tracking, and braced torso.</li>
                      <li><strong>Deadlift technique:</strong> Hip back, shins near vertical, neutral spine, bar stays close; feel hamstrings.</li>
                      <li><strong>Push (bench/push-up):</strong> Scapular set ("proud chest"), forearms vertical, smooth tempo.</li>
                      <li><strong>Chin-up regressions:</strong> Band-assisted, feet-assisted, eccentric-only, or inverted rows. Aim for clean reps, not exhaustion.</li>
                    </ul>
                    <p className="opacity-80">Progress when technique is consistent: add a little load or range—not both at once.</p>
                  </section>

                  <div className="border-t border-gray-200"></div>

                  <section className="space-y-2">
                    <p className="font-medium">Safety & logging</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Skip or modify any test that aggravates pain. Note issues in the app so Phase I can be adjusted.</li>
                      <li>Record: distance/time, HR data if available, and any red flags from the movement screen.</li>
                    </ul>
                  </section>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
                <div className="text-xs text-gray-500 mt-2 sm:mt-0 sm:mr-3">You'll repeat key tests after Phase I—don't chase PRs now; set a clean baseline.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------- "Where do we get videos?" helper block ----------
export function DemoSourcesNote({ triggerClassName }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 ${triggerClassName || ''}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Demo video sources
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setIsOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Exercise demos: where to source</h3>
                <p className="text-sm text-gray-600 mb-4">Shortlist of reliable options for "squat", "deadlift technique", "chin-up regressions", etc.</p>

                <div className="text-sm space-y-3 leading-relaxed">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Create your own</strong> (best): film 15–45s clips with your coaching cues to match your program exactly.</li>
                    <li><strong>Use trusted libraries:</strong> look for clear angles, concise cues, and safe progressions. Examples to search for:
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>"Goblet squat setup & depth", "Back squat bracing and knee tracking"</li>
                        <li>"Deadlift setup and bar path", "Hip hinge drill with dowel"</li>
                        <li>"Band-assisted chin-ups", "Eccentric chin-ups", "Inverted row setup"</li>
                      </ul>
                    </li>
                    <li><strong>Attribution & rights:</strong> if you embed third-party videos, link to the original source and check usage terms.</li>
                  </ul>
                  <p className="opacity-80">Recommendation: start with a minimal in-house library for your core movements, then supplement with curated external links for regressions/progressions.</p>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------- Quick Guide (card) ----------
export function QuickGuideCard({ className }) {
  return (
    <div className={`rounded-xl border p-4 bg-blue-50 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-sm font-semibold">Quick Guide — How the Program Works</h3>
      </div>
      <ol className="list-decimal pl-5 text-sm space-y-1">
        <li><strong>Pick an Anchor Monday</strong> — this starts your 8-week Phase I calendar.</li>
        <li><strong>Set your games/week</strong> — the plan auto-adjusts around fixtures.</li>
        <li><strong>Do the work: 2 Strength + 2 Aerobic</strong> (Phase I), then progress intensity in later phases.</li>
        <li><strong>Stay in Zone-2 for aerobic</strong> — conversational pace, 60–70% of Max HR.</li>
        <li><strong>Mark sessions done</strong> — build streaks; consistency beats perfection.</li>
        <li><strong>Progress gradually</strong> — add small load/reps when technique is crisp.</li>
        <li><strong>Prioritize recovery</strong> — sleep, hydration, mobility, simple nutrition.</li>
      </ol>
      <div className="mt-3">
        <DemoSourcesNote />
      </div>
    </div>
  )
}

// ---------- Convenience: drop-in row of two buttons ----------
export function InfoNotesRow() {
  return (
    <div className="flex flex-wrap gap-2">
      <HRMaxZonesNote />
      <BaselinesNote />
    </div>
  )
}
