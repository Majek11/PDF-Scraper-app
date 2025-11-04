"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Nav } from "@/components/nav"
import { Upload, FileText, X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle")
  const router = useRouter()
  const { toast } = useToast()

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]

    if (!selectedFile) return

    if (selectedFile.type !== "application/pdf") {
      toast({ title: "Invalid file type", description: "Please upload a PDF file", variant: "destructive" })
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" })
      return
    }

    setFile(selectedFile)
    setUploadStatus("idle")
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isUploading,
  })

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("/api/upload", { method: "POST", body: formData })

      clearInterval(progressInterval)

      if (!response.ok) {
        let message = "Upload failed"
        try {
          const payload = await response.json()
          if (payload?.error) {
            message = payload.error + (payload.details ? `: ${payload.details}` : "")
          }
        } catch {}
        throw new Error(message)
      }

      const data = await response.json()

      setUploadProgress(100)
      setUploadStatus("processing")

      // Poll for extraction completion
      let attempts = 0
      const maxAttempts = 30 // ~30 seconds

      const checkStatus = async () => {
        const statusResponse = await fetch(`/api/resume/${data.resumeId}`)
        const statusData = await statusResponse.json()

        if (statusData.status === "completed") {
          setUploadStatus("success")
          toast({ title: "Success!", description: "PDF data extracted successfully" })
          setTimeout(() => { router.push("/dashboard") }, 1500)
        } else if (statusData.status === "failed") {
          throw new Error("Extraction failed")
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkStatus, 1000)
        } else {
          throw new Error("Extraction timeout")
        }
      }

      await checkStatus()
    } catch (error) {
      console.error("[UPLOAD_ERROR]", error)
      setUploadStatus("error")
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Something went wrong", variant: "destructive" })
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
    setUploadStatus("idle")
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upload PDF</h1>
          <p className="mt-2 text-muted-foreground">Upload a PDF to extract structured data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>PDF files up to 10MB. Supports both text and image-based PDFs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!file ? (
              <div
                {...getRootProps()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50",
                )}
              >
                <input {...getInputProps()} />
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-center font-medium">
                  {isDragActive ? "Drop the file here" : "Drag & drop a PDF here"}
                </p>
                <p className="text-center text-sm text-muted-foreground">or click to browse</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {uploadStatus === "idle" && (
                    <Button variant="ghost" size="icon" onClick={removeFile} disabled={isUploading}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadStatus === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {uploadStatus === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>

                {(uploadStatus === "uploading" || uploadStatus === "processing") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {uploadStatus === "uploading" ? "Uploading..." : "Extracting data..."}
                      </span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {uploadStatus === "success" && (
                  <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-500">
                    PDF processed successfully! Redirecting to dashboard...
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to process PDF. Please try again.
                  </div>
                )}

                {uploadStatus === "idle" && (
                  <Button onClick={handleUpload} className="w-full bg-black text-white hover:bg-black/90" disabled={isUploading}>
                    Upload and Extract Data
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">What data will be extracted?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Personal information (name, email, phone, location)</li>
            <li>• Professional headline and summary</li>
            <li>• Work experience with dates and descriptions</li>
            <li>• Education history</li>
            <li>• Skills and competencies</li>
            <li>• Languages and proficiency levels</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
