"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/utils/api";

interface FeedbackModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function FeedbackModal({ isOpen, onOpenChange }: FeedbackModalProps) {
    const { data: session } = useSession();
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            setError("Feedback cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await submitFeedback(feedback, session?.user?.email || undefined);
            setSuccess(true);
            setFeedback(""); // Clear the form
            setTimeout(() => {
                onOpenChange(false); // Close modal after a delay
                setSuccess(false); // Reset for next time
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submit Feedback</DialogTitle>
                    <DialogDescription>
                        Have a suggestion or found a bug? We'd love to hear from you.
                    </DialogDescription>
                </DialogHeader>
                {success ? (
                    <div className="text-center py-8">
                        <p className="text-lg font-medium text-blue-600">Thank you for your feedback!</p>
                    </div>
                ) : (
                    <div className="py-4">
                        <Textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Tell us what you think..."
                            rows={6}
                        />
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    </div>
                )}
                <DialogFooter>
                    {!success && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}