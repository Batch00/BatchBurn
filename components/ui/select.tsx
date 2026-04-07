import * as React from 'react'
import { cn } from '@/lib/utils'

function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'h-8 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-white',
        'focus:outline-none focus:border-[#C41230] focus:ring-2 focus:ring-[#C41230]/20',
        '[&>option]:bg-[#161B22] [&>option]:text-white',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
