import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white',
        'placeholder:text-white/30 resize-none',
        'focus:outline-none focus:border-[#C41230] focus:ring-2 focus:ring-[#C41230]/20',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
