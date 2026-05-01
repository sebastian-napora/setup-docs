import {
  ArrowRightFromLine,
  CircleCheck,
  CircleX,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  History as HistoryIcon,
  Image as ImageIcon,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Square,
  Trash2,
  Upload,
} from 'lucide-react'
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
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
  transcriptionError: string
  newList: string
  collapseAllLists: string
  expandAllLists: string
  moveFileTitle: string
  moveFileAria: string
  moveFileModalTitle: string
  moveFileModalText: (filename: string) => string
  listNamePlaceholder: string
  createList: string
  cancelCreateList: string
  cancelCreateListAria: string
  emptyList: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const LANGUAGE_STORAGE_KEY = 'docs-chat-language'
const DOCUMENT_UPLOAD_ACCEPT = '.pdf,.md,.markdown,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff'
const DODANE_LIST_ID = 'dodane'

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
    embedFiles: 'Embed',
    searchFiles: 'Szukaj plików',
    loadingFiles: 'Ładowanie plików',
    noDocsFiles: 'Brak plików PDF, Markdown lub obrazów',
    noTextFiles: 'Brak plików tekstowych, PDF lub Markdown',
    noImageFiles: 'Brak plików graficznych',
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
    renameFilesError: 'Nie udało się zmienić nazwy pliku.',
    archiveFilesError: 'Nie udało się przenieść pliku do archiwum.',
    loadArchiveError: 'Nie udało się załadować archiwum.',
    deleteArchivedError: 'Nie udało się usunąć pliku z archiwum.',
    searchSourcesError: 'Nie udało się znaleźć źródeł.',
    searchEmbeddingsError: 'Nie udało się wyszukać przez embeddingi.',
    unexpectedError: 'Wystąpił nieoczekiwany błąd.',
    startRecording: 'Nagraj pytanie',
    stopRecording: 'Zatrzymaj nagrywanie',
    transcriptionError: 'Nie udało się transkrybować nagrania.',
    micUnavailable: 'Nagrywanie wymaga HTTPS lub localhost.',
    newList: 'Nowa lista',
    collapseAllLists: 'Zwiń wszystkie',
    expandAllLists: 'Rozwiń wszystkie',
    moveFileTitle: 'Przenieś do listy',
    moveFileAria: 'Przenieś plik do listy',
    moveFileModalTitle: 'Przenieś plik',
    moveFileModalText: (filename) => `Przenieś "${filename}" do listy`,
    listNamePlaceholder: 'Nazwa listy',
    createList: 'Utwórz',
    cancelCreateList: 'Anuluj',
    cancelCreateListAria: 'Anuluj tworzenie listy',
    emptyList: 'Lista jest pusta',
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
    embedFiles: 'Embed',
    searchFiles: 'Search files',
    loadingFiles: 'Loading files',
    noDocsFiles: 'No PDF, Markdown, or image files',
    noTextFiles: 'No text, PDF or Markdown files',
    noImageFiles: 'No image files',
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
    renameFilesError: 'Could not rename file.',
    archiveFilesError: 'Could not move file to archive.',
    loadArchiveError: 'Could not load archive.',
    deleteArchivedError: 'Could not delete archived file.',
    searchSourcesError: 'Could not find sources.',
    searchEmbeddingsError: 'Could not search embeddings.',
    unexpectedError: 'Unexpected error.',
    startRecording: 'Record question',
    stopRecording: 'Stop recording',
    transcriptionError: 'Could not transcribe recording.',
    micUnavailable: 'Recording requires HTTPS or localhost.',
    newList: 'New list',
    collapseAllLists: 'Collapse all',
    expandAllLists: 'Expand all',
    moveFileTitle: 'Move to list',
    moveFileAria: 'Move file to list',
    moveFileModalTitle: 'Move file',
    moveFileModalText: (filename) => `Move "${filename}" to list`,
    listNamePlaceholder: 'List name',
    createList: 'Create',
    cancelCreateList: 'Cancel',
    cancelCreateListAria: 'Cancel list creation',
    emptyList: 'List is empty',
  },
}

