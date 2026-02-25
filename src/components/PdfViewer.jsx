import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  Upload,
  X,
} from 'lucide-react'

// Use the PDF.js worker shipped in pdfjs-dist (served by Vite).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const ERROR_TYPES = {
  LOAD: 'load_error',
  INVALID_TYPE: 'invalid_type',
  RENDER: 'render_error',
  NO_FILE: 'no_file',
}

async function mockLoadPdf(source) {
  // Simulate network latency and occasional errors.
  await sleep(650)
  if (Math.random() < 0.03) {
    throw new Error('Mock API error: failed to load PDF. Please try again.')
  }
  return source
}

function getHardcodedSopErrors() {
  return [
    {
      id: 'err-1',
      page: 1,
      x: 26.14,
      y: 12.69,
      width: 19,
      height: 2.5,
      message: 'Critical: Missing Preparer Signature',
    },
    {
      id: 'err-2',
      page: 1,
      x: 51.14,
      y: 12.69,
      width: 14.2,
      height: 2.5,
      message: 'Error: Date Missing (Prepared by)',
    },
    {
      id: 'err-3',
      page: 1,
      x: 26.14,
      y: 15,
      width: 19,
      height: 2.5,
      message: 'Warning: Missing Checker Signature',
    },
    {
      id: 'err-4',
      page: 1,
      x: 51.14,
      y: 15,
      width: 14.2,
      height: 2.5,
      message: 'Error: Date Missing (Checked by)',
    },
    {
      id: 'err-5',
      page: 1,
      x: 26.14,
      y: 17.8,
      width: 19,
      height: 2.5,
      message: 'Critical: Missing Approval Signature',
    },
    {
      id: 'err-6',
      page: 1,
      x: 51.14,
      y: 17.8,
      width: 14.2,
      height: 2.5,
      message: 'Error: Date Missing (Approved by)',
    },
    {
      id: 'err-7',
      page: 1,
      x: 76.2,
      y: 12.69,
      width: 13.3,
      height: 2.5,
      message: 'Warning: Supersedes Version Missing',
    },
    {
      id: 'err-8',
      page: 1,
      x: 76.2,
      y: 15,
      width: 13.3,
      height: 2.5,
      message: 'Error: Date Issued Missing',
    },
    {
      id: 'err-9',
      page: 1,
      x: 76.2,
      y: 17.8,
      width: 13.3,
      height: 2.5,
      message: 'Warning: Review Date Missing',
    },
  ]
}

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function ErrorBox({ type, message, onDismiss, onRetry }) {
  const isCritical = type === ERROR_TYPES.LOAD || type === ERROR_TYPES.INVALID_TYPE || type === ERROR_TYPES.RENDER

  return (
    <div className={classNames(
      "relative flex items-start gap-4 rounded-lg border p-4",
      isCritical ? "border-red-500/50 bg-red-500/10" : "border-amber-500/50 bg-amber-500/10"
    )}>
      <div className={classNames(
        "rounded-full p-1",
        isCritical ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
      )}>
        {isCritical ? <AlertCircle className="size-5" /> : <AlertTriangle className="size-5" />}
      </div>
      <div className="flex-1">
        <h3 className={classNames(
          "text-sm font-medium",
          isCritical ? "text-red-200" : "text-amber-200"
        )}>
          {type === ERROR_TYPES.INVALID_TYPE ? "Invalid File Type" : "Error Loading Document"}
        </h3>
        <p className={classNames(
          "mt-1 text-sm",
          isCritical ? "text-red-300" : "text-amber-300"
        )}>
          {message}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
          >
            <RefreshCcw className="size-3" />
            Try Again
          </button>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-zinc-400 hover:text-zinc-200">
          <X className="size-5" />
        </button>
      )}
    </div>
  )
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-100',
        'hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-zinc-950',
      )}
    >
      {children}
    </button>
  )
}

