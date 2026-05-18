const CROSS_TRAINING_TYPE_MAP: Record<string, string> = {
  Walk: 'Walk',
  Ride: 'Bike',
  VirtualRide: 'Bike',
  EBikeRide: 'Bike',
  StairStepper: 'Stair Master',
  WeightTraining: 'Strength',
  Swim: 'Swim',
  Yoga: 'Yoga',
  Hike: 'Hiking',
  Soccer: 'Soccer',
  Tennis: 'Tennis',
  Pickleball: 'Pickleball',
  Basketball: 'Basketball',
  Elliptical: 'Elliptical',
  Rowing: 'Rowing',
  RockClimbing: 'Climbing',
}

export function mapStravaActivity(
  activity: Record<string, unknown>,
  userId: string,
  primaryShoeId?: string | null
): { table: 'runs' | 'cross_training'; record: Record<string, unknown> } {
  // Strava returns both sport_type (newer) and type (legacy) — prefer sport_type
  const sportType = ((activity.sport_type as string) || (activity.type as string) || '').trim()
  const distance = (activity.distance as number) ?? 0
  const movingTime = (activity.moving_time as number) ?? 0
  const date = (activity.start_date_local as string)?.slice(0, 10)
  const notes = (activity.name as string) ?? ''
  const stravaActivityId = Number(activity.id)

  const elevationGain = activity.total_elevation_gain as number | undefined
  const hasHeartrate = activity.has_heartrate as boolean | undefined
  const avgHr = activity.average_heartrate as number | undefined
  const maxHr = activity.max_heartrate as number | undefined
  const map = activity.map as { summary_polyline?: string } | undefined
  const polyline = map?.summary_polyline && map.summary_polyline.length > 0 ? map.summary_polyline : null

  const extras: Record<string, unknown> = {}
  if (elevationGain != null) extras.elevation_gain_m = elevationGain
  if (hasHeartrate && avgHr != null) extras.heart_rate_avg = Math.round(avgHr)
  if (hasHeartrate && maxHr != null) extras.heart_rate_max = Math.round(maxHr)
  if (polyline) extras.map_polyline = polyline

  const base: Record<string, unknown> = {
    user_id: userId,
    strava_activity_id: stravaActivityId,
    source: 'strava',
    notes,
    date,
    duration_seconds: movingTime,
    ...extras,
  }

  if (sportType === 'Run') {
    const distanceMiles = distance / 1609.34
    const distanceKm = distance / 1000
    const avgCadence = activity.average_cadence as number | undefined
    return {
      table: 'runs',
      record: {
        ...base,
        distance_miles: distanceMiles,
        distance_km: distanceKm,
        pace_per_mile_seconds: distanceMiles > 0 ? Math.round(movingTime / distanceMiles) : null,
        run_type: 'Easy',
        ...(avgCadence != null ? { cadence_avg: avgCadence } : {}),
        ...(primaryShoeId ? { shoe_id: primaryShoeId } : {}),
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