function App() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [documents, setDocuments] = useState<DocsFile[]>([])
  const [archivedDocuments, setArchivedDocuments] = useState<DocsFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
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
  const [fileListTab, setFileListTab] = useState<'text' | 'images'>('text')
  const [extraLists, setExtraLists] = useState<DocList[]>([])
  const [moveCandidate, setMoveCandidate] = useState<DocsFile | null>(null)
  const [isMoveLoading, setIsMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState('')
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [collapsedListIds, setCollapsedListIds] = useState<string[]>([])
  const t = TRANSLATIONS[language]
  const isAsking = activeRequestMode !== null

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.appTitle
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language, t.appTitle])

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
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
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [t.loadArchiveError, t.loadFilesError, t.loadHistoryError, t.unexpectedError])

  const textDocuments = useMemo(
    () => documents.filter((d) => d.document_type !== 'image'),
    [documents],
  )
  const imageDocuments = useMemo(
    () => documents.filter((d) => d.document_type === 'image'),
    [documents],
  )

  // Derive lists from actual folder structure of text files + ephemeral newly-created lists
  const docLists = useMemo<DocList[]>(() => {
    const folders = new Set<string>()
    textDocuments.forEach((doc) => {
      const slashIdx = doc.id.lastIndexOf('/')
      if (slashIdx !== -1) {
        folders.add(doc.id.slice(0, slashIdx))
      }
    })
    const fromFiles: DocList[] = [...folders].sort().map((folder) => ({
      id: folder,
      name: folder,
      folder,
    }))
    const extra = extraLists.filter((l) => l.folder !== '' && !folders.has(l.folder))
    return [{ id: DODANE_LIST_ID, name: 'Dodane', folder: '' }, ...fromFiles, ...extra]
  }, [textDocuments, extraLists])

  const filteredDocuments = useMemo(() => {
    const source = fileListTab === 'images' ? imageDocuments : textDocuments
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return source
    }

    return source.filter((document) =>
      `${document.name} ${document.id} ${document.document_type}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [fileListTab, imageDocuments, textDocuments, query])

  const filteredTextDocsByList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const result: Record<string, DocsFile[]> = {}
    docLists.forEach((list) => {
      const listDocs = textDocuments.filter((doc) => {
        const slashIdx = doc.id.lastIndexOf('/')
        const folder = slashIdx === -1 ? '' : doc.id.slice(0, slashIdx)
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
  }, [textDocuments, docLists, query])

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.has(document.id)),
    [documents, selectedIds],
  )
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
    } catch (loadError) {
      setError(errorMessage(loadError, t.unexpectedError))
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
    setSelectedIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      filteredDocuments.forEach((document) => nextSelection.add(document.id))
      return nextSelection
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function uploadDocuments(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (!files.length || isUploading) {
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('embed', embedUploads ? 'true' : 'false')

      const response = await fetch(`${API_BASE_URL}/api/docs/files`, {
        method: 'POST',
        body: formData,
      })
      const data = (await response.json()) as DocsUploadResponse
      if (!response.ok) {
        throw new Error(readApiError(data.detail, t.uploadFilesError))
      }

      await loadDocuments()
      const uploadedFiles = Array.isArray(data.files) ? data.files : []
      setSelectedIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        uploadedFiles.forEach((file) => nextSelection.add(file.id))
        return nextSelection
      })
    } catch (uploadError) {
      setError(errorMessage(uploadError, t.unexpectedError))
    } finally {
      setIsUploading(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ''
      }
    }
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
      setSelectedIds((currentSelection) => {
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
          ? documents.filter((d) => d.document_type !== 'image').map((document) => document.id)
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

  async function transcribeAudio(audioBlob: Blob) {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
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
    // Only add if not already derived from files
    setExtraLists((current) => {
      if (current.find((l) => l.folder === folder)) return current
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
    setMoveCandidate(documentFile)
    setMoveError('')
  }

  function toggleListCollapsed(listId: string) {
    setCollapsedListIds((current) =>
      current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId],
    )
  }

  function closeMoveModal() {
    if (isMoveLoading) return
    setMoveCandidate(null)
    setMoveError('')
  }

  async function moveFileToList(file: DocsFile, list: DocList) {
    if (isMoveLoading) return
    setIsMoveLoading(true)
    setMoveError('')
    try {
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
      if (data.file) {
        const updatedFile = data.file as DocsFile
        setDocuments((current) =>
          current.map((d) => (d.id === file.id ? updatedFile : d)),
        )
        setSelectedIds((current) => {
          if (!current.has(file.id)) return current
          const next = new Set(current)
          next.delete(file.id)
          next.add(updatedFile.id)
          return next
        })
        // Remove from extraLists — folder now exists for real via file structure
        setExtraLists((current) => current.filter((l) => l.folder !== list.folder))
      } else {
        await loadDocuments()
      }
      setMoveCandidate(null)
    } catch (err) {
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
                {isFilesExpanded ? <p>{t.selected(selectedIds.size)}</p> : null}
              </div>
            </div>
            {isFilesExpanded ? (
              <div className="button-row">
                <div className="buttons">
                  <input
                    ref={uploadInputRef}
                    className="upload-input"
                    type="file"
                    multiple
                    accept={DOCUMENT_UPLOAD_ACCEPT}
                    onChange={(event) => void uploadDocuments(event.target.files)}
                  />
                    <button
                      className="upload-button"
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                      {isUploading ? (embedUploads ? t.embeddingFiles : t.uploadingFiles) : t.addFiles}
                    </button>
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
                  <button type="button" onClick={selectAllVisible} disabled={!filteredDocuments.length || fileListTab === 'images'}>
                    <CheckSquare size={16} />
                    {t.selectAll}
                  </button>
                  <button type="button" onClick={clearSelection} disabled={!selectedIds.size}>
                    <Square size={16} />
                    {t.clear}
                  </button>
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
                {fileListTab === 'text' ? (
                  <button
                    type="button"
                    className="new-list-button"
                    onClick={() => { setIsCreatingList(true); setNewListName('') }}
                    disabled={isCreatingList}
                  >
                    <FolderPlus size={14} />
                    {t.newList}
                  </button>
                ) : null}
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

              {fileListTab === 'text' && isCreatingList ? (
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

                {fileListTab === 'images' ? (
                  <>
                    {!isLoadingDocs && !filteredDocuments.length ? (
                      <StatusLine icon={<ImageIcon size={18} />} text={t.noImageFiles} />
                    ) : null}

                    {filteredDocuments.map((document) => {
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
                            checked={selectedIds.has(document.id)}
                            onChange={() => toggleDocument(document.id)}
                            disabled={isEditing || renamingId === document.id}
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
                              <>
                                <button
                                  className="file-rename"
                                  type="button"
                                  onClick={() => startRenamingDocument(document)}
                                  disabled={renamingId === document.id || Boolean(editingDocumentId)}
                                  title={t.renameFileTitle}
                                  aria-label={`${t.renameFileAria}: ${document.name}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="file-archive"
                                  type="button"
                                  onClick={() => void archiveDocument(document)}
                                  disabled={archivingId === document.id || Boolean(editingDocumentId)}
                                  title={t.archiveFileTitle}
                                  aria-label={`${t.archiveFileAria}: ${document.name}`}
                                >
                                  {archivingId === document.id ? (
                                    <Loader2 className="spin" size={15} />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                              </>
                            )}
                          </span>
                        </article>
                      )
                    })}
                  </>
                ) : (
                  docLists.map((list) => {
                    const listDocs = filteredTextDocsByList[list.id] ?? []
                    const isListCollapsed = collapsedListIds.includes(list.id)
                    return (
                      <section
                        key={list.id}
                        className={`file-list-group${isListCollapsed ? ' is-collapsed' : ''}`}
                        aria-labelledby={`list-heading-${list.id}`}
                      >
                        <div className="list-group-header">
                          <div className="list-group-title">
                            <h4 id={`list-heading-${list.id}`}>{list.name}</h4>
                            <span>{listDocs.length}</span>
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
                              <StatusLine icon={<FileText size={18} />} text={t.emptyList} />
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
                                    checked={selectedIds.has(document.id)}
                                    onChange={() => toggleDocument(document.id)}
                                    disabled={isEditing || renamingId === document.id}
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
                                      <>
                                        <button
                                          className="file-move"
                                          type="button"
                                          onClick={() => openMoveModal(document)}
                                          disabled={docLists.length <= 1 || Boolean(editingDocumentId)}
                                          title={t.moveFileTitle}
                                          aria-label={`${t.moveFileAria}: ${document.name}`}
                                        >
                                          <ArrowRightFromLine size={15} />
                                        </button>
                                        <button
                                          className="file-rename"
                                          type="button"
                                          onClick={() => startRenamingDocument(document)}
                                          disabled={renamingId === document.id || Boolean(editingDocumentId)}
                                          title={t.renameFileTitle}
                                          aria-label={`${t.renameFileAria}: ${document.name}`}
                                        >
                                          <Pencil size={15} />
                                        </button>
                                        <button
                                          className="file-archive"
                                          type="button"
                                          onClick={() => void archiveDocument(document)}
                                          disabled={archivingId === document.id || Boolean(editingDocumentId)}
                                          title={t.archiveFileTitle}
                                          aria-label={`${t.archiveFileAria}: ${document.name}`}
                                        >
                                          {archivingId === document.id ? (
                                            <Loader2 className="spin" size={15} />
                                          ) : (
                                            <Trash2 size={15} />
                                          )}
                                        </button>
                                      </>
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
                <button
                  className="icon-button small"
                  type="button"
                  onClick={() => void loadHistory()}
                  title={t.refreshHistoryTitle}
                  aria-label={t.refreshHistoryAria}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="danger-button compact"
                  type="button"
                  onClick={() => void clearHistory()}
                  disabled={!historyItems.length}
                  title={t.clearHistoryTitle}
                  aria-label={t.clearHistoryAria}
                >
                  <Trash2 size={15} />
                  {t.clearHistory}
                </button>
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

      {moveCandidate ? (
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
              <p>{t.moveFileModalText(moveCandidate.name)}</p>
            </div>
            {moveError ? <p className="error-text">{moveError}</p> : null}
            <div className="move-list-options">
              {docLists.map((list) => {
                const slashIdx = moveCandidate.id.lastIndexOf('/')
                const currentFolder = slashIdx === -1 ? '' : moveCandidate.id.slice(0, slashIdx)
                const isCurrent = list.folder === currentFolder
                return (
                  <button
                    key={list.id}
                    type="button"
                    className={`move-list-option${isCurrent ? ' is-current' : ''}`}
                    onClick={() => { void moveFileToList(moveCandidate, list) }}
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

function encodeDocumentId(documentId: string) {
  return documentId.split('/').map(encodeURIComponent).join('/')
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

export default App
