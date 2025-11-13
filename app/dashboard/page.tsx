"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Download, Eye, Trash2, FileText, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ResumeData } from "@/lib/validations"
import { Skeleton } from "@/components/ui/skeleton"

interface Resume {
  id: string
  fileName: string
  fileSize: number
  fileUrl: string
  extractedData: ResumeData
  status: string
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const router = useRouter()
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { data: resumes, error, mutate } = useSWR<Resume[]>("/api/resumes", fetcher)
  const { toast } = useToast()

  const handleDownload = async (resumeId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/resume/${resumeId}/download`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      // Open signed URL in new tab
      window.open(data.url, "_blank")
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const handleExportJSON = (resume: Resume) => {
    const dataStr = JSON.stringify(resume.extractedData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${resume.fileName.replace(".pdf", "")}-data.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exported",
      description: "JSON data downloaded successfully",
    })
  }

  const handleExportPDF = async (resume: Resume) => {
    try {
      // Import jsPDF dynamically (client-side only)
      const { default: jsPDF } = await import("jspdf")
      const doc = new jsPDF()
      
      const data = resume.extractedData
      let y = 20
      const lineHeight = 7
      const pageHeight = doc.internal.pageSize.height
      
      // Helper to add text with page break
      const addText = (text: string, fontSize = 10, isBold = false) => {
        if (y > pageHeight - 20) {
          doc.addPage()
          y = 20
        }
        doc.setFontSize(fontSize)
        if (isBold) doc.setFont("helvetica", "bold")
        else doc.setFont("helvetica", "normal")
        
        const lines = doc.splitTextToSize(text, 170)
        doc.text(lines, 20, y)
        y += lineHeight * lines.length
      }
      
      // Title
      addText(`Resume: ${data.profile?.name || ""} ${data.profile?.surname || ""}`, 16, true)
      y += 5
      
      // Profile
      if (data.profile) {
        addText("PROFILE", 14, true)
        if (data.profile.headline) addText(`Headline: ${data.profile.headline}`)
        if (data.profile.email) addText(`Email: ${data.profile.email}`)
        if (data.profile.linkedIn) addText(`LinkedIn: ${data.profile.linkedIn}`)
        if (data.profile.professionalSummary) addText(`Summary: ${data.profile.professionalSummary}`)
        y += 5
      }
      
      // Work Experience
      if (data.workExperiences?.length) {
        addText("WORK EXPERIENCE", 14, true)
        data.workExperiences.forEach((exp) => {
          addText(`${exp.jobTitle} at ${exp.company}`, 11, true)
          if (exp.description) addText(exp.description)
          y += 3
        })
        y += 5
      }
      
      // Education
      if (data.educations?.length) {
        addText("EDUCATION", 14, true)
        data.educations.forEach((edu) => {
          addText(`${edu.degree || ""} - ${edu.school}`, 11, true)
          if (edu.major) addText(`Major: ${edu.major}`)
          y += 3
        })
        y += 5
      }
      
      // Skills
      if (data.skills?.length) {
        addText("SKILLS", 14, true)
        addText(data.skills.join(", "))
        y += 5
      }
      
      // Save PDF
      doc.save(`${resume.fileName.replace(".pdf", "")}-structured.pdf`)
      
      toast({
        title: "Exported",
        description: "PDF downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteResumeId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/resume/${deleteResumeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: "Deleted",
        description: "Resume deleted successfully",
      })

      mutate()
      setDeleteResumeId(null)
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Failed to load resumes</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!resumes) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="container mx-auto px-4 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="h-8 w-48"><Skeleton className="h-8 w-48" /></div>
              <div className="mt-2 h-4 w-80"><Skeleton className="h-4 w-80" /></div>
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          <Card>
            <CardHeader>
              <div className="h-6 w-40"><Skeleton className="h-6 w-40" /></div>
              <div className="mt-2 h-4 w-60"><Skeleton className="h-4 w-60" /></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 items-center">
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">View and manage your uploaded PDFs</p>
          </div>
          <Button onClick={() => router.push("/upload")} className="bg-black text-white hover:bg-black/90">Upload PDF</Button>
        </div>

        {resumes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 font-medium">No resumes yet</p>
              <p className="mb-4 text-sm text-muted-foreground">Upload your first PDF to get started</p>
              <Button onClick={() => router.push("/upload")} className="bg-black text-white hover:bg-black/90">Upload PDF</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Resumes</CardTitle>
              <CardDescription>
                {resumes.length} {resumes.length === 1 ? "file" : "files"} uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Headline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumes.map((resume) => (
                      <TableRow key={resume.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {resume.fileName}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {resume.extractedData?.profile?.name} {resume.extractedData?.profile?.surname}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{resume.extractedData?.profile?.headline}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-accent"
                              onClick={() => handleDownload(resume.id, resume.fileName)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-accent"
                              onClick={() => setSelectedResume(resume)}
                              title="View Data"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-accent text-destructive"
                              onClick={() => setDeleteResumeId(resume.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* View Resume Dialog */}
      <Dialog open={!!selectedResume} onOpenChange={() => setSelectedResume(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto bg-black text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Document Data</DialogTitle>
            <DialogDescription className="text-gray-400">Extracted data from {selectedResume?.fileName}</DialogDescription>
          </DialogHeader>

          {selectedResume && (
            <div className="space-y-6">
              {/* Pretty Card Preview */}
              <div className="flex items-start gap-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">
                    {selectedResume.extractedData?.profile?.name} {selectedResume.extractedData?.profile?.surname}
                  </p>
                  <p className="text-sm text-gray-400">{selectedResume.extractedData?.profile?.headline}</p>
                  <p className="text-xs text-gray-500">{selectedResume.extractedData?.profile?.email}</p>
                </div>
              </div>

              {/* Structured Data Section with Actions */}
              <div>
                <div className="space-y-3 mb-3">
                  <div className="flex flex-wrap justify-start gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExportJSON(selectedResume)} 
                      className="bg-gray-900 text-white border-gray-700 hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Export JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExportPDF(selectedResume)} 
                      className="bg-gray-900 text-white border-gray-700 hover:bg-gray-800 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" /> Download PDF
                    </Button>
                  </div>
                  <h4 className="font-semibold text-white">Structured Data</h4>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-300">
                  {JSON.stringify(selectedResume.extractedData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent className="max-w-md rounded-xl border border-gray-800 bg-black text-white shadow-2xl">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-white">Delete this resume?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-400">
              {`“${resumes?.find(r => r.id === deleteResumeId)?.fileName || "this file"}” will be permanently removed. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel disabled={isDeleting} className="border-gray-800 bg-transparent text-gray-300 hover:bg-gray-900">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-600/90 focus:ring-2 focus:ring-red-600"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