export default function PdfViewer() {
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorState, setErrorState] = useState(null) // { type, message }
  const [file, setFile] = useState('/sop.pdf')
  const [backendErrors, setBackendErrors] = useState([])

  const [numPages, setNumPages] = useState(null)
  // Page is less relevant in scrolling view, but keeping for "current view" tracking if needed later
  const [scale, setScale] = useState(1.0)

  const fileLabel = useMemo(() => {
    if (typeof file === 'string') {
      if (file === '/sample.pdf') return 'sample.pdf'
      if (file === '/sop.pdf') return 'SOP.pdf'
      if (file === '/sop.png') return 'SOP (Preview)'
      return file
    }
    return 'uploaded.pdf'
  }, [file])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    load(file)
  }, [])

  async function load(source) {
    if (!source) {
      setErrorState({ type: ERROR_TYPES.NO_FILE, message: "No file selected." })
      return
    }

    setStatus('loading')
    setErrorState(null)
    setNumPages(null)
    setBackendErrors([])

    try {
      const loaded = await mockLoadPdf(source)
      setFile(loaded)
      setStatus('ready')
    } catch (e) {
      setStatus('error')
      setErrorState({ type: ERROR_TYPES.LOAD, message: e instanceof Error ? e.message : 'Unknown network error' })
    }
  }

  async function handleCheck() {
    if (status !== 'ready') return

    // For demo purposes, we apply the SOP errors if it's the SOP file
    if (typeof file === 'string' && (file.includes('sop.pdf') || file.includes('sop.png'))) {
      setBackendErrors(getHardcodedSopErrors())
    } else {
      setBackendErrors([])
    }
  }

  function onPickFileClick() {
    fileInputRef.current?.click()
  }

  async function onFileSelected(e) {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (!selected) return

    if (selected.type !== 'application/pdf') {
      setErrorState({
        type: ERROR_TYPES.INVALID_TYPE,
        message: `The file "${selected.name}" is not a valid PDF. Please upload a .pdf file.`
      })
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(selected)
    await load(objectUrlRef.current)
  }

  function resetToSample() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    load('/sop.pdf')
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setErrorState(null)
  }

  const onDocumentLoadError = (err) => {
    setStatus('error')
    setErrorState({ type: ERROR_TYPES.LOAD, message: "Failed to parse PDF document. It may be corrupted." })
  }

  const handleCoordinateClick = (e, pageNum) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    console.log(`Coordinates for Page ${pageNum}:`, {
      page: pageNum,
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">ClearScan PDF Viewer</div>
              <div className="text-sm text-zinc-400">
                Multi-Page Render • Error Handling • React PDF
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileSelected}
            />
            <button
              type="button"
              onClick={handleCheck}
              disabled={status !== 'ready'}
              className={classNames(
                'inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white',
                'hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-zinc-950',
              )}
            >
              <Search className="size-4" />
              Check
            </button>
            <button
              type="button"
              onClick={onPickFileClick}
              className={classNames(
                'inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100',
                'hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-zinc-950',
              )}
            >
              <Upload className="size-4" />
              Upload PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="text-zinc-400">Document:</span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs">
              {fileLabel}
            </span>
            {numPages && (
              <span className="ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                {numPages} page{numPages === 1 ? '' : 's'}
              </span>
            )}
            {status === 'loading' && (
              <span className="text-xs text-zinc-400">Loading…</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mx-1 hidden h-6 w-px bg-zinc-800 sm:block" />
            <IconButton
              label="Zoom out"
              disabled={status !== 'ready' || scale <= 0.6}
              onClick={() => setScale((s) => Math.max(0.6, Math.round((s - 0.1) * 10) / 10))}
            >
              <Minus className="size-4" />
            </IconButton>
            <div className="min-w-[90px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-center text-sm tabular-nums">
              {Math.round(scale * 100)}%
            </div>
            <IconButton
              label="Zoom in"
              disabled={status !== 'ready' || scale >= 2.2}
              onClick={() => setScale((s) => Math.min(2.2, Math.round((s + 0.1) * 10) / 10))}
            >
              <Plus className="size-4" />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Error Box Area */}
      {errorState && (
        <ErrorBox
          type={errorState.type}
          message={errorState.message}
          onDismiss={() => setErrorState(null)}
          onRetry={errorState.type === ERROR_TYPES.LOAD ? () => load(file) : undefined}
        />
      )}

      <main className="min-h-[500px] rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex w-full justify-center overflow-auto">
          {/* Document Container */}
          <div className="flex flex-col gap-4">

            {/* Conditional Rendering for Image vs PDF */}
            {typeof file === 'string' && !file.endsWith('.pdf') && !file.endsWith('/') ? (
              // Image Fallback (Legacy PNG Support)
              <div className="relative inline-block shadow-sm">
                <img
                  src={file}
                  alt="Document"
                  className="block bg-white cursor-crosshair"
                  onClick={(e) => handleCoordinateClick(e, 1)}
                  style={{
                    width: `${Math.round(595 * scale)}px`,
                    height: 'auto'
                  }}
                />
                {backendErrors
                  .filter((e) => e.page === 1)
                  .map((err) => (
                    <div
                      key={err.id}
                      className="group absolute cursor-help border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20"
                      style={{
                        left: `${err.x}%`,
                        top: `${err.y}%`,
                        width: `${err.width}%`,
                        height: `${err.height}%`,
                      }}
                    >
                      {/* Error Tooltip */}
                      <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                        {err.message}
                        <div className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 rotate-45 bg-zinc-900" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              // PDF Document Support
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    <span className="mt-4 text-sm text-zinc-400">Loading document...</span>
                  </div>
                }
                error={null} // Handled by onLoadError
              >
                {numPages && Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="relative mb-4 shadow-sm">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="bg-white cursor-crosshair"
                      onClick={(e) => handleCoordinateClick(e, index + 1)}
                      loading={
                        <div className="flex h-[800px] w-[600px] items-center justify-center bg-white text-zinc-400">
                          Loading Page {index + 1}...
                        </div>
                      }
                    >
                      {/* Overlay Errors for this specific page */}
                      {backendErrors
                        .filter((e) => e.page === index + 1)
                        .map((err) => (
                          <div
                            key={err.id}
                            className="group absolute cursor-help border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20"
                            style={{
                              left: `${err.x}%`,
                              top: `${err.y}%`,
                              width: `${err.width}%`,
                              height: `${err.height}%`,
                            }}
                          >
                            <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                              {err.message}
                              <div className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 rotate-45 bg-zinc-900" />
                            </div>
                          </div>
                        ))}
                    </Page>
                    <div className="absolute -left-12 top-0 text-xs text-zinc-500">
                      p. {index + 1}
                    </div>
                  </div>
                ))}
              </Document>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


