/**
 * Progressive Overload Suggestion Engine
 * Suggests weights, sets, and reps based on previous session performance
 */

import { supabase } from '../lib/supabase'

// Progression rules
const PROGRESSION_RULES = {
  LINEAR: 'linear',           // Add weight when all reps completed
  DOUBLE_PROGRESSION: 'double_progression', // Add reps first, then weight
  VOLUME: 'volume'            // Increase total volume (sets × reps × weight)
}

// Exercise categories for different progression strategies
const EXERCISE_CATEGORIES = {
  MAIN_LIFTS: ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'],
  BODYWEIGHT: ['Chin-ups', 'Push-up', 'Dip (bench)', 'Bridge (3s)'],
  ACCESSORY: ['Goblet Squat', 'Chin-up/Jumping']
}

/**
 * Get the last strength session for a specific session type
 */
export async function getLastStrengthSession(userId, sessionType, phase) {
  const { data, error } = await supabase
    .from('sc_strength_sessions')
    .select(`
      *,
      sc_exercise_records (
        exercise_name,
        set_number,
        reps,
        weight,
        rpe
      )
    `)
    .eq('user_id', userId)
    .eq('session_type', sessionType)
    .eq('phase', phase)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }

  return data
}

/**
 * Get exercise template for progression rules
 */
export async function getExerciseTemplate(exerciseName, sessionType, phase, hasGymAccess) {
  const { data, error } = await supabase
    .from('sc_exercise_templates')
    .select('*')
    .eq('name', exerciseName)
    .eq('session_type', sessionType)
    .eq('phase', phase)
    .eq('has_gym_access', hasGymAccess)
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Calculate suggested workout based on previous session
 */
export async function calculateSuggestedWorkout(userId, sessionType, phase, hasGymAccess) {
  try {
    // Get last session and exercise templates
    const [lastSession, templates] = await Promise.all([
      getLastStrengthSession(userId, sessionType, phase),
      getExerciseTemplates(sessionType, phase, hasGymAccess)
    ])

    const suggestions = []

    for (const template of templates) {
      const exerciseName = template.name
      const lastExerciseData = lastSession?.sc_exercise_records?.filter(
        record => record.exercise_name === exerciseName
      ) || []

      const suggestion = await calculateExerciseProgression(
        template,
        lastExerciseData,
        exerciseName
      )

      suggestions.push({
        ...template,
        ...suggestion
      })
    }

    return suggestions
  } catch (error) {
    console.error('Error calculating suggested workout:', error)
    throw error
  }
}

/**
 * Calculate progression for a specific exercise
 */
async function calculateExerciseProgression(template, lastExerciseData, exerciseName) {
  const { progression_rule, target_sets, target_reps_min, target_reps_max, increment_weight } = template

  // If no previous data, start with minimum targets
  if (!lastExerciseData || lastExerciseData.length === 0) {
    return {
      suggested_sets: target_sets,
      suggested_reps: target_reps_min,
      suggested_weight: getStartingWeight(exerciseName),
      progression_note: 'Starting weight - complete all reps with good form'
    }
  }

  // Analyze last session performance
  const lastSession = analyzeLastSession(lastExerciseData)
  
  switch (progression_rule) {
    case PROGRESSION_RULES.LINEAR:
      return calculateLinearProgression(template, lastSession)
    
    case PROGRESSION_RULES.DOUBLE_PROGRESSION:
      return calculateDoubleProgression(template, lastSession)
    
    case PROGRESSION_RULES.VOLUME:
      return calculateVolumeProgression(template, lastSession)
    
    default:
      return calculateLinearProgression(template, lastSession)
  }
}

/**
 * Analyze last session performance
 */
function analyzeLastSession(exerciseData) {
  const sets = exerciseData.map(record => ({
    reps: record.reps,
    weight: record.weight || 0,
    rpe: record.rpe || 5
  }))

  const totalReps = sets.reduce((sum, set) => sum + set.reps, 0)
  const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0)
  const avgRPE = sets.reduce((sum, set) => sum + set.rpe, 0) / sets.length
  const maxWeight = Math.max(...sets.map(set => set.weight))
  const minReps = Math.min(...sets.map(set => set.reps))

  return {
    sets,
    totalReps,
    totalVolume,
    avgRPE,
    maxWeight,
    minReps,
    completedAllReps: sets.every(set => set.reps >= 5), // Assuming target is 5 reps
    wasEasy: avgRPE <= 6,
    wasHard: avgRPE >= 8
  }
}

/**
 * Calculate linear progression (add weight when all reps completed)
 */
