# Document Chat Completions

Small Python service that accepts PDF, Markdown, image, or video files, including common
phone photo formats like HEIC/HEIF and phone videos like MOV/MP4. PDF, Markdown, and
image files can be used as AI text context; video files can be uploaded, organized,
moved, and archived, but are not extracted into AI context.

Default server endpoints:

```text
Chat API:  http://0.0.0.0:11112/v1/chat/completions
Image API: http://0.0.0.0:11112/v1/chat/image
Compress:  http://0.0.0.0:11112/compress
```

Default model:

```text
RedHatAI/Qwen3.6-35B-A3B-NVFP4
```

## Setup

```bash
cd /Users/sna/Desktop/projects/pdf-chat-completions
./setup_python_env.sh
source .venv/bin/activate
```

The setup script checks Python 3.10+, creates `.venv`, installs editable developer
dependencies, creates `.env` from `.env.example` when missing, and prepares the
`docs`, `docs_archive`, and `response` folders.

Image support uses the dedicated image analysis endpoint configured by `IMAGE_CHAT_URL`.
That endpoint must be backed by a model/server that accepts image inputs.

## Run The Service

Run the backend and React app together:

```bash
./run_app.sh
```

Stop both servers:

```bash
./stop_app.sh
```

Then open:

```text
http://localhost:5173
```

Optional ports:

```bash
APP_PORT=8081 FRONTEND_PORT=5174 ./run_app.sh
APP_PORT=8081 FRONTEND_PORT=5174 ./stop_app.sh
```

Backend-only:

```bash
uvicorn pdf_chat_service.app:app --reload --host 0.0.0.0 --port 8080
```

Serve the built React app from the Python/FastAPI server, without the Vite dev server:

```bash
cd frontend
yarn build
cd ..
./run_dist.sh
```

Then open:

```text
http://localhost:8080
```

You can also let the script build the frontend first:

```bash
BUILD_FRONTEND=1 ./run_dist.sh
```

Upload a PDF, Markdown, or image file and send it to the model:

```bash
curl -X POST "http://localhost:8080/file/chat" \
  -F "file=@/path/to/file.pdf" \
  -F "prompt_prefix=Summarize this document:" \
  -F "stream=false"
```

For Markdown:

```bash
curl -X POST "http://localhost:8080/file/chat" \
  -F "file=@/path/to/file.md" \
  -F "prompt_prefix=Analyze this Markdown document:" \
  -F "stream=false"
```

For images:

```bash
curl -X POST "http://localhost:8080/file/chat" \
  -F "file=@/path/to/image.png" \
  -F "prompt_prefix=Read this image and summarize the important facts:" \
  -F "stream=false"
```

The service extracts PDF text, reads Markdown text directly, or asks the image endpoint
to analyze image files, then sends this body to the model endpoint:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "<prompt_prefix>\n\n<document text>"
    }
  ],
  "stream": false,
  "model": "RedHatAI/Qwen3.6-35B-A3B-NVFP4"
}
```

After a successful response, the service saves the assistant choice content as Markdown
in `./response`. The API response includes the generated path:

```json
{
  "saved_response": "response/input-file_20260429-204501.md"
}
```

## React Docs App

The React app lists PDF, Markdown, image, and video files from `./docs`, lets you add
files into that folder, create file lists for both text and media files, move single
files or the current selection between lists, archive files into `./docs_archive`,
permanently delete archived files after typing `USUWAM`, select text/image files with
checkboxes, and send the selected text plus your question to the model. Video files
are stored and organized, but skipped for AI text extraction and embeddings. Enable
the `Embed` checkbox before adding files to send each extractable uploaded file to the
configured local RAG ingest endpoint. The app extracts
the upload text and sends the local RAG service the JSON ingest shape
`{"text": "...", "source": "...", "collection": "default"}`. The local RAG service
chunks it, embeds each chunk, and stores the persistent chunk text, vectors, and
metadata in `./rag_data/rag.sqlite3`. Query embeddings are temporary during
search/query calls, but document embeddings remain in SQLite until you delete or
re-ingest them. In the `Pytanie` section, the
`Znajdź kontekst w plikach` checkbox switches the same submit flow into source search:
it extracts text from the selected PDFs, Markdown files, and images, ranks the best
passages, asks the model over those passages, and shows the matched filenames with
quote snippets. If no files are selected in source search mode, the app searches all
active files in `./docs`. The `Szukaj przez embeddingi` checkbox calls the local RAG
query endpoint instead, so retrieval uses the persisted SQLite embeddings.

Start both together:

```bash
./run_app.sh
```

Or start the API manually:

```bash
uvicorn pdf_chat_service.app:app --reload --host 0.0.0.0 --port 8080
```

Start the React dev server:

```bash
cd frontend
yarn
yarn dev
```

Open:

```text
http://localhost:5173
```

The app calls these API routes:

```text
GET  /api/docs/files
POST /api/docs/files
POST /api/docs/files/{document_id}/archive
GET  /api/docs/archive
DELETE /api/docs/archive/{document_id}
POST /api/docs/chat
POST /api/docs/search
POST /api/docs/embedding-search
```

`/api/docs/chat` adds an instruction before the selected document text so the model
returns the answer together with the exact source sentence, for example:

```text
some date -> "some sentence from the selected files"
```

`/api/docs/search` is for finding where information lives. It uses the same PDF,
Markdown, and image extraction path, splits the extracted text into passages, ranks
the passages against the question, and returns source matches like the example
below. Send an empty or omitted `files` list to search all active docs:

```json
{
  "sources": [
    {
      "file_id": "screenshots/login-error.png",
      "document_type": "image",
      "quote": "Screenshot shows login failed because the session token expired."
    }
  ]
}
```

`/api/docs/embedding-search` is the embedding/RAG path. It calls the configured
`/local_rag/query` endpoint with:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is in my documents?"
    }
  ],
  "collection": "default"
}
```

