from io import BytesIO

from pypdf import PdfReader


class PdfExtractionError(ValueError):
    pass


def extract_pdf_text(pdf_bytes: bytes, max_chars: int = 120_000) -> str:
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
    except Exception as exc:
        raise PdfExtractionError("Could not read PDF bytes.") from exc

    page_texts: list[str] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            page_texts.append(f"[Page {page_number}]\n{text}")

    combined = "\n\n".join(page_texts).strip()
    if not combined:
        raise PdfExtractionError("No selectable text was found in this PDF.")

    if max_chars > 0 and len(combined) > max_chars:
        return combined[:max_chars].rstrip() + "\n\n[Truncated]"

    return combined