function calculateLinearProgression(template, lastSession) {
  const { target_sets, target_reps_min, increment_weight } = template

  if (lastSession.completedAllReps && lastSession.avgRPE <= 7) {
    // Progress: add weight
    return {
      suggested_sets: target_sets,
      suggested_reps: target_reps_min,
      suggested_weight: lastSession.maxWeight + increment_weight,
      progression_note: `Great work! Increase weight by ${increment_weight}kg`
    }
  } else if (lastSession.avgRPE >= 8) {
    // Too hard: reduce weight
    return {
      suggested_sets: target_sets,
      suggested_reps: target_reps_min,
      suggested_weight: Math.max(lastSession.maxWeight - increment_weight, 0),
      progression_note: 'Last session was tough - reduce weight slightly'
    }
  } else {
    // Repeat same weight
    return {
      suggested_sets: target_sets,
      suggested_reps: target_reps_min,
      suggested_weight: lastSession.maxWeight,
      progression_note: 'Repeat same weight - focus on form'
    }
  }
}

/**
 * Calculate double progression (add reps first, then weight)
 */
function calculateDoubleProgression(template, lastSession) {
  const { target_sets, target_reps_min, target_reps_max, increment_weight } = template

  if (lastSession.completedAllReps && lastSession.avgRPE <= 6) {
    // Easy completion - add weight
    return {
      suggested_sets: target_sets,
      suggested_reps: target_reps_min,
      suggested_weight: lastSession.maxWeight + increment_weight,
      progression_note: `Easy completion! Increase weight by ${increment_weight}kg`
    }
  } else if (lastSession.completedAllReps && lastSession.avgRPE <= 7) {
    // Good completion - try more reps
    const newReps = Math.min(lastSession.minReps + 1, target_reps_max)
    return {
      suggested_sets: target_sets,
      suggested_reps: newReps,
      suggested_weight: lastSession.maxWeight,
      progression_note: `Good work! Try ${newReps} reps per set`
    }
  } else {
    // Repeat same parameters
    return {
      suggested_sets: target_sets,
      suggested_reps: lastSession.minReps,
      suggested_weight: lastSession.maxWeight,
      progression_note: 'Repeat same parameters - focus on form'
    }
  }
}

/**
 * Calculate volume progression
 */
function calculateVolumeProgression(template, lastSession) {
  // For now, use linear progression for volume-based exercises
  return calculateLinearProgression(template, lastSession)
}

/**
 * Get starting weight for exercises
 */
function getStartingWeight(exerciseName) {
  const startingWeights = {
    'Squat': 40,
    'Bench Press': 30,
    'Deadlift': 60,
    'Overhead Press': 20,
    'Chin-ups': 0, // Bodyweight
    'Push-up': 0,
    'Dip (bench)': 0,
    'Goblet Squat': 12,
    'Bridge (3s)': 0
  }

  return startingWeights[exerciseName] || 0
}

/**
 * Get exercise templates for a session
 */
async function getExerciseTemplates(sessionType, phase, hasGymAccess) {
  const { data, error } = await supabase
    .from('sc_exercise_templates')
    .select('*')
    .eq('session_type', sessionType)
    .eq('phase', phase)
    .eq('has_gym_access', hasGymAccess)
    .order('order_index')

  if (error) {
    throw error
  }

  return data
}

/**
 * Save a strength session with exercise records
 */
export async function saveStrengthSession(userId, sessionData) {
  const { session_id, date, session_type, phase, notes, exercises } = sessionData

  // Create strength session
  const { data: strengthSession, error: sessionError } = await supabase
    .from('sc_strength_sessions')
    .insert({
      user_id: userId,
      session_id,
      date,
      session_type,
      phase,
      notes,
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (sessionError) throw sessionError

  // Save exercise records
  const exerciseRecords = exercises.flatMap(exercise => 
    exercise.sets.map((set, index) => ({
      strength_session_id: strengthSession.id,
      exercise_name: exercise.name,
      set_number: index + 1,
      reps: set.reps,
      weight: set.weight,
      rpe: set.rpe,
      notes: set.notes
    }))
  )

  const { error: recordsError } = await supabase
    .from('sc_exercise_records')
    .insert(exerciseRecords)

  if (recordsError) throw recordsError

  // Update personal records
  await updatePersonalRecords(userId, exercises)

  return strengthSession
}

/**
 * Update personal records based on new session
 */
async function updatePersonalRecords(userId, exercises) {
  for (const exercise of exercises) {
    const bestSet = exercise.sets.reduce((best, set) => {
      const volume = (set.weight || 0) * set.reps
      const bestVolume = (best.weight || 0) * best.reps
      return volume > bestVolume ? set : best
    }, exercise.sets[0])

    const { error } = await supabase
      .from('sc_personal_records')
      .upsert({
        user_id: userId,
        exercise_name: exercise.name,
        best_weight: bestSet.weight,
        best_reps: bestSet.reps,
        best_volume: (bestSet.weight || 0) * bestSet.reps,
        achieved_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,exercise_name'
      })

    if (error) {
      console.error('Error updating personal record:', error)
    }
  }
}
