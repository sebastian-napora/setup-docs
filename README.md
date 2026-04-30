# Document Chat Completions

Small Python service that accepts PDF, Markdown, or image files and sends extracted text
as the `messages[0].content` field to a local OpenAI-compatible chat completions endpoint.

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
`docs` and `response` folders.

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

The React app lists PDF, Markdown, and image files from `./docs`, lets you add files
into that folder, archive files into `./docs_archive`, permanently delete archived
files after typing `USUWAM`, select files with checkboxes, and send the selected text
plus your question to the model.

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
```

`/api/docs/chat` adds an instruction before the selected document text so the model
returns the answer together with the exact source sentence, for example:

```text
some date -> "some sentence from the selected files"
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

Put PDF, Markdown, or image files in `./docs`, start the service, then run:

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
export COMPRESS_URL="http://0.0.0.0:11112/compress"
export DOCS_DIR="docs"
export DOCS_ARCHIVE_DIR="docs_archive"
export RESPONSE_DIR="response"
```

`MAX_PDF_CHARS` prevents accidentally sending an extremely large prompt. Set it to `0`
to disable truncation.

`IMAGE_CHAT_URL` is called with multipart field `image`, plus optional `prompt` and
`thinking`, before the final document question is sent to the chat completions endpoint.

## Test

```bash
pytest
```
