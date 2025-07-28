// components/resume-upload.tsx

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/utils/api'

interface ResumeUploadProps {
    onUploadSuccess?: () => void
    onUploadError?: (error: string) => void
}

export function ResumeUpload({ onUploadSuccess, onUploadError }: ResumeUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

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

        // Log what we're sending
        console.log('S3 Upload URL:', url)
        console.log('Form Fields:', formFields)

        // Add all the form fields from the presigned URL
        Object.entries(formFields).forEach(([key, value]) => {
            formData.append(key, value)
        })

        // Add the file last (important for S3)
        formData.append('file', file)

        // Log FormData contents
        for (let [key, value] of formData.entries()) {
            console.log(key, value)
        }

        // Upload directly to S3
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const text = await response.text()
            console.error('S3 Response:', text)
            throw new Error(`Failed to upload file to S3: ${response.status} ${text}`)
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)
        setUploadStatus('uploading')
        setUploadProgress(0)

        try {
            // Step 1: Get presigned URL from your backend
            setUploadProgress(10)

            // Create FormData with the file
            const formData = new FormData()
            formData.append('file', selectedFile)

            const presignedResponse = await authenticatedFetch('http://localhost:8001/resumes/upload-url', {
                method: 'POST',
                body: formData,
            })

            if (!presignedResponse.ok) {
                const error = await presignedResponse.text()
                throw new Error(error || 'Failed to get upload URL')
            }

            const { resume_id, s3_upload_url, s3_form_fields } = await presignedResponse.json()

            // Step 2: Upload file directly to S3
            setUploadProgress(50)
            await uploadToS3(s3_upload_url, s3_form_fields, selectedFile)

            // Step 3: Notify backend that upload is complete (if you have this endpoint)
            setUploadProgress(90)
            // Note: You might need to add this endpoint to your backend
            //await authenticatedFetch(`http://localhost:8001/resumes/${resume_id}/confirm-upload`, {
            //    method: 'POST',
            //})

            setUploadProgress(100)
            setUploadStatus('success')

            // Reset after success
            setTimeout(() => {
                setSelectedFile(null)
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

    return (
        <div className="w-full">
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
                            <FileText className="w-8 h-8 text-[#FF5722]" />
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
                                        className="bg-[#FF5722] h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="flex items-center justify-center space-x-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Upload successful!</span>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="flex items-center justify-center space-x-2 text-red-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm">{errorMessage}</span>
                            </div>
                        )}

                        {uploadStatus === 'idle' && (
                            <Button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white"
                            >
                                Upload Resume
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}