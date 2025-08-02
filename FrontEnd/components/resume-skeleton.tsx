// components/resume-skeleton.tsx

import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"

export function ResumeSkeleton() {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-900">Resume</th>
                                <th className="text-center p-4 font-medium text-gray-900">Job Title</th>
                                <th className="text-left p-4 font-medium text-gray-900">Created</th>
                                <th className="w-20 p-4"></th>
                            </tr>
                            <tr>
                                <td colSpan={4} className="px-4 py-2 bg-blue-50 border-b">
                                    <div className="flex items-center space-x-2 text-sm text-blue-800">
                                        <Info className="w-4 h-4 flex-shrink-0" />
                                        <span>You can upload and manage a maximum of 5 resumes.</span>
                                    </div>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Create 3 skeleton rows to show a loading state */}
                            {[...Array(3)].map((_, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            {/* Resume name skeleton */}
                                            <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
                                            {/* Primary badge skeleton (show only on first row) */}
                                            {index === 0 && (
                                                <div className="animate-pulse h-5 w-12 bg-gray-200 rounded-full"></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {/* Job title skeleton - centered */}
                                        <div className="flex justify-center">
                                            <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3"></div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {/* Created date skeleton */}
                                        <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
                                    </td>
                                    <td className="p-4">
                                        {/* Actions menu skeleton */}
                                        <div className="flex justify-center">
                                            <div className="animate-pulse h-6 w-6 bg-gray-200 rounded"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}