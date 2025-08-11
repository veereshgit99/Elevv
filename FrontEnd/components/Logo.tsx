import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
    variant?: "light" | "dark"
    size?: "sm" | "md" | "lg"
    showText?: boolean
    href?: string            // where the logo should go when clicked
    className?: string
}

const Logo = ({
    variant = "dark",
    size = "md",
    showText = true,
    href = "/",              // default: home (change to "/dashboard" if you prefer)
    className
}: LogoProps) => {
    const pathname = usePathname()

    const sizeConfig = {
        sm: { logo: "h-6 w-6", text: "text-lg font-bold", container: "gap-2" },
        md: { logo: "h-8 w-8", text: "text-xl font-bold", container: "gap-2" },
        lg: { logo: "h-10 w-10", text: "text-2xl font-bold", container: "gap-3" },
    } as const

    const logoSrc =
        variant === "light" ? "/logos/logo-standard.svg" : "/logos/logo-reversed.svg"

    const textColor = variant === "light" ? "text-black" : "text-white"
    const config = sizeConfig[size]

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // Prevent navigation (and the blink) if we’re already on the target route
        if (!href || pathname === href) {
            e.preventDefault()
        }
    }

    const Content = (
        <div
            className={cn(
                "flex items-center select-none",
                "transition-transform duration-100 will-change-transform",
                "group-hover:scale-[0.98] active:scale-[0.97]",
                config.container,
                className
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <Image
                src={logoSrc}
                alt="Elevv Logo"
                width={32}
                height={32}
                className={cn(config.logo, "pointer-events-none")}
                priority
            />
            {showText && <span className={cn(config.text, textColor)}>ELEVV</span>}
        </div>
    )

    // Clickable version
    if (href) {
        return (
            <Link
                href={href}
                onClick={handleClick}
                prefetch
                aria-label="Go to home"
                className="group inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
            >
                {Content}
            </Link>
        )
    }

    // Non-clickable fallback
    return Content
}

export default Logo