Build the React app for FastAPI static serving:

```bash
cd frontend
yarn build
```

After `frontend/dist` exists, the FastAPI app serves it from `/`:

```bash
./run_dist.sh
```

## CLI

```bash
pdf-chat /path/to/file.md --prompt-prefix "Tell me what this document says:"
```

## Load Files From `./docs`

Put PDF, Markdown, image, or video files in `./docs`, start the service, then run:

```bash
./load_docs.sh
```

Send one specific file by path:

```bash
./load_docs.sh ./docs/my-file.md
```

Or by filename inside `./docs`:

```bash
./load_docs.sh my-file.md
```

Optional settings:

```bash
PROMPT_PREFIX="Summarize this document:" ./load_docs.sh
FILE_CHAT_URL="http://localhost:8080/file/chat" ./load_docs.sh
DOCS_DIR="./docs" ./load_docs.sh
MODEL="RedHatAI/Qwen3.6-35B-A3B-NVFP4" ./load_docs.sh
```

## Configuration

Environment variables:

```bash
export CHAT_COMPLETIONS_URL="http://0.0.0.0:11112/v1/chat/completions"
export CHAT_MODEL="RedHatAI/Qwen3.6-35B-A3B-NVFP4"
export REQUEST_TIMEOUT_SECONDS="120"
export MAX_PDF_CHARS="120000"
export IMAGE_CHAT_URL="http://0.0.0.0:11112/v1/chat/image"
export IMAGE_CHAT_THINKING="false"
export LOCAL_RAG_INGEST_URL=""
export LOCAL_RAG_SEARCH_URL=""
export LOCAL_RAG_QUERY_URL=""
export RAG_DATABASE_PATH="rag_data/rag.sqlite3"
export EMBEDDINGS_URL="http://0.0.0.0:11112/v1/embeddings"
export EMBEDDINGS_MODEL="text-embedding-3-small"
export AUDIO_TRANSCRIPTIONS_URL=""
export COMPRESS_URL="http://0.0.0.0:11112/compress"
export DOCS_DIR="docs"
export DOCS_ARCHIVE_DIR="docs_archive"
export EMBEDDINGS_DIR="embeddings"
export RESPONSE_DIR="response"
export SOURCE_SEARCH_MAX_MATCHES="8"
export SOURCE_SEARCH_CHUNK_CHARS="1200"
export SOURCE_SEARCH_CHUNK_OVERLAP="160"
export EMBEDDINGS_CHUNK_CHARS="1200"
export EMBEDDINGS_CHUNK_OVERLAP="160"
```

Leave the `LOCAL_RAG_*_URL` values empty to derive them from `CHAT_COMPLETIONS_URL`.
For example, `CHAT_COMPLETIONS_URL=http://192.168.0.80:11112/v1/chat/completions`
resolves ingest and query calls to `http://192.168.0.80:11112/local_rag/ingest` and
`http://192.168.0.80:11112/local_rag/query`.

Leave `AUDIO_TRANSCRIPTIONS_URL` empty to derive the Qwen3-ASR endpoint from the
same host as `CHAT_COMPLETIONS_URL` on port `11114`, for example
`http://192.168.0.80:11114/v1/audio/transcriptions`. Override it only if the ASR
server is running somewhere else.

`MAX_PDF_CHARS` prevents accidentally sending an extremely large prompt. Set it to `0`
to disable truncation.

`IMAGE_CHAT_URL` is called with multipart field `image`, plus optional `prompt` and
`thinking`, before the final document question is sent to the chat completions endpoint.

## Test

```bash
pytest
```
