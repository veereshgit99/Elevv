// components/resume-upload.tsx

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getResumeUploadUrl } from '@/utils/api'  // Import the API function
import { useSession } from 'next-auth/react'

interface ResumeUploadProps {
    onUploadSuccess?: () => void
    onUploadError?: (error: string) => void
}

export function ResumeUpload({ onUploadSuccess, onUploadError }: ResumeUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [jobTitle, setJobTitle] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { data: session } = useSession()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            if (!allowedTypes.includes(file.type)) {
                setErrorMessage('Please upload a PDF or Word document')
                setUploadStatus('error')
                return
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrorMessage('File size must be less than 10MB')
                setUploadStatus('error')
                return
            }

            setSelectedFile(file)
            setUploadStatus('idle')
            setErrorMessage('')
        }
    }

    const uploadToS3 = async (url: string, formFields: Record<string, string>, file: File) => {
        const formData = new FormData()

        // Add all the form fields from the presigned URL
        Object.entries(formFields).forEach(([key, value]) => {
            formData.append(key, value)
        })

        // Add the file last (important for S3)
        formData.append('file', file)

        // Upload directly to S3
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const text = await response.text()
            console.error('S3 Response:', text)
            throw new Error(`Failed to upload file to S3: ${response.status}`)
        }
    }

    const handleUpload = async () => {
        // Validate both file and job title
        if (!selectedFile) {
            setErrorMessage('Please select a file')
            setUploadStatus('error')
            return
        }

        if (!jobTitle.trim()) {
            setErrorMessage('Please enter a job title')
            setUploadStatus('error')
            return
        }

        setUploading(true)
        setUploadStatus('uploading')
        setUploadProgress(0)

        try {
            // Check for session token
            if (!session?.accessToken) {
                throw new Error('Authentication required. Please sign in again.')
            }

            // Step 1: Get presigned URL using the API function
            setUploadProgress(10)

            console.log('Getting upload URL for:', {
                filename: selectedFile.name,
                contentType: selectedFile.type,
                jobTitle: jobTitle.trim()
            })

            const token = session.accessToken as string
            const uploadData = await getResumeUploadUrl(
                token,
                selectedFile.name,
                selectedFile.type,
                jobTitle.trim()
            )

            const { resume_id, s3_upload_url, s3_form_fields } = uploadData

            // Step 2: Upload file directly to S3
            setUploadProgress(50)
            await uploadToS3(s3_upload_url, s3_form_fields, selectedFile)

            // Step 3: Complete
            setUploadProgress(100)
            setUploadStatus('success')

            console.log('Resume uploaded successfully with ID:', resume_id)

            // Reset after success
            setTimeout(() => {
                setSelectedFile(null)
                setJobTitle('')
                setUploadStatus('idle')
                setUploadProgress(0)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                onUploadSuccess?.()
            }, 2000)

        } catch (error) {
            console.error('Upload error:', error)
            setUploadStatus('error')
            setErrorMessage(error instanceof Error ? error.message : 'Failed to upload resume')
            onUploadError?.(error instanceof Error ? error.message : 'Failed to upload resume')
        } finally {
            setUploading(false)
        }
    }

    const removeFile = () => {
        setSelectedFile(null)
        setUploadStatus('idle')
        setErrorMessage('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const resetForm = () => {
        removeFile()
        setJobTitle('')
    }

    return (
        <div className="w-full space-y-6">
            {/* Job Title Input Field */}
            <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">
                    Job Title <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="jobTitle"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer, Product Manager, Data Analyst"
                    className="w-full"
                    disabled={uploading}
                    required
                />
                <p className="text-xs text-gray-500">
                    This helps categorize your resume and improves matching accuracy
                </p>
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                />

                {!selectedFile ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer"
                    >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                            Drop your resume here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                            Supported formats: PDF, DOC, DOCX (max 10MB)
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                            <FileText className="w-8 h-8 text-black" />
                            <div className="text-left">
                                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            {!uploading && (
                                <button
                                    onClick={removeFile}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            )}
                        </div>

                        {uploadStatus === 'uploading' && (
                            <div className="w-full">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="flex items-center justify-center space-x-2 text-blue-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Upload successful!</span>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center space-x-2 text-red-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm">{errorMessage}</span>
                                </div>
                                <Button
                                    onClick={resetForm}
                                    variant="outline"
                                    size="sm"
                                    className="mx-auto"
                                >
                                    Try Again
                                </Button>
                            </div>
                        )}

                        {uploadStatus === 'idle' && (
                            <Button
                                onClick={handleUpload}
                                disabled={uploading || !jobTitle.trim()}
                                className="w-full bg-black hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {!jobTitle.trim() ? 'Enter Job Title to Upload' : 'Upload Resume'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}