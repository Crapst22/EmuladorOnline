import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-pixel text-[0.625rem] tracking-wider uppercase transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'retro-btn',
        destructive: 'retro-btn retro-btn-danger',
        outline: 'bg-transparent border-2 border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/60 shadow-none',
        secondary: 'retro-btn retro-btn-secondary',
        ghost: 'bg-transparent text-[#FFD700]/60 hover:text-[#FFD700] hover:bg-[#FFD700]/5 border-none shadow-none',
        link: 'text-[#FFD700] underline-offset-4 hover:underline hover:text-[#FFE44D]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-[0.5rem]',
        lg: 'h-12 px-8 text-[0.75rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
