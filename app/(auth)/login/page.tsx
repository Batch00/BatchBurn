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

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  async function handleDemo() {
    setError(null)
    setDemoLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@batchburn.app',
      password: 'demo1234',
    })

    if (error) {
      setError('Demo account is unavailable. Please try again later.')
      setDemoLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#00D4AA]">
            BatchBurn
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-white/60">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#00D4AA] focus-visible:ring-[#00D4AA]/20"
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
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#00D4AA] focus-visible:ring-[#00D4AA]/20"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#00D4AA] font-semibold text-[#0D1117] hover:bg-[#00D4AA]/90 disabled:opacity-50"
            size="lg"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full border-white/20 text-white/70 hover:bg-white/5"
            size="lg"
          >
            {demoLoading ? 'Loading demo...' : 'Try Demo'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-white/50">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#00D4AA] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
