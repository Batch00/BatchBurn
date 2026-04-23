const CROSS_TRAINING_TYPE_MAP: Record<string, string> = {
  Walk: 'Walk',
  Ride: 'Bike',
  VirtualRide: 'Bike',
  EBikeRide: 'Bike',
  StairStepper: 'Stair Master',
  WeightTraining: 'Strength',
  Swim: 'Swim',
  Yoga: 'Yoga',
}

export function mapStravaActivity(
  activity: Record<string, unknown>,
  userId: string
): { table: 'runs' | 'cross_training'; record: Record<string, unknown> } {
  // Strava returns both sport_type (newer) and type (legacy) — prefer sport_type
  const sportType = ((activity.sport_type as string) || (activity.type as string) || '').trim()
  const distance = (activity.distance as number) ?? 0
  const movingTime = (activity.moving_time as number) ?? 0
  const date = (activity.start_date_local as string)?.slice(0, 10)
  const notes = (activity.name as string) ?? ''
  const stravaActivityId = String(activity.id)

  const base: Record<string, unknown> = {
    user_id: userId,
    strava_activity_id: stravaActivityId,
    source: 'strava',
    notes,
    date,
    duration_seconds: movingTime,
  }

  if (sportType === 'Run') {
    const distanceMiles = distance / 1609.34
    const distanceKm = distance / 1000
    return {
      table: 'runs',
      record: {
        ...base,
        distance_miles: distanceMiles,
        distance_km: distanceKm,
        pace_per_mile_seconds: distanceMiles > 0 ? movingTime / distanceMiles : null,
        run_type: 'Easy',
      },
    }
  }

  const activityType = CROSS_TRAINING_TYPE_MAP[sportType] ?? 'Other'
  const crossRecord: Record<string, unknown> = { ...base, activity_type: activityType }

  if (distance > 0) {
    crossRecord.distance_miles = distance / 1609.34
    crossRecord.distance_km = distance / 1000
  }

  return { table: 'cross_training', record: crossRecord }
}
