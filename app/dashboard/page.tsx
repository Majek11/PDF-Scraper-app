"use client"

import { useState } from "react"
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
          <Button onClick={() => (window.location.href = "/upload")} className="bg-black text-white hover:bg-black/90">Upload PDF</Button>
        </div>

        {resumes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 font-medium">No resumes yet</p>
              <p className="mb-4 text-sm text-muted-foreground">Upload your first PDF to get started</p>
              <Button onClick={() => (window.location.href = "/upload")} className="bg-black text-white hover:bg-black/90">Upload PDF</Button>
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
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Data</DialogTitle>
            <DialogDescription>Extracted data from {selectedResume?.fileName}</DialogDescription>
          </DialogHeader>

          {selectedResume && (
            <div className="space-y-6">
              {/* Pretty Card Preview */}
              <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {selectedResume.extractedData?.profile?.name} {selectedResume.extractedData?.profile?.surname}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedResume.extractedData?.profile?.headline}</p>
                  <p className="text-xs text-muted-foreground">{selectedResume.extractedData?.profile?.email}</p>
                </div>
              </div>

              {/* JSON View */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold">Structured Data</h4>
                  <Button variant="outline" size="sm" onClick={() => handleExportJSON(selectedResume)}>
                    Export JSON
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs">
                  {JSON.stringify(selectedResume.extractedData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the resume and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
