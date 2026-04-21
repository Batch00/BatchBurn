'use server'
import { revalidatePath } from 'next/cache'

export async function revalidateDashboard() {
  revalidatePath('/dashboard')
}

export async function revalidateHistory() {
  revalidatePath('/history')
}

export async function revalidateAll() {
  revalidatePath('/dashboard')
  revalidatePath('/history')
  revalidatePath('/analytics')
  revalidatePath('/races')
  revalidatePath('/shoes')
  revalidatePath('/goals')
}
