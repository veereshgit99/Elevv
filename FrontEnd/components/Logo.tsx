import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
    variant?: 'light' | 'dark'
    size?: 'sm' | 'md' | 'lg'
    showText?: boolean
    href?: string
    className?: string
}

const Logo = ({
    variant = 'dark',
    size = 'md',
    showText = true,
    href = '/',
    className
}: LogoProps) => {
    // Size configurations
    const sizeConfig = {
        sm: {
            logo: 'h-6 w-6',
            text: 'text-lg font-bold',
            container: 'gap-2'
        },
        md: {
            logo: 'h-8 w-8',
            text: 'text-xl font-bold',
            container: 'gap-2'
        },
        lg: {
            logo: 'h-10 w-10',
            text: 'text-2xl font-bold',
            container: 'gap-3'
        }
    }

    // Logo source based on variant
    const logoSrc = variant === 'light'
        ? '/logos/logo-standard.svg'  // For white backgrounds
        : '/logos/logo-reversed.svg'  // For black backgrounds

    // Text color based on variant
    const textColor = variant === 'light'
        ? 'text-black'
        : 'text-white'

    const config = sizeConfig[size]

    const LogoContent = () => (
        <div className={cn(
            'flex items-center',
            config.container,
            className
        )}>
            <Image
                src={logoSrc}
                alt="Elevv Logo"
                width={32}
                height={32}
                className={config.logo}
                priority
            />
            {showText && (
                <span className={cn(config.text, textColor)}>
                    ELEVV
                </span>
            )}
        </div>
    )

    // If href is provided, wrap in Link
    if (href) {
        return (
            <Link href={href} className="flex items-center">
                <LogoContent />
            </Link>
        )
    }

    // Otherwise return just the logo
    return <LogoContent />
}

export default Logo
