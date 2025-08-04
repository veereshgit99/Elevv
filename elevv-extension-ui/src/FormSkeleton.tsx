import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function FormSkeleton() {
    return (
        <motion.div
            key="skeleton"
            className="form-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Parsing Job Details message */}
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing Job Details...</span>
            </div>

            {/* Job Title Skeleton */}
            <div className="form-group">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Company Name Skeleton */}
            <div className="form-group">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Job Description Skeleton */}
            <div className="form-group">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-32 w-full" />
            </div>

            {/* Resume Select Skeleton */}
            <div className="form-group">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
        </motion.div>
    )
}
