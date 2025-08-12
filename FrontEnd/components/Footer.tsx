"use client"

import Link from "next/link"
import Logo from "./Logo"
import { LinkedInIcon } from "./icons/LinkedInIcon"
import { TwitterIcon } from "./icons/TwitterIcon"

// Import the new CSS file
import "@/styles/social-icons.css"

const socialLinks = [
    {
        name: 'LinkedIn',
        href: 'https://www.linkedin.com/in/veereshkoliwad/',
        icon: LinkedInIcon,
        className: 'linkedin'
    },
    {
        name: 'Twitter',
        href: 'https://x.com/veeresh_koliwad',
        icon: TwitterIcon,
        className: 'twitter'
    },
];

export default function Footer() {
    return (
        <footer className="bg-black text-gray-400 border-t border-gray-800">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center md:items-start gap-4">
                    <Logo variant="dark" size="md" showText={true} className="font-bold text-xl" />
                    <div className="flex items-center gap-4">
                        {socialLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={link.name}
                                className={`social-icon ${link.className}`}
                            >
                                <link.icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>
                {/* Copyright and Navigation Links on the same row */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-4">
                    <p className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Elevv. All rights reserved.
                    </p>
                    <nav className="flex items-center gap-6 mt-2 md:mt-0">
                        <Link href="/features" className="text-sm hover:text-white transition-colors">
                            Features
                        </Link>
                        <Link href="/about" className="text-sm hover:text-white transition-colors">
                            About
                        </Link>
                        <Link href="/contact" className="text-sm hover:text-white transition-colors">
                            Contact
                        </Link>
                        <Link href="/terms" className="text-sm hover:text-white transition-colors">
                            Terms
                        </Link>
                        <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                            Privacy
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    )
}