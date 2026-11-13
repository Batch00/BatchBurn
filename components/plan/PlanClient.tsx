'use client'

import { useState } from 'react'
import { WeekPlan } from './WeekPlan'
import { RoutinesManager } from './RoutinesManager'

export function PlanClient({ userId, isDemoUser }: { userId: string; isDemoUser: boolean }) {
  // Bumped when routines change so the week view regenerates and reloads.
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <>
      <WeekPlan userId={userId} isDemoUser={isDemoUser} variant="page" reloadKey={reloadKey} />
      <RoutinesManager
        userId={userId}
        isDemoUser={isDemoUser}
        onChange={() => setReloadKey((k) => k + 1)}
      />
    </>
  )
}
