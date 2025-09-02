/*
FILE: components/sc-program/MotivationBanner.jsx
DESCRIPTION:
A motivational banner component that displays rotating messages to encourage users
in their strength and conditioning journey. Adapted for existing React app structure.
*/

import React from 'react'

// ---------------------- Messages ----------------------

const messages = [
  "🏒 Every rep and every shift builds your edge — consistency wins games.",
  "💪 Small progress adds up — 2.5kg today is 20kg in a season.",
  "🫀 Zone 2 feels easy now, but it's building the engine you'll rely on later.",
  "🔥 Strength is the foundation — power and speed come from here.",
  "🕑 Don't chase perfection, chase consistency — check off today's session.",
  "🌙 Recovery is training too — sleep, fuel, hydrate.",
  "🥅 Play the long game: build the base now, dominate on the rink later."
]

// ---------------------- Rotation Logic ----------------------

// Option 1: Daily rotation (based on date)
export function getDailyMessage() {
  const today = new Date()
  const index = today.getDate() % messages.length
  return messages[index]
}

// Option 2: Random per page load / login
export function getRandomMessage() {
  const index = Math.floor(Math.random() * messages.length)
  return messages[index]
}

// ---------------------- Banner Component ----------------------

export default function MotivationBanner({ mode = 'daily' }) {
  const text = mode === 'daily' ? getDailyMessage() : getRandomMessage()

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 mb-6 flex items-center gap-3">
      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
      <span className="text-sm font-medium text-gray-800">{text}</span>
    </div>
  )
}
