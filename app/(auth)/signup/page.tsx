'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signupSchema = z
  .object({
    inviteCode: z.string().min(1, 'Invite code is required'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(data: SignupForm) {
    setError(null)
    const supabase = createClient()

    // 1. Validate invite code
    const { data: invite, error: inviteError } = await supabase
      .schema('batchburn')
      .from('invites')
      .select('id')
      .eq('code', data.inviteCode)
      .is('used_at', null)
      .single()

    if (inviteError || !invite) {
      setError('Invalid or already used invite code')
      return
    }

    // 2. Sign up user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Something went wrong. Please try again.')
      return
    }

    // 3. Mark invite as used
    await supabase
      .schema('batchburn')
      .from('invites')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // 4. Create profile
    await supabase
      .schema('batchburn')
      .from('profiles')
      .insert({ user_id: userId, email: data.email })

    router.push('/dashboard')
  }

  const inputClassName =
    'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#C41230]">
            BatchBurn
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="text-sm text-white/60">
              Invite Code
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="Enter your invite code"
              className={inputClassName}
              {...register('inviteCode')}
            />
            {errors.inviteCode && (
              <p className="text-sm text-red-400">{errors.inviteCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-white/60">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={inputClassName}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-white/60">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={inputClassName}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-white/60">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className={inputClassName}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#C41230] font-semibold text-white hover:bg-[#A10F29] disabled:opacity-50"
            size="lg"
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C41230] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
