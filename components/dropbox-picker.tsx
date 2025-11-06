"use client"

import * as React from "react"
import { Check, FileText, Image as ImageIcon, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DropboxFile {
  id: string
  name: string
  path_display: string
  size: number
  client_modified: string
}

interface DropboxPickerProps {
  tokens: any
  onFilesSelected: (files: DropboxFile[]) => void
  onCancel: () => void
}

export function DropboxPicker({ tokens, onFilesSelected, onCancel }: DropboxPickerProps) {
  const [files, setFiles] = React.useState<DropboxFile[]>([])
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/dropbox/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch files')
        }

        const data = await response.json()
        setFiles(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load files')
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [tokens])

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleConfirm = () => {
    const selected = files.filter(file => selectedFiles.has(file.id))
    onFilesSelected(selected)
  }

  // Filter files based on search query
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return files
    return files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [files, searchQuery])

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    if (/\.(jpg|jpeg|png)$/i.test(name)) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    }
    return <FileText className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-400">
          {error}
        </div>
        <Button variant="outline" onClick={onCancel} className="w-full">
          Go Back
        </Button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No PDF or image files found in your Dropbox</p>
        </div>
        <Button variant="outline" onClick={onCancel} className="w-full">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredFiles.length} of {files.length} files
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScrollArea className="h-[350px] md:h-[400px] rounded-md border dark:border-gray-800">
        <div className="p-2 sm:p-3 space-y-1.5">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No files match your search</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={cn(
                  "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors text-left",
                  selectedFiles.has(file.id)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.name)}
                </div>
                
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <div className="font-medium text-sm whitespace-nowrap pr-2">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{formatDate(file.client_modified)}</span>
                  </div>
                </div>

                {selectedFiles.has(file.id) && (
                  <div className="flex-shrink-0">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={selectedFiles.size === 0}
          className="flex-1"
        >
          Import {selectedFiles.size > 0 ? `${selectedFiles.size} File${selectedFiles.size > 1 ? 's' : ''}` : 'Files'}
        </Button>
      </div>
    </div>
  )
}
