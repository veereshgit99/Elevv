"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

// Reusable Floating Input component (from your signup page)
function FloatingInput({
    id,
    type = "text",
    label,
    value,
    onChange,
    autoComplete,
    required = false,
}: {
    id: string
    type?: string
    label: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    autoComplete?: string
    required?: boolean
}) {
    return (
        <div className="relative">
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder=" "
                required={required}
                className="peer w-full h-12 rounded-2xl border bg-white px-4 text-[15px] text-gray-900 shadow-sm transition-all outline-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            <label
                htmlFor={id}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 px-1 text-[15px] transition-all bg-white text-gray-500 peer-focus:text-blue-600 peer-[&:not(:placeholder-shown)]:text-gray-500 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs"
            >
                {label}
            </label>
        </div>
    )
}

// Reusable Floating Textarea (styled to match)
function FloatingTextarea({
    id,
    label,
    value,
    onChange,
    required = false,
    rows = 6,
}: {
    id: string
    label: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    required?: boolean
    rows?: number
}) {
    return (
        <div className="relative">
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                placeholder=" "
                required={required}
                rows={rows}
                className="peer w-full rounded-2xl border bg-white p-4 text-[15px] text-gray-900 shadow-sm transition-all outline-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
            <label
                htmlFor={id}
                className="pointer-events-none absolute left-3 top-5 -translate-y-1/2 px-1 text-[15px] transition-all bg-white text-gray-500 peer-focus:text-blue-600 peer-[&:not(:placeholder-shown)]:text-gray-500 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs"
            >
                {label}
            </label>
        </div>
    )
}

export default function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        const data = { name, email, message };

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong.');
            }
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Logo variant="light" size="md" showText={true} className="font-bold text-xl" />
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Log In</Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-gray-900 hover:bg-gray-800">Sign Up</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-16 sm:py-24">
                <div className="max-w-xl mx-auto">
                    {/* Headline Section */}
                    <section className="text-center mb-12">
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                            Get in Touch
                        </h1>
                        <p className="mt-4 text-lg text-gray-600">
                            Have a question or feedback? We'd love to hear from you.
                        </p>
                    </section>

                    {/* Form Section */}
                    {status === 'success' ? (
                        <div className="text-center p-8 bg-blue-50 border border-blue-200 rounded-lg">
                            <h2 className="text-2xl font-bold text-blue-800">Thank You!</h2>
                            <p className="mt-2 text-gray-600">Your message has been sent successfully. We'll get back to you shortly.</p>
                        </div>
                    ) : (
                        <section>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <FloatingInput
                                    id="name"
                                    label="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="name"
                                    required
                                />
                                <FloatingInput
                                    id="email"
                                    type="email"
                                    label="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                                <FloatingTextarea
                                    id="message"
                                    label="Message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                                <div>
                                    <Button
                                        type="submit"
                                        disabled={!name || !email || !message}
                                        className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {status === 'submitting' ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </div>
                                {status === 'error' && <p className="text-sm text-red-500 mt-2 text-center">{errorMessage}</p>}
                            </form>
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}