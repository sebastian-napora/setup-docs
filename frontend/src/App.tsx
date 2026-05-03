import {
  ArrowRightFromLine,
  CircleCheck,
  CircleX,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  FolderPlus,
  History as HistoryIcon,
  Image as ImageIcon,
  Images,
  Languages,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import {
  Component,
  type ErrorInfo,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import './App.css'

type DocsFile = {
  id: string
  name: string
  size_bytes: number
  document_type: string
}

type DocsFilesResponse = {
  files?: DocsFile[]
  detail?: ApiDetail
}

type DocsUploadResponse = {
  files?: DocsFile[]
  embeddings?: DocsUploadEmbedding[]
  detail?: ApiDetail
}

type DocsUploadEmbedding = {
  file_id: string
  name: string
  document_type: string
  database_path: string
  ingest_response?: unknown
}

type DocsFileActionResponse = {
  file?: DocsFile
  detail?: ApiDetail
}

type DocsChatFileMeta = {
  id: string
  name: string
  document_type: string
  chars: number
}

type SourceMatch = {
  file_id: string
  name: string
  document_type: string
  quote: string
  score: number
}

type RequestMode = 'chat' | 'source_search' | 'embedding_search'

type DocsChatRequestMeta = {
  mode?: RequestMode
  model: string
  stream: boolean
  content_chars: number
  document_chars: number
  source_count?: number
  sources?: SourceMatch[]
  files: DocsChatFileMeta[]
}

type CompletionChoice = {
  message?: {
    content?: CompletionContent
  }
  text?: CompletionContent
}

type CompletionContent = string | Array<string | { text?: string }> | null | undefined

type DocsChatResponse = {
  answer?: string
  request?: DocsChatRequestMeta
  sources?: SourceMatch[]
  history_item?: DocsHistoryRecord
  completion?: {
    choices?: CompletionChoice[]
  }
  detail?: ApiDetail
}

type ApiDetail = string | { message?: string; response?: string }

type DocList = {
  id: string
  name: string
  folder: string
}

type DocsHistoryItem = {
  id: string
  created_at: string
  prompt: string
  answer_preview: string
  files: DocsChatFileMeta[]
  model: string
}

type DocsHistoryRecord = {
  id: string
  created_at: string
  prompt: string
  answer: string
  request?: DocsChatRequestMeta
  saved_response?: string
  detail?: ApiDetail
}

type DocsHistoryListResponse = {
  items?: DocsHistoryItem[]
  detail?: ApiDetail
}

type DisplayAnswer = {
  body: string
  quotes: string[]
}

type Language = 'pl' | 'en'
type FileListTab = 'text' | 'images'
type SnackbarMessage = {
  kind: 'success' | 'error' | 'loading'
  text: string
  onRetry?: () => void
}

type OverflowMenuItem = {
  key: string
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

type Translations = {
  appEyebrow: string
  appTitle: string
  refreshAllTitle: string
  refreshAllAria: string
  collapseSection: (section: string) => string
  expandSection: (section: string) => string
  filesHeading: string
  selected: (count: number) => string
  selectAll: string
  clear: string
  addFiles: string
  uploadingFiles: string
  embeddingFiles: string
  uploadFilesProcessing: (count: number) => string
  embedFiles: string
  searchFiles: string
  loadingFiles: string
  noDocsFiles: string
  archiveHeading: string
  archived: (count: number) => string
  loadingArchive: string
  noArchivedFiles: string
  archiveFileTitle: string
  archiveFileAria: string
  renameFileTitle: string
  renameFileAria: string
  saveRenameTitle: string
  saveRenameAria: string
  cancelRenameTitle: string
  cancelRenameAria: string
  deleteArchivedTitle: string
  deleteArchivedAria: string
  clearArchive: string
  clearArchiveTitle: string
  clearArchiveAria: string
  confirmClearArchive: string
  clearArchiveError: string
  deleteFileModalTitle: string
  deleteFileModalText: (filename: string) => string
  deleteConfirmationLabel: string
  deleteConfirmationPlaceholder: string
  cancel: string
  deleteForever: string
  questionHeading: string
  filesInContext: (count: number) => string
  promptPlaceholder: string
  asking: string
  askAi: string
  findingSources: string
  searchingEmbeddings: string
  findContextInFiles: string
  searchWithEmbeddings: string
  answerHeading: string
  promptChars: (count: number) => string
  sourceHeading: string
  sourceMatches: (count: number) => string
  ready: string
  waitingModel: string
  noAnswer: string
  historyHeading: string
  saved: (count: number) => string
  refreshHistoryTitle: string
  refreshHistoryAria: string
  loadingHistory: string
  noSavedAnswers: string
  untitledQuestion: string
  noAnswerContent: string
  filesCount: (count: number) => string
  defaultModel: string
  savedAnswer: string
  clearHistory: string
  clearHistoryTitle: string
  clearHistoryAria: string
  confirmClearHistory: string
  deleteHistoryTitle: string
  deleteHistoryAria: string
  confirmDeleteHistory: string
  switchLanguageTitle: string
  switchLanguageAria: string
  loadFilesError: string
  loadHistoryError: string
  askError: string
  openHistoryError: string
  deleteHistoryError: string
  clearHistoryError: string
  uploadFilesError: string
  uploadFilesSuccess: (count: number) => string
  uploadBatchProgress: (batch: number, totalBatches: number, uploaded: number, total: number) => string
  uploadBatchFailed: (count: number, reason: string) => string
  renameFilesError: string
  archiveFilesError: string
  loadArchiveError: string
  deleteArchivedError: string
  searchSourcesError: string
  searchEmbeddingsError: string
  unexpectedError: string
  textTab: string
  imagesTab: string
  noTextFiles: string
  noImageFiles: string
  micUnavailable: string
  startRecording: string
  stopRecording: string
  uploadAudioFile: string
  transcriptionError: string
  newList: string
  collapseAllLists: string
  expandAllLists: string
  moveFileTitle: string
  moveFileAria: string
  selectImages: string
  moveSelected: string
  moveFileModalTitle: string
  moveFileModalText: (filename: string) => string
  moveFilesModalText: (count: number) => string
  listNamePlaceholder: string
  createList: string
  cancelCreateList: string
  cancelCreateListAria: string
  emptyList: string
  closeMessage: string
  retryUpload: string
  gallery: string
  openPdf: string
  previewImage: string
  closeGallery: string
  galleryPrev: string
  galleryNext: string
  galleryCount: (current: number, total: number) => string
  selectList: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const LANGUAGE_STORAGE_KEY = 'docs-chat-language'
const EXTRA_LISTS_STORAGE_KEY = 'docs-extra-lists'
const DOCUMENT_UPLOAD_ACCEPT = '.pdf,.md,.markdown,image/*,video/*,.heic,.heif,.heics,.heifs,.mov,.mp4,.m4v,.webm,.3gp,.3g2,.avi,.mkv,.hevc'
const PROMPT_AUDIO_ACCEPT = 'audio/*,.webm,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4'
const DODANE_LIST_ID = 'dodane'
const UPLOAD_BATCH_SIZE = 10

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  errorMessage: string
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { errorMessage: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { errorMessage: stringifyDiagnosticValue(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('React render error', error, info.componentStack)
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="app-shell">
          <div className="app-error-boundary" role="alert">
            <h1>Application error</h1>
            <p>{this.state.errorMessage}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const TRANSLATIONS: Record<Language, Translations> = {
  pl: {
    appEyebrow: 'folder dokumentów',
    appTitle: 'Chat z dokumentami',
    refreshAllTitle: 'Odśwież pliki i historię',
    refreshAllAria: 'Odśwież pliki i historię',
    collapseSection: (section) => `Zwiń: ${section}`,
    expandSection: (section) => `Rozwiń: ${section}`,
    filesHeading: 'Pliki',
    selected: (count) => `${count} wybrano`,
    selectAll: 'Wszystkie',
    clear: 'Wyczyść',
    addFiles: 'Dodaj',
    uploadingFiles: 'Dodaję',
    embeddingFiles: 'Embeduję',
    uploadFilesProcessing: (count) => `Przetwarzam ${pluralFilesPl(count)}...`,
    embedFiles: 'Embed',
    searchFiles: 'Szukaj plików',
    loadingFiles: 'Ładowanie plików',
    noDocsFiles: 'Brak plików PDF, Markdown, obrazów lub wideo',
    noTextFiles: 'Brak plików tekstowych, PDF lub Markdown',
    noImageFiles: 'Brak obrazów lub wideo',
    textTab: 'Tekst',
    imagesTab: 'Obrazy',
    archiveHeading: 'Archiwum',
    archived: (count) => `${count} w archiwum`,
    loadingArchive: 'Ładowanie archiwum',
    noArchivedFiles: 'Archiwum jest puste',
    archiveFileTitle: 'Przenieś do archiwum',
    archiveFileAria: 'Przenieś plik do archiwum',
    renameFileTitle: 'Zmień nazwę',
    renameFileAria: 'Zmień nazwę pliku',
    saveRenameTitle: 'Zapisz nazwę',
    saveRenameAria: 'Zapisz nową nazwę pliku',
    cancelRenameTitle: 'Anuluj zmianę nazwy',
    cancelRenameAria: 'Anuluj zmianę nazwy pliku',
    deleteArchivedTitle: 'Usuń na zawsze',
    deleteArchivedAria: 'Usuń zarchiwizowany plik na zawsze',
    clearArchive: 'Wyczyść',
    clearArchiveTitle: 'Wyczyść archiwum',
    clearArchiveAria: 'Usuń wszystkie pliki z archiwum',
    confirmClearArchive: 'Usunąć wszystkie pliki z archiwum?',
    clearArchiveError: 'Nie udało się wyczyścić archiwum.',
    deleteFileModalTitle: 'Usuń plik na zawsze',
    deleteFileModalText: (filename) => `Aby usunąć "${filename}", wpisz USUWAM i naciśnij Enter.`,
    deleteConfirmationLabel: 'Potwierdzenie',
    deleteConfirmationPlaceholder: 'USUWAM',
    cancel: 'Anuluj',
    deleteForever: 'Usuń',
    questionHeading: 'Pytanie',
    filesInContext: (count) => `${pluralFilesPl(count)} w kontekście`,
    promptPlaceholder: 'np. data urodzin córki',
    asking: 'Pytam',
    askAi: 'Zapytaj AI',
    findingSources: 'Szukam',
    searchingEmbeddings: 'Szukam embeddingami',
    findContextInFiles: 'Znajdź kontekst w plikach',
    searchWithEmbeddings: 'Szukaj przez embeddingi',
    answerHeading: 'Odpowiedź',
    promptChars: (count) => `${count} znaków promptu`,
    sourceHeading: 'Źródła',
    sourceMatches: (count) => `${count} dopasowań`,
    ready: 'Gotowe',
    waitingModel: 'Czekam na model',
    noAnswer: 'Brak odpowiedzi',
    historyHeading: 'Historia',
    saved: (count) => `${count} zapisano`,
    refreshHistoryTitle: 'Odśwież historię',
    refreshHistoryAria: 'Odśwież historię',
    loadingHistory: 'Ładowanie historii',
    noSavedAnswers: 'Brak zapisanych odpowiedzi',
    untitledQuestion: 'Pytanie bez tytułu',
    noAnswerContent: 'Brak treści odpowiedzi',
    filesCount: (count) => pluralFilesPl(count),
    defaultModel: 'domyślny model',
    savedAnswer: 'Zapisana odpowiedź',
    clearHistory: 'Wyczyść',
    clearHistoryTitle: 'Wyczyść historię',
    clearHistoryAria: 'Wyczyść całą historię odpowiedzi',
    confirmClearHistory: 'Usunąć całą historię zapisanych odpowiedzi?',
    deleteHistoryTitle: 'Usuń wpis',
    deleteHistoryAria: 'Usuń wpis z historii',
    confirmDeleteHistory: 'Usunąć ten wpis z historii?',
    switchLanguageTitle: 'Przełącz na angielski',
    switchLanguageAria: 'Przełącz język aplikacji na angielski',
    loadFilesError: 'Nie udało się załadować plików.',
    loadHistoryError: 'Nie udało się załadować historii.',
    askError: 'Zapytanie do modelu nie powiodło się.',
    openHistoryError: 'Nie udało się otworzyć elementu historii.',
    deleteHistoryError: 'Nie udało się usunąć wpisu historii.',
    clearHistoryError: 'Nie udało się wyczyścić historii.',
    uploadFilesError: 'Nie udało się dodać plików.',
    uploadFilesSuccess: (count) => `Dodano ${pluralFilesPl(count)}.`,
    uploadBatchProgress: (batch, totalBatches, uploaded, total) =>
      `Partia ${batch}/${totalBatches} (${uploaded}/${total} plików)...`,
    uploadBatchFailed: (count, reason) => `Nieudane: ${pluralFilesPl(count)}. ${reason}`,
    renameFilesError: 'Nie udało się zmienić nazwy pliku.',
    archiveFilesError: 'Nie udało się przenieść pliku do archiwum.',
    loadArchiveError: 'Nie udało się załadować archiwum.',
    deleteArchivedError: 'Nie udało się usunąć pliku z archiwum.',
    searchSourcesError: 'Nie udało się znaleźć źródeł.',
    searchEmbeddingsError: 'Nie udało się wyszukać przez embeddingi.',
    unexpectedError: 'Wystąpił nieoczekiwany błąd.',
    startRecording: 'Nagraj pytanie',
    stopRecording: 'Zatrzymaj nagrywanie',
    uploadAudioFile: 'Dodaj nagranie',
    transcriptionError: 'Nie udało się transkrybować nagrania.',
    micUnavailable: 'Nagrywanie wymaga HTTPS lub localhost.',
    newList: 'Nowa lista',
    collapseAllLists: 'Zwiń wszystkie',
    expandAllLists: 'Rozwiń wszystkie',
    moveFileTitle: 'Przenieś do listy',
    moveFileAria: 'Przenieś plik do listy',
    selectImages: 'Zaznacz media',
    moveSelected: 'Przenieś zaznaczone',
    moveFileModalTitle: 'Przenieś plik',
    moveFileModalText: (filename) => `Przenieś "${filename}" do listy`,
    moveFilesModalText: (count) => `Przenieś ${pluralFilesPl(count)} do listy`,
    listNamePlaceholder: 'Nazwa listy',
    createList: 'Utwórz',
    cancelCreateList: 'Anuluj',
    cancelCreateListAria: 'Anuluj tworzenie listy',
    emptyList: 'Lista jest pusta',
    closeMessage: 'Zamknij',
    retryUpload: 'Ponów',
    gallery: 'Galeria',
    openPdf: 'Otwórz PDF',
    previewImage: 'Podgląd',
    closeGallery: 'Zamknij galerię',
    galleryPrev: 'Poprzedni',
    galleryNext: 'Następny',
    galleryCount: (current, total) => `${current} / ${total}`,
    selectList: 'Zaznacz listę',
  },
  en: {
    appEyebrow: 'docs folder',
    appTitle: 'Docs chat',
    refreshAllTitle: 'Refresh files and history',
    refreshAllAria: 'Refresh files and history',
    collapseSection: (section) => `Collapse: ${section}`,
    expandSection: (section) => `Expand: ${section}`,
    filesHeading: 'Files',
    selected: (count) => `${count} selected`,
    selectAll: 'All',
    clear: 'Clear',
    addFiles: 'Add',
    uploadingFiles: 'Adding',
    embeddingFiles: 'Embedding',
    uploadFilesProcessing: (count) => `Processing ${count} ${count === 1 ? 'file' : 'files'}...`,
    embedFiles: 'Embed',
    searchFiles: 'Search files',
    loadingFiles: 'Loading files',
    noDocsFiles: 'No PDF, Markdown, image, or video files',
    noTextFiles: 'No text, PDF or Markdown files',
    noImageFiles: 'No image or video files',
    textTab: 'Text',
    imagesTab: 'Images',
    archiveHeading: 'Archive',
    archived: (count) => `${count} archived`,
    loadingArchive: 'Loading archive',
    noArchivedFiles: 'Archive is empty',
    archiveFileTitle: 'Move to archive',
    archiveFileAria: 'Move file to archive',
    renameFileTitle: 'Rename',
    renameFileAria: 'Rename file',
    saveRenameTitle: 'Save name',
    saveRenameAria: 'Save new file name',
    cancelRenameTitle: 'Cancel rename',
    cancelRenameAria: 'Cancel file rename',
    deleteArchivedTitle: 'Delete forever',
    deleteArchivedAria: 'Delete archived file forever',
    clearArchive: 'Clear all',
    clearArchiveTitle: 'Clear archive',
    clearArchiveAria: 'Delete all files from archive',
    confirmClearArchive: 'Delete all files from archive?',
    clearArchiveError: 'Could not clear archive.',
    deleteFileModalTitle: 'Delete file forever',
    deleteFileModalText: (filename) => `To delete "${filename}", type USUWAM and press Enter.`,
    deleteConfirmationLabel: 'Confirmation',
    deleteConfirmationPlaceholder: 'USUWAM',
    cancel: 'Cancel',
    deleteForever: 'Delete',
    questionHeading: 'Question',
    filesInContext: (count) => `${count} files in context`,
    promptPlaceholder: 'e.g. daughter birth date',
    asking: 'Asking',
    askAi: 'Ask AI',
    findingSources: 'Searching',
    searchingEmbeddings: 'Searching embeddings',
    findContextInFiles: 'Find context in files',
    searchWithEmbeddings: 'Search with embeddings',
    answerHeading: 'Answer',
    promptChars: (count) => `${count} prompt chars`,
    sourceHeading: 'Sources',
    sourceMatches: (count) => `${count} matches`,
    ready: 'Ready',
    waitingModel: 'Waiting for model',
    noAnswer: 'No answer yet',
    historyHeading: 'History',
    saved: (count) => `${count} saved`,
    refreshHistoryTitle: 'Refresh history',
    refreshHistoryAria: 'Refresh history',
    loadingHistory: 'Loading history',
    noSavedAnswers: 'No saved answers yet',
    untitledQuestion: 'Untitled question',
    noAnswerContent: 'No answer content',
    filesCount: (count) => `${count} files`,
    defaultModel: 'default model',
    savedAnswer: 'Saved answer',
    clearHistory: 'Clear',
    clearHistoryTitle: 'Clear history',
    clearHistoryAria: 'Clear all saved answer history',
    confirmClearHistory: 'Delete all saved answer history?',
    deleteHistoryTitle: 'Delete item',
    deleteHistoryAria: 'Delete history item',
    confirmDeleteHistory: 'Delete this history item?',
    switchLanguageTitle: 'Switch to Polish',
    switchLanguageAria: 'Switch application language to Polish',
    loadFilesError: 'Could not load files.',
    loadHistoryError: 'Could not load history.',
    askError: 'The model request failed.',
    openHistoryError: 'Could not open history item.',
    deleteHistoryError: 'Could not delete history item.',
    clearHistoryError: 'Could not clear history.',
    uploadFilesError: 'Could not add files.',
    uploadFilesSuccess: (count) => `Added ${count} ${count === 1 ? 'file' : 'files'}.`,
    uploadBatchProgress: (batch, totalBatches, uploaded, total) =>
      `Batch ${batch}/${totalBatches} (${uploaded}/${total} files)...`,
    uploadBatchFailed: (count, reason) => `Failed: ${count} ${count === 1 ? 'file' : 'files'}. ${reason}`,
    renameFilesError: 'Could not rename file.',
    archiveFilesError: 'Could not move file to archive.',
    loadArchiveError: 'Could not load archive.',
    deleteArchivedError: 'Could not delete archived file.',
    searchSourcesError: 'Could not find sources.',
    searchEmbeddingsError: 'Could not search embeddings.',
    unexpectedError: 'Unexpected error.',
    startRecording: 'Record question',
    stopRecording: 'Stop recording',
    uploadAudioFile: 'Upload voice note',
    transcriptionError: 'Could not transcribe recording.',
    micUnavailable: 'Recording requires HTTPS or localhost.',
    newList: 'New list',
    collapseAllLists: 'Collapse all',
    expandAllLists: 'Expand all',
    moveFileTitle: 'Move to list',
    moveFileAria: 'Move file to list',
    selectImages: 'Select media',
    moveSelected: 'Move selected',
    moveFileModalTitle: 'Move file',
    moveFileModalText: (filename) => `Move "${filename}" to list`,
    moveFilesModalText: (count) => `Move ${count} files to list`,
    listNamePlaceholder: 'List name',
    createList: 'Create',
    cancelCreateList: 'Cancel',
    cancelCreateListAria: 'Cancel list creation',
    emptyList: 'List is empty',
    closeMessage: 'Close',
    retryUpload: 'Retry',
    gallery: 'Gallery',
    openPdf: 'Open PDF',
    previewImage: 'Preview',
    closeGallery: 'Close gallery',
    galleryPrev: 'Previous',
    galleryNext: 'Next',
    galleryCount: (current, total) => `${current} / ${total}`,
    selectList: 'Select list',
  },
}

function App() {
  const uploadInputId = useId()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const promptAudioInputId = useId()
  const promptAudioInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [documents, setDocuments] = useState<DocsFile[]>([])
  const [archivedDocuments, setArchivedDocuments] = useState<DocsFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [moveSelectedImageIds, setMoveSelectedImageIds] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('')
  const [findContextInFiles, setFindContextInFiles] = useState(false)
  const [searchWithEmbeddings, setSearchWithEmbeddings] = useState(false)
  const [embedUploads, setEmbedUploads] = useState(false)
  const [answer, setAnswer] = useState('')
  const [responseMeta, setResponseMeta] = useState<DocsChatRequestMeta | null>(null)
  const [historyItems, setHistoryItems] = useState<DocsHistoryItem[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploadSnackbar, setUploadSnackbar] = useState<SnackbarMessage | null>(null)
  const [diagnosticMessage, setDiagnosticMessage] = useState('')
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [isLoadingArchive, setIsLoadingArchive] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [activeRequestMode, setActiveRequestMode] = useState<RequestMode | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<DocsFile | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeletingArchived, setIsDeletingArchived] = useState(false)
  const [isFilesExpanded, setIsFilesExpanded] = useState(true)
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(true)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true)
  const [fileListTab, setFileListTab] = useState<FileListTab>('text')
  const [extraLists, setExtraLists] = useState<DocList[]>(getInitialExtraLists)
  const [moveCandidates, setMoveCandidates] = useState<DocsFile[] | null>(null)
  const [isMoveLoading, setIsMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState('')
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [collapsedListIds, setCollapsedListIds] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [listCounts, setListCounts] = useState<Record<string, number>>({})
  const localCountsDateRef = useRef<string | null>(null)
  const t = TRANSLATIONS[language]
  const isAsking = activeRequestMode !== null

  useEffect(() => {
    const showDiagnostic = (source: string, message: string) => {
      const cleanMessage = message.trim()
      if (cleanMessage) {
        setDiagnosticMessage(`${source}: ${cleanMessage}`)
      }
    }

    const handleWindowError = (event: ErrorEvent) => {
      showDiagnostic('Runtime error', event.message || stringifyDiagnosticValue(event.error))
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showDiagnostic('Promise rejection', stringifyDiagnosticValue(event.reason))
    }

    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args)
      showDiagnostic('Console error', args.map(stringifyDiagnosticValue).join(' '))
    }

    const originalFetch = window.fetch.bind(window)
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      try {
        return await originalFetch(...args)
      } catch (fetchError) {
        showDiagnostic(
          'Network error',
          `${fetchRequestLabel(args[0])}: ${stringifyDiagnosticValue(fetchError)}`,
        )
        throw fetchError
      }
    }) as typeof window.fetch

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.error = originalConsoleError
      window.fetch = originalFetch
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.appTitle
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language, t.appTitle])

  useEffect(() => {
    try {
      localStorage.setItem(EXTRA_LISTS_STORAGE_KEY, JSON.stringify(extraLists))
    } catch {
      // ignore storage errors
    }
  }, [extraLists])

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      // Fire counts fetch immediately (tiny JSON, resolves fast for early display)
      const countsPromise = fetch(`${API_BASE_URL}/api/docs/counts`)
        .then(
          (r) =>
            r.json() as Promise<{ counts: Record<string, number>; lastUpdateDate: string | null }>,
        )
        .then((data) => {
          if (!cancelled || !(data.counts && typeof data.counts === 'object')) return
          const serverDate = data.lastUpdateDate ?? null
          const localDate = localCountsDateRef.current
          // Only apply server counts if they are not older than local optimistic updates
          if (!localDate || !serverDate || serverDate >= localDate) {
            setListCounts(data.counts)
          }
        })
        .catch(() => {
          // best-effort; ignore
        })

      try {
        const filesResponse = await fetch(`${API_BASE_URL}/api/docs/files`)
        const filesData = (await filesResponse.json()) as DocsFilesResponse
        if (!filesResponse.ok) {
          throw new Error(readApiError(filesData.detail, t.loadFilesError))
        }

        const historyResponse = await fetch(`${API_BASE_URL}/api/docs/history`)
        const historyData = (await historyResponse.json()) as DocsHistoryListResponse
        if (!historyResponse.ok) {
          throw new Error(readApiError(historyData.detail, t.loadHistoryError))
        }

        const archiveResponse = await fetch(`${API_BASE_URL}/api/docs/archive`)
        const archiveData = (await archiveResponse.json()) as DocsFilesResponse
        if (!archiveResponse.ok) {
          throw new Error(readApiError(archiveData.detail, t.loadArchiveError))
        }

        if (cancelled) {
          return
        }

        const files = Array.isArray(filesData.files) ? filesData.files : []
        setDocuments(files)
        setSelectedIds((currentSelection) => {
          const availableIds = new Set(files.map((file) => file.id))
          return new Set([...currentSelection].filter((id) => availableIds.has(id)))
        })
        setMoveSelectedImageIds((currentSelection) => {
          const availableImageIds = new Set(
            files
              .filter((file) => file.document_type === 'image' || file.document_type === 'video')
              .map((file) => file.id),
          )
          return new Set([...currentSelection].filter((id) => availableImageIds.has(id)))
        })
        // Sync counts from authoritative file list, reset local optimistic tracking
        const freshCounts: Record<string, number> = {}
        for (const file of files) {
          const folder = getDocumentFolder(file.id)
          freshCounts[folder] = (freshCounts[folder] ?? 0) + 1
        }
        setListCounts(freshCounts)
        localCountsDateRef.current = null

        setHistoryItems(Array.isArray(historyData.items) ? historyData.items : [])
        setArchivedDocuments(Array.isArray(archiveData.files) ? archiveData.files : [])
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError, t.unexpectedError))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocs(false)
          setIsLoadingArchive(false)
          setIsLoadingHistory(false)
        }
        void countsPromise
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [t.loadArchiveError, t.loadFilesError, t.loadHistoryError, t.unexpectedError])

  const textDocuments = useMemo(
    () => documents.filter((d) => d.document_type !== 'image' && d.document_type !== 'video'),
    [documents],
  )
  const imageDocuments = useMemo(
    () => documents.filter((d) => d.document_type === 'image' || d.document_type === 'video'),
    [documents],
  )
  const currentTabDocuments = useMemo(
    () => (fileListTab === 'images' ? imageDocuments : textDocuments),
    [fileListTab, imageDocuments, textDocuments],
  )

  const allDocLists = useMemo(() => buildDocLists(documents, extraLists), [documents, extraLists])
  const docLists = useMemo(() => buildDocLists(currentTabDocuments, extraLists), [currentTabDocuments, extraLists])
  const areAllListsCollapsed =
    docLists.length > 0 && docLists.every((list) => collapsedListIds.includes(list.id))

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return currentTabDocuments
    }

    return currentTabDocuments.filter((document) =>
      `${document.name} ${document.id} ${document.document_type}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [currentTabDocuments, query])

  const filteredDocsByList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const result: Record<string, DocsFile[]> = {}
    docLists.forEach((list) => {
      const listDocs = currentTabDocuments.filter((doc) => {
        const folder = getDocumentFolder(doc.id)
        const matchedList = docLists.find((l) => l.folder === folder)
        const effectiveListId = matchedList ? matchedList.id : DODANE_LIST_ID
        return effectiveListId === list.id
      })
      result[list.id] = normalizedQuery
        ? listDocs.filter((doc) =>
            `${doc.name} ${doc.id} ${doc.document_type}`.toLowerCase().includes(normalizedQuery),
          )
          : listDocs
    })
    return result
  }, [currentTabDocuments, docLists, query])

  const galleryItems = useMemo(
    () =>
      docLists
        .filter((list) => !collapsedListIds.includes(list.id))
        .flatMap((list) => filteredDocsByList[list.id] ?? [])
        .filter((d) => d.document_type === 'image'),
    [collapsedListIds, docLists, filteredDocsByList],
  )

  useEffect(() => {
    if (galleryIndex === null || galleryItems.length === 0) return
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setGalleryIndex(null)
      else if (event.key === 'ArrowLeft') setGalleryIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      else if (event.key === 'ArrowRight')
        setGalleryIndex((i) => (i !== null && i < galleryItems.length - 1 ? i + 1 : i))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [galleryIndex, galleryItems.length])

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.has(document.id)),
    [documents, selectedIds],
  )
  const selectedDocumentsInCurrentTab = useMemo(
    () => currentTabDocuments.filter((document) => selectedIds.has(document.id)),
    [currentTabDocuments, selectedIds],
  )
  const moveSelectedImageDocuments = useMemo(
    () => imageDocuments.filter((document) => moveSelectedImageIds.has(document.id)),
    [imageDocuments, moveSelectedImageIds],
  )
  const moveDocumentsInCurrentTab = useMemo(
    () =>
      fileListTab === 'images' && moveSelectedImageDocuments.length > 0
        ? moveSelectedImageDocuments
        : selectedDocumentsInCurrentTab,
    [fileListTab, moveSelectedImageDocuments, selectedDocumentsInCurrentTab],
  )
  const displayedSelectedCount =
    fileListTab === 'images' && moveSelectedImageIds.size > 0 ? moveSelectedImageIds.size : selectedIds.size
  const contextDocuments = useMemo(
    () =>
      findContextInFiles && selectedIds.size === 0
        ? documents
        : selectedDocuments,
    [documents, findContextInFiles, selectedDocuments, selectedIds.size],
  )
  const displayAnswer = useMemo(() => parseDisplayAnswer(answer), [answer])

  async function loadDocuments() {
    setIsLoadingDocs(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/files`)
      const data = (await response.json()) as DocsFilesResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.loadFilesError))
      }

      const files = Array.isArray(data.files) ? data.files : []
      setDocuments(files)
      setSelectedIds((currentSelection) => {
        const availableIds = new Set(files.map((file) => file.id))
        return new Set([...currentSelection].filter((id) => availableIds.has(id)))
      })
      setMoveSelectedImageIds((currentSelection) => {
        const availableImageIds = new Set(
          files
            .filter((file) => file.document_type === 'image' || file.document_type === 'video')
            .map((file) => file.id),
        )
        return new Set([...currentSelection].filter((id) => availableImageIds.has(id)))
      })
      // Sync counts from authoritative data, clear local optimistic tracking
      const freshCounts: Record<string, number> = {}
      for (const file of files) {
        const folder = getDocumentFolder(file.id)
        freshCounts[folder] = (freshCounts[folder] ?? 0) + 1
      }
      setListCounts(freshCounts)
      localCountsDateRef.current = null
      return files
    } catch (loadError) {
      setError(errorMessage(loadError, t.unexpectedError))
      return null
    } finally {
      setIsLoadingDocs(false)
    }
  }

  async function loadArchive() {
    setIsLoadingArchive(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/archive`)
      const data = (await response.json()) as DocsFilesResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.loadArchiveError))
      }

      setArchivedDocuments(Array.isArray(data.files) ? data.files : [])
    } catch (loadError) {
      setError(errorMessage(loadError, t.unexpectedError))
    } finally {
      setIsLoadingArchive(false)
    }
  }

  async function loadHistory() {
    setIsLoadingHistory(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/history`)
      const data = (await response.json()) as DocsHistoryListResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.loadHistoryError))
      }

      setHistoryItems(Array.isArray(data.items) ? data.items : [])
    } catch (historyError) {
      setError(errorMessage(historyError, t.unexpectedError))
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function toggleDocument(documentId: string) {
    setSelectedIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      if (nextSelection.has(documentId)) {
        nextSelection.delete(documentId)
      } else {
        const doc = documents.find((d) => d.id === documentId)
        if (doc?.document_type === 'video') {
          return nextSelection
        }
        if (doc?.document_type === 'image') {
          documents
            .filter((d) => d.document_type === 'image' && nextSelection.has(d.id))
            .forEach((d) => nextSelection.delete(d.id))
        }
        nextSelection.add(documentId)
      }
      return nextSelection
    })
  }

  function selectAllVisible() {
    if (fileListTab === 'images') return
    const expandedDocs = docLists
      .filter((list) => !collapsedListIds.includes(list.id))
      .flatMap((list) => filteredDocsByList[list.id] ?? [])
    setSelectedIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      expandedDocs.forEach((document) => nextSelection.add(document.id))
      return nextSelection
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setMoveSelectedImageIds(new Set())
  }

  function selectImagesForMove() {
    const expandedDocs = docLists
      .filter((list) => !collapsedListIds.includes(list.id))
      .flatMap((list) => filteredDocsByList[list.id] ?? [])
    setMoveSelectedImageIds(new Set(expandedDocs.map((document) => document.id)))
  }

  function openGalleryAt(index: number) {
    setGalleryIndex(index)
  }

  function closeGalleryModal() {
    setGalleryIndex(null)
  }

  function toggleListSelection(listDocs: DocsFile[]) {
    if (fileListTab === 'images') {
      const imageDocs = listDocs.filter((d) => d.document_type === 'image')
      if (!imageDocs.length) return
      const allSelected = imageDocs.every((d) => moveSelectedImageIds.has(d.id))
      setMoveSelectedImageIds((prev) => {
        const next = new Set(prev)
        if (allSelected) {
          imageDocs.forEach((d) => next.delete(d.id))
        } else {
          imageDocs.forEach((d) => next.add(d.id))
        }
        return next
      })
    } else {
      const selectableDocs = listDocs.filter((d) => d.document_type !== 'video')
      if (!selectableDocs.length) return
      const allSelected = selectableDocs.every((d) => selectedIds.has(d.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (allSelected) {
          selectableDocs.forEach((d) => next.delete(d.id))
        } else {
          selectableDocs.forEach((d) => next.add(d.id))
        }
        return next
      })
    }
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || isUploading) {
      return
    }

    setIsUploading(true)
    setError('')

    const batches: File[][] = []
    for (let i = 0; i < files.length; i += UPLOAD_BATCH_SIZE) {
      batches.push(files.slice(i, i + UPLOAD_BATCH_SIZE))
    }
    const totalBatches = batches.length
    const totalFiles = files.length

    let allUploadedFiles: DocsFile[] = []
    let uploadedCount = 0
    const failedFiles: File[] = []
    const errors: string[] = []

    try {
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = batches[batchIndex]
        setUploadSnackbar({
          kind: 'loading',
          text:
            totalBatches === 1
              ? t.uploadFilesProcessing(totalFiles)
              : t.uploadBatchProgress(batchIndex + 1, totalBatches, uploadedCount, totalFiles),
        })

        try {
          const formData = new FormData()
          batch.forEach((file) => formData.append('files', file))
          formData.append('embed', embedUploads ? 'true' : 'false')

          const response = await fetch(`${API_BASE_URL}/api/docs/files`, {
            method: 'POST',
            body: formData,
          })
          const data = (await response.json()) as DocsUploadResponse
          if (!response.ok) {
            throw new Error(readApiError(data.detail, t.uploadFilesError))
          }

          const batchFiles = Array.isArray(data.files) ? data.files : []
          allUploadedFiles = [...allUploadedFiles, ...batchFiles]
          // Optimistic count update: uploaded files land in root folder
          if (batchFiles.length > 0) {
            localCountsDateRef.current = new Date().toISOString()
            setListCounts((prev) => ({
              ...prev,
              '': (prev[''] ?? 0) + batchFiles.length,
            }))
          }
        } catch (batchError) {
          errors.push(errorMessage(batchError, t.unexpectedError))
          failedFiles.push(...batch)
        }
        uploadedCount += batch.length
      }

      await loadDocuments()

      if (
        allUploadedFiles.length > 0 &&
        allUploadedFiles.every((file) => file.document_type === 'image' || file.document_type === 'video')
      ) {
        setFileListTab('images')
      }
      setSelectedIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        allUploadedFiles
          .filter((file) => file.document_type !== 'video')
          .forEach((file) => nextSelection.add(file.id))
        return nextSelection
      })

      if (errors.length > 0) {
        const retrySnapshot = [...failedFiles]
        const successPart =
          allUploadedFiles.length > 0 ? `${t.uploadFilesSuccess(allUploadedFiles.length)} ` : ''
        const msg = `${successPart}${t.uploadBatchFailed(failedFiles.length, errors[0])}`
        setError(allUploadedFiles.length === 0 ? errors[0] : '')
        setUploadSnackbar({
          kind: 'error',
          text: msg,
          onRetry: () => uploadFiles(retrySnapshot),
        })
      } else {
        setUploadSnackbar({
          kind: 'success',
          text: t.uploadFilesSuccess(allUploadedFiles.length || files.length),
        })
      }
    } catch (uploadError) {
      const message = errorMessage(uploadError, t.unexpectedError)
      setError(message)
      setUploadSnackbar({ kind: 'error', text: message })
    } finally {
      setIsUploading(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ''
      }
    }
  }

  async function uploadDocuments(fileList: FileList | null) {
    await uploadFiles(Array.from(fileList ?? []))
  }

  async function archiveDocument(documentFile: DocsFile) {
    if (archivingId) {
      return
    }

    setArchivingId(documentFile.id)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/docs/files/${encodeDocumentId(documentFile.id)}/archive`,
        { method: 'POST' },
      )
      const data = (await response.json()) as DocsFileActionResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.archiveFilesError))
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentFile.id),
      )
      // Optimistic count update: decrement the archived file's folder
      const archivedFolder = getDocumentFolder(documentFile.id)
      localCountsDateRef.current = new Date().toISOString()
      setListCounts((prev) => ({
        ...prev,
        [archivedFolder]: Math.max(0, (prev[archivedFolder] ?? 0) - 1),
      }))
      setSelectedIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        nextSelection.delete(documentFile.id)
        return nextSelection
      })
      setMoveSelectedImageIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        nextSelection.delete(documentFile.id)
        return nextSelection
      })

      if (data.file) {
        setArchivedDocuments((currentDocuments) => [
          data.file as DocsFile,
          ...currentDocuments.filter((document) => document.id !== data.file?.id),
        ])
      } else {
        void loadArchive()
      }
    } catch (archiveError) {
      setError(errorMessage(archiveError, t.unexpectedError))
    } finally {
      setArchivingId(null)
    }
  }

  function startRenamingDocument(documentFile: DocsFile) {
    setEditingDocumentId(documentFile.id)
    setRenameValue(splitDocumentName(documentFile.name).stem)
    setError('')
  }

  function cancelRenamingDocument() {
    if (renamingId) {
      return
    }

    setEditingDocumentId(null)
    setRenameValue('')
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>, documentFile: DocsFile) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void renameDocument(documentFile)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelRenamingDocument()
    }
  }

  async function renameDocument(documentFile: DocsFile) {
    const nextStem = renameValue.trim()
    if (!nextStem || renamingId) {
      return
    }

    const currentStem = splitDocumentName(documentFile.name).stem
    if (nextStem === currentStem) {
      cancelRenamingDocument()
      return
    }

    setRenamingId(documentFile.id)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/docs/files/${encodeDocumentId(documentFile.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: nextStem }),
        },
      )
      const data = (await response.json()) as DocsFileActionResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.renameFilesError))
      }

      if (data.file) {
        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === documentFile.id ? (data.file as DocsFile) : document,
          ),
        )
        setSelectedIds((currentSelection) => {
          if (!currentSelection.has(documentFile.id)) {
            return currentSelection
          }

          const nextSelection = new Set(currentSelection)
          nextSelection.delete(documentFile.id)
          nextSelection.add((data.file as DocsFile).id)
          return nextSelection
        })
        setMoveSelectedImageIds((currentSelection) => {
          if (!currentSelection.has(documentFile.id)) {
            return currentSelection
          }

          const nextSelection = new Set(currentSelection)
          nextSelection.delete(documentFile.id)
          nextSelection.add((data.file as DocsFile).id)
          return nextSelection
        })
      } else {
        await loadDocuments()
      }

      setEditingDocumentId(null)
      setRenameValue('')
    } catch (renameError) {
      setError(errorMessage(renameError, t.unexpectedError))
    } finally {
      setRenamingId(null)
    }
  }

  function openDeleteArchivedModal(documentFile: DocsFile) {
    setDeleteCandidate(documentFile)
    setDeleteConfirmation('')
  }

  function closeDeleteArchivedModal() {
    if (isDeletingArchived) {
      return
    }
    setDeleteCandidate(null)
    setDeleteConfirmation('')
  }

  async function deleteArchivedDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deleteCandidate || deleteConfirmation !== 'USUWAM' || isDeletingArchived) {
      return
    }

    setIsDeletingArchived(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/docs/archive/${encodeDocumentId(deleteCandidate.id)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirmation: deleteConfirmation }),
        },
      )
      const data = (await response.json()) as DocsFileActionResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.deleteArchivedError))
      }

      setArchivedDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== deleteCandidate.id),
      )
      setDeleteCandidate(null)
      setDeleteConfirmation('')
    } catch (deleteError) {
      setError(errorMessage(deleteError, t.unexpectedError))
    } finally {
      setIsDeletingArchived(false)
    }
  }

  async function clearArchive() {
    if (!window.confirm(t.confirmClearArchive)) {
      return
    }

    setIsDeletingArchived(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/archive`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: 'USUWAM' }),
      })
      const data = (await response.json()) as DocsFileActionResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.clearArchiveError))
      }

      setArchivedDocuments([])
      setDeleteCandidate(null)
      setDeleteConfirmation('')
    } catch (clearError) {
      setError(errorMessage(clearError, t.unexpectedError))
    } finally {
      setIsDeletingArchived(false)
    }
  }

  async function askModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const mode: RequestMode = searchWithEmbeddings
      ? 'embedding_search'
      : findContextInFiles
        ? 'source_search'
        : 'chat'
    await submitDocsQuestion(mode)
  }

  async function submitDocsQuestion(mode: RequestMode) {
    const selectedFiles = [...selectedIds]
    const files =
      mode === 'embedding_search'
        ? []
        : mode === 'source_search' && selectedFiles.length === 0
          ? documents
              .filter((d) => d.document_type !== 'image' && d.document_type !== 'video')
              .map((document) => document.id)
          : selectedFiles

    if (!prompt.trim() || (mode === 'chat' && !files.length) || isAsking) {
      return
    }

    setActiveRequestMode(mode)
    setError('')
    setAnswer('')
    setResponseMeta(null)
    setIsAnswerExpanded(true)

    try {
      const endpoint =
        mode === 'embedding_search'
          ? '/api/docs/embedding-search'
          : mode === 'source_search'
            ? '/api/docs/search'
            : '/api/docs/chat'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          prompt,
        }),
      })
      const data = (await response.json()) as DocsChatResponse
      if (!response.ok) {
        const fallbackError =
          mode === 'embedding_search'
            ? t.searchEmbeddingsError
            : mode === 'source_search'
              ? t.searchSourcesError
              : t.askError
        throw new Error(
          readApiError(data.detail, fallbackError),
        )
      }

      setAnswer(normalizeAnswer(data))
      setResponseMeta(mergeResponseSources(data))
      setIsAnswerExpanded(true)
      if (data.history_item) {
        setActiveHistoryId(data.history_item.id)
        setHistoryItems((currentItems) => [
          historyRecordToItem(data.history_item as DocsHistoryRecord),
          ...currentItems.filter((item) => item.id !== data.history_item?.id),
        ])
      } else {
        void loadHistory()
      }
    } catch (askError) {
      setError(errorMessage(askError, t.unexpectedError))
    } finally {
      setActiveRequestMode(null)
    }
  }

  async function openHistoryItem(historyId: string) {
    setError('')
    setActiveHistoryId(historyId)

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/history/${historyId}`)
      const data = (await response.json()) as DocsHistoryRecord
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.openHistoryError))
      }

      setPrompt(data.prompt ?? '')
      setAnswer(removeAnswerTags(data.answer ?? '').trim())
      setResponseMeta(data.request ?? null)
      setIsAnswerExpanded(true)
      setFindContextInFiles(data.request?.mode === 'source_search')
      setSearchWithEmbeddings(data.request?.mode === 'embedding_search')
      setSelectedIds(new Set((data.request?.files ?? []).map((file) => file.id)))
    } catch (historyError) {
      setError(errorMessage(historyError, t.unexpectedError))
    }
  }

  async function deleteHistoryItem(historyId: string) {
    if (!window.confirm(t.confirmDeleteHistory)) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/history/${historyId}`, {
        method: 'DELETE',
      })
      const data = (await response.json()) as { detail?: ApiDetail }
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.deleteHistoryError))
      }

      setHistoryItems((currentItems) => currentItems.filter((item) => item.id !== historyId))
      if (activeHistoryId === historyId) {
        setActiveHistoryId(null)
        setAnswer('')
        setResponseMeta(null)
      }
    } catch (deleteError) {
      setError(errorMessage(deleteError, t.unexpectedError))
    }
  }

  async function clearHistory() {
    if (!window.confirm(t.confirmClearHistory)) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/docs/history`, {
        method: 'DELETE',
      })
      const data = (await response.json()) as { detail?: ApiDetail }
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.clearHistoryError))
      }

      setHistoryItems([])
      setActiveHistoryId(null)
      setAnswer('')
      setResponseMeta(null)
    } catch (clearError) {
      setError(errorMessage(clearError, t.unexpectedError))
    }
  }

  async function transcribeAudio(audioBlob: Blob, filename = 'recording.webm') {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, filename)
      formData.append('model', 'whisper-1')
      const response = await fetch(`${API_BASE_URL}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(t.transcriptionError)
      }
      const data = (await response.json()) as { text?: string }
      const text = data.text?.trim() ?? ''
      if (text) {
        setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
      }
    } catch (transcribeError) {
      setError(errorMessage(transcribeError, t.unexpectedError))
    } finally {
      setIsTranscribing(false)
    }
  }

  async function uploadPromptAudio(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) {
      return
    }

    try {
      await transcribeAudio(file, file.name || 'recording.webm')
    } finally {
      if (promptAudioInputRef.current) {
        promptAudioInputRef.current.value = ''
      }
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(t.micUnavailable)
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          void transcribeAudio(blob)
        }
        mediaRecorder.start()
        setIsRecording(true)
      } catch (recordError) {
        setError(errorMessage(recordError, t.unexpectedError))
      }
    }
  }

  function createNewList(name: string) {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const folder = trimmedName
    setExtraLists((current) => {
      if (allDocLists.find((l) => l.folder === folder) || current.find((l) => l.folder === folder)) {
        return current
      }
      const id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `list-${Date.now()}-${Math.random().toString(36).slice(2)}`
      return [...current, { id, name: trimmedName, folder }]
    })
    setIsCreatingList(false)
    setNewListName('')
  }

  function handleNewListKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      createNewList(newListName)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsCreatingList(false)
      setNewListName('')
    }
  }

  function openMoveModal(documentFile: DocsFile) {
    setMoveCandidates([documentFile])
    setMoveError('')
  }

  function openMoveSelectedModal() {
    if (!moveDocumentsInCurrentTab.length) return
    setMoveCandidates(moveDocumentsInCurrentTab)
    setMoveError('')
  }

  function toggleListCollapsed(listId: string) {
    setCollapsedListIds((current) =>
      current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId],
    )
  }

  function toggleAllListGroups() {
    setCollapsedListIds(areAllListsCollapsed ? [] : docLists.map((list) => list.id))
  }

  function closeMoveModal() {
    if (isMoveLoading) return
    setMoveCandidates(null)
    setMoveError('')
  }

  async function moveFilesToList(files: DocsFile[], list: DocList) {
    if (isMoveLoading || files.length === 0) return

    setIsMoveLoading(true)
    setMoveError('')
    const movedFiles: Array<{ fromId: string; updatedFile: DocsFile; wasSelected: boolean }> = []
    try {
      for (const file of files) {
        const response = await fetch(
          `${API_BASE_URL}/api/docs/files/${encodeDocumentId(file.id)}/move`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: list.folder }),
          },
        )
        const data = (await response.json()) as DocsFileActionResponse
        if (!response.ok) {
          throw new Error(readApiError(data.detail, t.unexpectedError))
        }
        if (!data.file) {
          await loadDocuments()
          setMoveCandidates(null)
          return
        }

        movedFiles.push({
          fromId: file.id,
          updatedFile: data.file as DocsFile,
          wasSelected: selectedIds.has(file.id),
        })
      }

      if (movedFiles.length > 0) {
        const movedFilesMap = new Map(movedFiles.map((item) => [item.fromId, item.updatedFile]))

        // Collect source folders that might become empty after the move
        const sourceFolders = new Set(
          movedFiles.map(({ fromId }) => getDocumentFolder(fromId)).filter(Boolean),
        )

        setDocuments((current) => {
          const updated = current.map((document) => movedFilesMap.get(document.id) ?? document)

          // Any source folder that no longer has any file in it must be preserved
          const nowEmpty = [...sourceFolders].filter(
            (folder) => !updated.some((d) => getDocumentFolder(d.id) === folder),
          )
          if (nowEmpty.length > 0) {
            setExtraLists((prev) => {
              const existingFolders = new Set(prev.map((l) => l.folder))
              const toAdd: DocList[] = nowEmpty
                .filter((folder) => !existingFolders.has(folder))
                .map((folder) => ({ id: folder, name: folder, folder }))
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev
            })
          }

          return updated
        })

        setSelectedIds((current) => {
          const next = new Set(current)
          movedFiles.forEach(({ fromId, updatedFile, wasSelected }) => {
            next.delete(fromId)
            if (wasSelected) {
              next.add(updatedFile.id)
            }
          })
            return next
        })

        // Optimistic count update: adjust counts for source → target moves
        localCountsDateRef.current = new Date().toISOString()
        setListCounts((prev) => {
          const updated = { ...prev }
          movedFiles.forEach(({ fromId, updatedFile }) => {
            const srcFolder = getDocumentFolder(fromId)
            const dstFolder = getDocumentFolder(updatedFile.id)
            if (srcFolder !== dstFolder) {
              updated[srcFolder] = Math.max(0, (updated[srcFolder] ?? 0) - 1)
              updated[dstFolder] = (updated[dstFolder] ?? 0) + 1
            }
          })
          return updated
        })
      }

      setMoveSelectedImageIds(new Set())
      setExtraLists((current) => current.filter((l) => l.folder !== list.folder))
      setMoveCandidates(null)
    } catch (err) {
      if (movedFiles.length > 0) {
        const freshFiles = await loadDocuments()
        setSelectedIds((current) => {
          const next = new Set(current)
          movedFiles.forEach(({ fromId, updatedFile, wasSelected }) => {
            next.delete(fromId)
            if (wasSelected) {
              next.add(updatedFile.id)
            }
          })
          return next
        })
        // Preserve any source list that became empty on the server
        if (freshFiles) {
          const sourceFolders = new Set(
            movedFiles.map(({ fromId }) => getDocumentFolder(fromId)).filter(Boolean),
          )
          const nowEmpty = [...sourceFolders].filter(
            (folder) => !freshFiles.some((d) => getDocumentFolder(d.id) === folder),
          )
          if (nowEmpty.length > 0) {
            setExtraLists((prev) => {
              const existingFolders = new Set(prev.map((l) => l.folder))
              const toAdd: DocList[] = nowEmpty
                .filter((folder) => !existingFolders.has(folder))
                .map((folder) => ({ id: folder, name: folder, folder }))
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev
            })
          }
        }
        setExtraLists((current) => current.filter((l) => l.folder !== list.folder))
      }
      setMoveError(errorMessage(err, t.unexpectedError))
    } finally {
      setIsMoveLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t.appEyebrow}</p>
          <h1>{t.appTitle}</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="language-button"
            type="button"
            onClick={() => setLanguage((currentLanguage) => (currentLanguage === 'pl' ? 'en' : 'pl'))}
            title={t.switchLanguageTitle}
            aria-label={t.switchLanguageAria}
          >
            <Languages size={18} />
            {language.toUpperCase()}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              void loadDocuments()
              void loadArchive()
              void loadHistory()
            }}
            title={t.refreshAllTitle}
            aria-label={t.refreshAllAria}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section
          className={`file-column${isFilesExpanded ? '' : ' is-collapsed'}`}
          aria-labelledby="files-heading"
        >
          <div className="section-header">
            <div className="section-title">
              <button
                className="collapse-toggle"
                type="button"
                onClick={() => setIsFilesExpanded((isExpanded) => !isExpanded)}
                aria-expanded={isFilesExpanded}
                aria-controls="files-content"
                title={isFilesExpanded ? t.collapseSection(t.filesHeading) : t.expandSection(t.filesHeading)}
                aria-label={isFilesExpanded ? t.collapseSection(t.filesHeading) : t.expandSection(t.filesHeading)}
              >
                {isFilesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              <div>
                <h2 id="files-heading">{t.filesHeading}</h2>
                {isFilesExpanded ? <p>{t.selected(displayedSelectedCount)}</p> : null}
              </div>
            </div>
            {isFilesExpanded ? (
              <div className="button-row">
                <div className="buttons">
                  <input
                    id={uploadInputId}
                    ref={uploadInputRef}
                    className="upload-input"
                    type="file"
                    multiple
                    accept={DOCUMENT_UPLOAD_ACCEPT}
                    onChange={(event) => void uploadDocuments(event.target.files)}
                  />
                    <label
                      className={`upload-button${isUploading ? ' is-disabled' : ''}`}
                      htmlFor={uploadInputId}
                      aria-disabled={isUploading}
                      onClick={(event) => {
                        if (isUploading) {
                          event.preventDefault()
                        }
                      }}
                    >
                      {isUploading ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                      {isUploading ? (embedUploads ? t.embeddingFiles : t.uploadingFiles) : t.addFiles}
                    </label>
                  <label className="embed-option">
                    <input
                      type="checkbox"
                      checked={embedUploads}
                      onChange={(event) => setEmbedUploads(event.target.checked)}
                      disabled={isUploading}
                    />
                    <span>{t.embedFiles}</span>
                  </label>
                </div>

                <div className="buttons">
                  {fileListTab === 'images' ? (
                    <OverflowMenu showLabel items={[
                      {
                        key: 'select',
                        icon: <CheckSquare size={14} />,
                        label: t.selectImages,
                        onClick: selectImagesForMove,
                        disabled: !filteredDocuments.length,
                      },
                      {
                        key: 'gallery',
                        icon: <Images size={14} />,
                        label: t.gallery,
                        onClick: () => openGalleryAt(0),
                        disabled: !galleryItems.length,
                      },
                      {
                        key: 'move',
                        icon: <ArrowRightFromLine size={14} />,
                        label: t.moveSelected,
                        onClick: openMoveSelectedModal,
                        disabled: !moveDocumentsInCurrentTab.length || allDocLists.length <= 1 || Boolean(editingDocumentId),
                      },
                      {
                        key: 'clear',
                        icon: <Square size={14} />,
                        label: t.clear,
                        onClick: clearSelection,
                        disabled: !selectedIds.size,
                      },
                    ]} />
                  ) : (
                    <OverflowMenu showLabel items={[
                      {
                        key: 'select',
                        icon: <CheckSquare size={14} />,
                        label: t.selectAll,
                        onClick: selectAllVisible,
                        disabled: !filteredDocuments.length,
                      },
                      {
                        key: 'move',
                        icon: <ArrowRightFromLine size={14} />,
                        label: t.moveSelected,
                        onClick: openMoveSelectedModal,
                        disabled: !moveDocumentsInCurrentTab.length || allDocLists.length <= 1 || Boolean(editingDocumentId),
                      },
                      {
                        key: 'clear',
                        icon: <Square size={14} />,
                        label: t.clear,
                        onClick: clearSelection,
                        disabled: !selectedIds.size,
                      },
                    ]} />
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {isFilesExpanded ? (
            <div id="files-content">
              <div className="file-tabs">
                <button
                  type="button"
                  className={`tab-button${fileListTab === 'text' ? ' is-active' : ''}`}
                  onClick={() => setFileListTab('text')}
                >
                  <FileText size={14} />
                  {t.textTab}
                  <span className="tab-count">{textDocuments.length}</span>
                </button>
                <button
                  type="button"
                  className={`tab-button${fileListTab === 'images' ? ' is-active' : ''}`}
                  onClick={() => setFileListTab('images')}
                >
                  <ImageIcon size={14} />
                  {t.imagesTab}
                  <span className="tab-count">{imageDocuments.length}</span>
                </button>
              </div>
              <div className="button-row list-actions-row">
                <div className="buttons">
                  <button
                    type="button"
                    className="list-groups-button"
                    onClick={toggleAllListGroups}
                  >
                    {areAllListsCollapsed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {areAllListsCollapsed ? t.expandAllLists : t.collapseAllLists}
                  </button>
                </div>
                <div className="buttons">
                  <button
                    type="button"
                    className="new-list-button"
                    onClick={() => { setIsCreatingList(true); setNewListName('') }}
                    disabled={isCreatingList}
                  >
                    <FolderPlus size={14} />
                    {t.newList}
                  </button>
                </div>
              </div>
              <label className="search-field">
                <Search size={18} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchFiles}
                />
              </label>

              {isCreatingList ? (
                <div className="new-list-form">
                  <input
                    autoFocus
                    value={newListName}
                    onChange={(event) => setNewListName(event.target.value)}
                    onKeyDown={handleNewListKeyDown}
                    placeholder={t.listNamePlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => createNewList(newListName)}
                    disabled={!newListName.trim()}
                  >
                    {t.createList}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingList(false); setNewListName('') }}
                    aria-label={t.cancelCreateListAria}
                  >
                    {t.cancelCreateList}
                  </button>
                </div>
                ) : null}

                <div className="file-list" role="list">
                  {isLoadingDocs ? (
                    <StatusLine icon={<Loader2 className="spin" size={18} />} text={t.loadingFiles} />
                  ) : null}

                  {!isLoadingDocs && !currentTabDocuments.length && docLists.length === 1 ? (
                    <StatusLine
                      icon={fileListTab === 'images' ? <ImageIcon size={18} /> : <FileText size={18} />}
                      text={fileListTab === 'images' ? t.noImageFiles : t.noTextFiles}
                    />
                  ) : (
                    docLists.map((list) => {
                      const listDocs = filteredDocsByList[list.id] ?? []
                      const isListCollapsed = collapsedListIds.includes(list.id)
                      const selectableDocs =
                        fileListTab === 'images'
                          ? listDocs.filter((d) => d.document_type === 'image')
                          : listDocs.filter((d) => d.document_type !== 'video')
                      const selectedCountInList =
                        fileListTab === 'images'
                          ? selectableDocs.filter((d) => moveSelectedImageIds.has(d.id)).length
                          : selectableDocs.filter((d) => selectedIds.has(d.id)).length
                      const isListFullySelected =
                        selectableDocs.length > 0 && selectedCountInList === selectableDocs.length
                      const isListPartiallySelected =
                        selectedCountInList > 0 && selectedCountInList < selectableDocs.length
                      return (
                        <section
                          key={list.id}
                          className={`file-list-group${isListCollapsed ? ' is-collapsed' : ''}`}
                          aria-labelledby={`list-heading-${list.id}`}
                        >
                          <div className="list-group-header">
                            <IndeterminateCheckbox
                              checked={isListFullySelected}
                              indeterminate={isListPartiallySelected}
                              onChange={() => toggleListSelection(listDocs)}
                              title={`${t.selectList}: ${list.name}`}
                              aria-label={`${t.selectList}: ${list.name}`}
                              className="list-select-checkbox"
                            />
                            <div className="list-group-title">
                              <h4 id={`list-heading-${list.id}`}>{list.name}</h4>
                              <span>{isLoadingDocs ? (listCounts[list.folder] ?? listDocs.length) : listDocs.length}</span>
                            </div>
                            <button
                              className="collapse-toggle list-group-toggle"
                              type="button"
                              onClick={() => toggleListCollapsed(list.id)}
                              aria-expanded={!isListCollapsed}
                              aria-controls={`list-content-${list.id}`}
                              title={isListCollapsed ? t.expandSection(list.name) : t.collapseSection(list.name)}
                              aria-label={isListCollapsed ? t.expandSection(list.name) : t.collapseSection(list.name)}
                            >
                              {isListCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          {!isListCollapsed ? (
                            <div id={`list-content-${list.id}`}>
                              {!isLoadingDocs && listDocs.length === 0 ? (
                                <StatusLine
                                  icon={fileListTab === 'images' ? <ImageIcon size={18} /> : <FileText size={18} />}
                                  text={t.emptyList}
                                />
                              ) : null}

                              {listDocs.map((document) => {
                                const isEditing = editingDocumentId === document.id
                                const { suffix } = splitDocumentName(document.name)
                                const canSaveRename =
                                  Boolean(renameValue.trim()) &&
                                  renameValue.trim() !== splitDocumentName(document.name).stem &&
                                  renamingId !== document.id

                                return (
                                  <article className="file-row" key={document.id} role="listitem">
                                    <input
                                      type="checkbox"
                                      checked={document.document_type !== 'video' && selectedIds.has(document.id)}
                                      onChange={() => toggleDocument(document.id)}
                                      disabled={document.document_type === 'video' || isEditing || renamingId === document.id}
                                      aria-label={document.name}
                                    />
                                    <DocumentTypeIcon documentType={document.document_type} />
                                    {isEditing ? (
                                      <label className="rename-field">
                                        <input
                                          autoFocus
                                          value={renameValue}
                                          onChange={(event) => setRenameValue(event.target.value)}
                                          onKeyDown={(event) => handleRenameKeyDown(event, document)}
                                          aria-label={`${t.renameFileAria}: ${document.name}`}
                                        />
                                        <span>{suffix}</span>
                                      </label>
                                    ) : (
                                      <span className="file-copy">
                                        <strong>{document.name}</strong>
                                        <span>
                                          {document.id} - {formatDocumentType(document.document_type, language)} -{' '}
                                          {formatBytes(document.size_bytes)}
                                        </span>
                                      </span>
                                    )}
                                    <span className="file-actions">
                                      {isEditing ? (
                                        <>
                                          <button
                                            className="file-cancel"
                                            type="button"
                                            onClick={cancelRenamingDocument}
                                            disabled={renamingId === document.id}
                                            title={t.cancelRenameTitle}
                                            aria-label={`${t.cancelRenameAria}: ${document.name}`}
                                          >
                                            <CircleX size={16} />
                                          </button>
                                          <button
                                            className="file-confirm"
                                            type="button"
                                            onClick={() => void renameDocument(document)}
                                            disabled={!canSaveRename}
                                            title={t.saveRenameTitle}
                                            aria-label={`${t.saveRenameAria}: ${document.name}`}
                                          >
                                            {renamingId === document.id ? (
                                              <Loader2 className="spin" size={16} />
                                            ) : (
                                              <CircleCheck size={16} />
                                            )}
                                          </button>
                                        </>
                                      ) : (
                                        <OverflowMenu items={[
                                          ...(document.document_type === 'image' ? [{
                                            key: 'preview',
                                            icon: <Eye size={14} />,
                                            label: t.previewImage,
                                            onClick: () => {
                                              const idx = galleryItems.findIndex((d) => d.id === document.id)
                                              if (idx >= 0) openGalleryAt(idx)
                                            },
                                          }] : []),
                                          ...(document.document_type === 'pdf' ? [{
                                            key: 'open-pdf',
                                            icon: <ExternalLink size={14} />,
                                            label: t.openPdf,
                                            onClick: () => window.open(fileContentUrl(document.id), '_blank', 'noopener'),
                                          }] : []),
                                          {
                                            key: 'move',
                                            icon: <ArrowRightFromLine size={14} />,
                                            label: t.moveFileTitle,
                                            onClick: () => openMoveModal(document),
                                            disabled: allDocLists.length <= 1 || Boolean(editingDocumentId),
                                          },
                                          {
                                            key: 'rename',
                                            icon: <Pencil size={14} />,
                                            label: t.renameFileTitle,
                                            onClick: () => startRenamingDocument(document),
                                            disabled: Boolean(editingDocumentId),
                                          },
                                          {
                                            key: 'archive',
                                            icon: archivingId === document.id
                                              ? <Loader2 className="spin" size={14} />
                                              : <Trash2 size={14} />,
                                            label: t.archiveFileTitle,
                                            onClick: () => void archiveDocument(document),
                                            disabled: archivingId === document.id || Boolean(editingDocumentId),
                                            className: 'danger',
                                          },
                                        ]} />
                                      )}
                                    </span>
                                  </article>
                                )
                              })}
                            </div>
                          ) : null}
                        </section>
                      )
                    })
                  )}
                </div>

              <section className="archive-section" aria-labelledby="archive-heading">
                <div className="archive-header">
                  <h3 id="archive-heading">{t.archiveHeading}</h3>
                  <span>{t.archived(archivedDocuments.length)}</span>
                  <button
                    className="danger-button compact"
                    type="button"
                    onClick={() => void clearArchive()}
                    disabled={!archivedDocuments.length || isDeletingArchived}
                    title={t.clearArchiveTitle}
                    aria-label={t.clearArchiveAria}
                  >
                    <Trash2 size={15} />
                    {t.clearArchive}
                  </button>
                </div>

                <div className="archive-list" role="list">
                  {isLoadingArchive ? (
                    <StatusLine icon={<Loader2 className="spin" size={18} />} text={t.loadingArchive} />
                  ) : null}

                  {!isLoadingArchive && !archivedDocuments.length ? (
                    <StatusLine icon={<Trash2 size={18} />} text={t.noArchivedFiles} />
                  ) : null}

                  {archivedDocuments.map((document) => (
                    <article className="archive-row" key={document.id} role="listitem">
                      <DocumentTypeIcon documentType={document.document_type} />
                      <span className="file-copy">
                        <strong>{document.name}</strong>
                        <span>
                          {document.id} - {formatDocumentType(document.document_type, language)} -{' '}
                          {formatBytes(document.size_bytes)}
                        </span>
                      </span>
                      <button
                        className="file-delete"
                        type="button"
                        onClick={() => openDeleteArchivedModal(document)}
                        title={t.deleteArchivedTitle}
                        aria-label={`${t.deleteArchivedAria}: ${document.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </section>

        <section className="chat-column" aria-labelledby="question-heading">
          <form className="prompt-panel" onSubmit={askModel}>
            <div className="section-header">
              <div className="section-title">
                <div>
                  <h2 id="question-heading">{t.questionHeading}</h2>
                  <p>{t.filesInContext(contextDocuments.length)}</p>
                </div>
                <input
                  id={promptAudioInputId}
                  ref={promptAudioInputRef}
                  className="upload-input"
                  type="file"
                  accept={PROMPT_AUDIO_ACCEPT}
                  onChange={(event) => void uploadPromptAudio(event.target.files)}
                />
                <div className="question-actions">
                  <button
                    className="icon-button small audio-upload-button"
                    type="button"
                    onClick={() => promptAudioInputRef.current?.click()}
                    title={t.uploadAudioFile}
                    aria-label={t.uploadAudioFile}
                    disabled={isTranscribing || isRecording}
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    className={`icon-button small record-button${isRecording ? ' recording' : ''}`}
                    type="button"
                    onClick={() => void toggleRecording()}
                    title={isRecording ? t.stopRecording : t.startRecording}
                    aria-label={isRecording ? t.stopRecording : t.startRecording}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? (
                      <Loader2 className="spin" size={16} />
                    ) : isRecording ? (
                      <MicOff size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t.promptPlaceholder}
              rows={8}
            />

            <label className="context-option">
              <input
                type="checkbox"
                checked={findContextInFiles}
                onChange={(event) => {
                  setFindContextInFiles(event.target.checked)
                  if (event.target.checked) {
                    setSearchWithEmbeddings(false)
                  }
                }}
              />
              <span>{t.findContextInFiles}</span>
            </label>

            <label className="context-option">
              <input
                type="checkbox"
                checked={searchWithEmbeddings}
                onChange={(event) => {
                  setSearchWithEmbeddings(event.target.checked)
                  if (event.target.checked) {
                    setFindContextInFiles(false)
                  }
                }}
              />
              <span>{t.searchWithEmbeddings}</span>
            </label>

            <div className="actions">
              <button
                className="primary-button"
                type="submit"
                disabled={
                  !prompt.trim() ||
                  (!findContextInFiles && !searchWithEmbeddings && selectedIds.size === 0) ||
                  (findContextInFiles && documents.length === 0) ||
                  isAsking
                }
              >
                {activeRequestMode ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {activeRequestMode === 'source_search'
                  ? t.findingSources
                  : activeRequestMode === 'embedding_search'
                    ? t.searchingEmbeddings
                    : activeRequestMode === 'chat'
                      ? t.asking
                      : t.askAi}
              </button>
            </div>
          </form>

          {error ? <div className="error-banner">{error}</div> : null}

          <section
            className={`answer-panel${isAnswerExpanded ? '' : ' is-collapsed'}`}
            aria-live="polite"
            aria-label={t.answerHeading}
          >
            <div className="section-header compact">
              <div className="section-title">
                <button
                  className="collapse-toggle"
                  type="button"
                  onClick={() => setIsAnswerExpanded((isExpanded) => !isExpanded)}
                  aria-expanded={isAnswerExpanded}
                  aria-controls="answer-content"
                  title={isAnswerExpanded ? t.collapseSection(t.answerHeading) : t.expandSection(t.answerHeading)}
                  aria-label={isAnswerExpanded ? t.collapseSection(t.answerHeading) : t.expandSection(t.answerHeading)}
                >
                  {isAnswerExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div>
                  <h2>{t.answerHeading}</h2>
                  {isAnswerExpanded ? (
                    <p>{responseMeta ? t.promptChars(responseMeta.content_chars) : t.ready}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {isAnswerExpanded ? (
              <div id="answer-content">
                {answer || responseMeta?.sources?.length ? (
                  <div className="answer-content">
                    {displayAnswer.body ? (
                      <div className="answer-text">{displayAnswer.body}</div>
                    ) : null}
                    {displayAnswer.quotes.map((quote) => (
                      <blockquote className="source-quote" key={quote}>
                        {quote}
                      </blockquote>
                    ))}
                    {responseMeta?.sources?.length ? (
                      <section className="source-list" aria-labelledby="source-heading">
                        <div className="source-list-header">
                          <h3 id="source-heading">{t.sourceHeading}</h3>
                          <span>{t.sourceMatches(responseMeta.sources.length)}</span>
                        </div>
                        {responseMeta.sources.map((source) => (
                          <article className="source-card" key={`${source.file_id}-${source.quote}`}>
                            <div className="source-card-header">
                              <DocumentTypeIcon documentType={source.document_type} />
                              <span>
                                <strong>{source.name}</strong>
                                <span>{source.file_id}</span>
                              </span>
                            </div>
                            <blockquote className="source-quote compact">{source.quote}</blockquote>
                          </article>
                        ))}
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <StatusLine
                    icon={isAsking ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
                    text={isAsking ? t.waitingModel : t.noAnswer}
                  />
                )}
              </div>
            ) : null}
          </section>
        </section>

        <section
          className={`history-column${isHistoryExpanded ? '' : ' is-collapsed'}`}
          aria-labelledby="history-heading"
        >
          <div className="section-header">
            <div className="section-title">
              <button
                className="collapse-toggle"
                type="button"
                onClick={() => setIsHistoryExpanded((isExpanded) => !isExpanded)}
                aria-expanded={isHistoryExpanded}
                aria-controls="history-content"
                title={isHistoryExpanded ? t.collapseSection(t.historyHeading) : t.expandSection(t.historyHeading)}
                aria-label={isHistoryExpanded ? t.collapseSection(t.historyHeading) : t.expandSection(t.historyHeading)}
              >
                {isHistoryExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              <div>
                <h2 id="history-heading">{t.historyHeading}</h2>
                {isHistoryExpanded ? <p>{t.saved(historyItems.length)}</p> : null}
              </div>
            </div>
            {isHistoryExpanded ? (
              <div className="history-actions">
                <OverflowMenu showLabel items={[
                  {
                    key: 'refresh',
                    icon: <RefreshCw size={14} />,
                    label: t.refreshHistoryTitle,
                    onClick: () => void loadHistory(),
                  },
                  {
                    key: 'clear',
                    icon: <Trash2 size={14} />,
                    label: t.clearHistory,
                    onClick: () => void clearHistory(),
                    disabled: !historyItems.length,
                    className: 'danger',
                  },
                ]} />
              </div>
            ) : null}
          </div>

          {isHistoryExpanded ? (
            <div id="history-content" className="history-list" role="list">
              {isLoadingHistory ? (
                <StatusLine icon={<Loader2 className="spin" size={18} />} text={t.loadingHistory} />
              ) : null}

              {!isLoadingHistory && !historyItems.length ? (
                <StatusLine icon={<HistoryIcon size={18} />} text={t.noSavedAnswers} />
              ) : null}

              {historyItems.map((item) => (
                <article
                  className={`history-item${item.id === activeHistoryId ? ' is-active' : ''}`}
                  key={item.id}
                >
                  <button
                    className="history-open"
                    type="button"
                    onClick={() => void openHistoryItem(item.id)}
                  >
                    <span className="history-date">
                      {formatHistoryDate(item.created_at, language, t.savedAnswer)}
                    </span>
                    <strong>{item.prompt || t.untitledQuestion}</strong>
                    <span className="history-preview">{item.answer_preview || t.noAnswerContent}</span>
                    <span className="history-meta">
                      {t.filesCount(item.files.length)} - {item.model || t.defaultModel}
                    </span>
                  </button>
                  <button
                    className="history-delete"
                    type="button"
                    onClick={() => void deleteHistoryItem(item.id)}
                    title={t.deleteHistoryTitle}
                    aria-label={`${t.deleteHistoryAria}: ${item.prompt || t.untitledQuestion}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      {deleteCandidate ? (
        <div className="modal-backdrop">
          <form
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-file-modal-title"
            onSubmit={deleteArchivedDocument}
          >
            <div>
              <h2 id="delete-file-modal-title">{t.deleteFileModalTitle}</h2>
              <p>{t.deleteFileModalText(deleteCandidate.name)}</p>
            </div>

            <label className="confirm-field">
              <span>{t.deleteConfirmationLabel}</span>
              <input
                autoFocus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={t.deleteConfirmationPlaceholder}
              />
            </label>

            <div className="modal-actions">
              <button type="button" onClick={closeDeleteArchivedModal}>
                {t.cancel}
              </button>
              <button
                className="danger-button"
                type="submit"
                disabled={deleteConfirmation !== 'USUWAM' || isDeletingArchived}
              >
                {isDeletingArchived ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                {t.deleteForever}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {moveCandidates?.length ? (
        <div className="modal-backdrop" onClick={closeMoveModal}>
          <div
            className="move-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-file-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="move-file-modal-title">{t.moveFileModalTitle}</h2>
              <p>
                {moveCandidates.length === 1
                  ? t.moveFileModalText(moveCandidates[0].name)
                  : t.moveFilesModalText(moveCandidates.length)}
              </p>
            </div>
            {moveError ? <p className="error-text">{moveError}</p> : null}
            <div className="move-list-options">
              {allDocLists.map((list) => {
                const isCurrent = moveCandidates.every((file) => getDocumentFolder(file.id) === list.folder)
                return (
                  <button
                    key={list.id}
                    type="button"
                    className={`move-list-option${isCurrent ? ' is-current' : ''}`}
                    onClick={() => { void moveFilesToList(moveCandidates, list) }}
                    disabled={isCurrent || isMoveLoading}
                  >
                    {isMoveLoading ? <Loader2 className="spin" size={16} /> : <FolderPlus size={16} />}
                    {list.name}
                  </button>
                )
              })}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={closeMoveModal} disabled={isMoveLoading}>
                {t.cancelCreateList}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadSnackbar ? (
        <div
          className={`snackbar snackbar-${uploadSnackbar.kind}`}
          role={uploadSnackbar.kind === 'error' ? 'alert' : 'status'}
          aria-live={uploadSnackbar.kind === 'error' ? 'assertive' : 'polite'}
        >
          <span className="snackbar-text">
            {uploadSnackbar.kind === 'loading' ? <Loader2 className="spin" size={16} /> : null}
            {uploadSnackbar.text}
          </span>
          {uploadSnackbar.kind === 'loading' ? null : (
            <div className="snackbar-actions">
              {uploadSnackbar.onRetry ? (
                <button
                  type="button"
                  className="snackbar-retry"
                  onClick={() => {
                    const retry = uploadSnackbar.onRetry
                    setUploadSnackbar(null)
                    retry?.()
                  }}
                >
                  {t.retryUpload}
                </button>
              ) : null}
              <button type="button" onClick={() => setUploadSnackbar(null)}>
                {t.closeMessage}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {diagnosticMessage ? (
        <div className="diagnostic-panel" role="alert" aria-live="assertive">
          <div>
            <strong>Diagnostic error</strong>
            <p>{diagnosticMessage}</p>
          </div>
          <button type="button" onClick={() => setDiagnosticMessage('')}>
            {t.closeMessage}
          </button>
        </div>
      ) : null}

      {galleryIndex !== null && galleryItems.length > 0 ? (
        <div
          className="gallery-backdrop"
          onClick={closeGalleryModal}
          role="dialog"
          aria-modal="true"
          aria-label={t.gallery}
        >
          <div className="gallery-header" onClick={(e) => e.stopPropagation()}>
            <span className="gallery-count">
              {t.galleryCount(galleryIndex + 1, galleryItems.length)}
            </span>
            <span className="gallery-filename">{galleryItems[galleryIndex]?.name}</span>
            <button
              type="button"
              className="gallery-close icon-button"
              onClick={closeGalleryModal}
              title={t.closeGallery}
              aria-label={t.closeGallery}
            >
              <X size={20} />
            </button>
          </div>
          <div className="gallery-image-area" onClick={(e) => e.stopPropagation()}>
            {galleryIndex > 0 ? (
              <button
                type="button"
                className="gallery-nav gallery-prev"
                onClick={() => setGalleryIndex(galleryIndex - 1)}
                title={t.galleryPrev}
                aria-label={t.galleryPrev}
              >
                <ChevronLeft size={28} />
              </button>
            ) : null}
            <img
              key={galleryItems[galleryIndex]?.id}
              src={fileContentUrl(galleryItems[galleryIndex]?.id ?? '')}
              alt={galleryItems[galleryIndex]?.name}
              className="gallery-image"
            />
            {galleryIndex < galleryItems.length - 1 ? (
              <button
                type="button"
                className="gallery-nav gallery-next"
                onClick={() => setGalleryIndex(galleryIndex + 1)}
                title={t.galleryNext}
                aria-label={t.galleryNext}
              >
                <ChevronRight size={28} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatusLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="status-line">
      {icon}
      <span>{text}</span>
    </div>
  )
}

function DocumentTypeIcon({ documentType }: { documentType: string }) {
  if (documentType === 'image') {
    return <ImageIcon className="file-type-icon" size={19} aria-hidden="true" />
  }
  if (documentType === 'video') {
    return <Video className="file-type-icon" size={19} aria-hidden="true" />
  }

  return <FileText className="file-type-icon" size={19} aria-hidden="true" />
}

function formatDocumentType(documentType: string, language: Language) {
  if (documentType === 'pdf') {
    return 'PDF'
  }
  if (documentType === 'markdown') {
    return 'Markdown'
  }
  if (documentType === 'image') {
    return language === 'pl' ? 'obraz' : 'image'
  }
  if (documentType === 'video') {
    return language === 'pl' ? 'wideo' : 'video'
  }

  return documentType
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function splitDocumentName(name: string) {
  const extensionStart = name.lastIndexOf('.')
  if (extensionStart <= 0) {
    return { stem: name, suffix: '' }
  }

  return {
    stem: name.slice(0, extensionStart),
    suffix: name.slice(extensionStart),
  }
}

function getDocumentFolder(documentId: string) {
  const slashIdx = documentId.lastIndexOf('/')
  return slashIdx === -1 ? '' : documentId.slice(0, slashIdx)
}

function buildDocLists(documents: DocsFile[], extraLists: DocList[]) {
  const folders = new Set<string>()
  documents.forEach((doc) => {
    const folder = getDocumentFolder(doc.id)
    if (folder) {
      folders.add(folder)
    }
  })

  const fromFiles: DocList[] = [...folders].sort().map((folder) => ({
    id: folder,
    name: folder,
    folder,
  }))
  const extra = extraLists.filter((list) => list.folder !== '' && !folders.has(list.folder))

  return [{ id: DODANE_LIST_ID, name: 'Dodane', folder: '' }, ...fromFiles, ...extra]
}

function normalizeAnswer(data: DocsChatResponse) {
  if (typeof data.answer === 'string' && data.answer.trim()) {
    return removeAnswerTags(data.answer).trim()
  }

  const choices = data.completion?.choices
  if (!Array.isArray(choices)) {
    return ''
  }

  const answer = choices
    .map((choice) => stringifyContent(choice.message?.content ?? choice.text))
    .filter(Boolean)
    .join('\n\n')

  return removeAnswerTags(answer).trim()
}

function mergeResponseSources(data: DocsChatResponse): DocsChatRequestMeta | null {
  if (!data.request) {
    return null
  }

  return {
    ...data.request,
    sources: data.request.sources ?? data.sources ?? [],
  }
}

function historyRecordToItem(record: DocsHistoryRecord): DocsHistoryItem {
  return {
    id: record.id,
    created_at: record.created_at,
    prompt: record.prompt,
    answer_preview: previewText(record.answer),
    files: record.request?.files ?? [],
    model: record.request?.model ?? '',
  }
}

function previewText(value: string, maxChars = 180) {
  const preview = removeAnswerTags(value).replace(/\s+/g, ' ').trim()
  if (preview.length <= maxChars) {
    return preview
  }
  return `${preview.slice(0, maxChars - 1).trim()}...`
}

function formatHistoryDate(value: string, language: Language, fallback: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function stringifyContent(content: CompletionContent) {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }
  return ''
}

function readApiError(detail: ApiDetail | undefined, fallback: string) {
  if (typeof detail === 'string') {
    return detail
  }
  if (typeof detail?.message === 'string') {
    return detail.message
  }
  return fallback
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function stringifyDiagnosticValue(value: unknown) {
  if (value instanceof Error) {
    return value.stack || value.message
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function fetchRequestLabel(request: Parameters<typeof fetch>[0]) {
  if (typeof request === 'string') {
    return request
  }
  if (request instanceof URL) {
    return request.toString()
  }
  return request.url
}

function encodeDocumentId(documentId: string) {
  return documentId.split('/').map(encodeURIComponent).join('/')
}

function fileContentUrl(fileId: string): string {
  return `${API_BASE_URL}/api/docs/files/${encodeDocumentId(fileId)}/content`
}

function parseDisplayAnswer(rawAnswer: string): DisplayAnswer {
  const answer = removeAnswerTags(rawAnswer).trim()
  if (!answer) {
    return { body: '', quotes: [] }
  }

  const quotes: string[] = []
  let body = answer

  body = body.replace(
    /(?:^|\n)\s*(?:answer\s*:)?\s*(?:->|=>)\s*["“]([\s\S]+?)["”]\s*$/gi,
    (_match, quote: string) => {
      quotes.push(cleanQuote(quote))
      return ''
    },
  )

  body = body.replace(/\s*(?:->|=>)\s*["“]([\s\S]+?)["”]\s*$/i, (_match, quote: string) => {
    quotes.push(cleanQuote(quote))
    return ''
  })

  body = body.replace(
    /\s*(?:source\s+)?quote\s*:\s*["“]?([\s\S]+?)["”]?\s*$/i,
    (_match, quote: string) => {
      quotes.push(cleanQuote(quote))
      return ''
    },
  )

  body = body.replace(
    /(?:^|\n)\s*(?:source\s+)?quote\s*:\s*["“]?([\s\S]+?)["”]?\s*$/gi,
    (_match, quote: string) => {
      quotes.push(cleanQuote(quote))
      return ''
    },
  )

  body = body
    .replace(/^answer\s*:\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    body,
    quotes: uniqueQuotes(quotes.filter(Boolean)),
  }
}

function removeAnswerTags(value: string) {
  return value
    .replace(/<\/?answer>/gi, '')
    .replace(/<\/?quote>/gi, '')
    .replace(/<\/?source>/gi, '')
}

function cleanQuote(value: string) {
  return removeAnswerTags(value)
    .replace(/^["“]+|["”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueQuotes(quotes: string[]) {
  return [...new Set(quotes)]
}

function getInitialLanguage(): Language {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return savedLanguage === 'en' ? 'en' : 'pl'
}

function getInitialExtraLists(): DocList[] {
  try {
    const stored = localStorage.getItem(EXTRA_LISTS_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as DocList[]
  } catch {
    // ignore
  }
  return []
}

function pluralFilesPl(count: number) {
  if (count === 1) {
    return '1 plik'
  }

  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} pliki`
  }

  return `${count} plików`
}

interface IndeterminateCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
}

function IndeterminateCheckbox({ indeterminate, ...props }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false
    }
  }, [indeterminate])

  return <input type="checkbox" ref={ref} {...props} />
}

function OverflowMenu({ items, showLabel }: { items: OverflowMenuItem[]; showLabel?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const portal = document.querySelector('[data-overflow-portal]')
      if (portal?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  return (
    <div className="overflow-menu">
      <button
        ref={triggerRef}
        type="button"
        className={`overflow-trigger${showLabel ? ' overflow-trigger--labeled' : ' overflow-trigger--dot'}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={open ? () => setOpen(false) : openMenu}
        title="Więcej opcji"
      >
        <MoreHorizontal size={14} />
        {showLabel && <span>Więcej</span>}
      </button>
      {open && createPortal(
        <div
          className="overflow-dropdown"
          style={{ top: pos.top, right: pos.right }}
          data-overflow-portal=""
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`overflow-item${item.className ? ` ${item.className}` : ''}`}
              disabled={item.disabled}
              onClick={() => { item.onClick(); setOpen(false) }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default App
