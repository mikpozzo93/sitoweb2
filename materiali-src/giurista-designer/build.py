#!/usr/bin/env python3
"""Build the ebook "Il Giurista Designer nel Prodotto".

Merges parts/*.html into book.html, renders a tagged PDF with Chromium,
fills the table of contents with real page numbers (second pass),
then rewrites bookmarks (h1/h2 only) and sets title, language and viewer prefs.

    python3 build.py
"""
import pathlib, re
import pdfplumber, pikepdf
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
OUT = ROOT.parent.parent / "assets" / "materiali" / "il-giurista-designer-nel-prodotto.pdf"
TITLE = "The Legal Mind Within Digital Product Design — Il Giurista Designer nel Prodotto"


def merge(toc=None):
    parts = sorted(p for p in (ROOT / "parts").glob("*.html"))
    body = (ROOT / "parts" / "_icons.svg").read_text() + "\n".join(p.read_text() for p in parts)
    if toc:
        for key, page in toc.items():
            body = body.replace(f'<span class="p" data-toc="{key}"></span>', f'<span class="p" data-toc="{key}">p. {page}</span>')
    html = f"""<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<title>{TITLE}</title>
<meta name="author" content="Michele Pozzo">
<meta name="description" content="Atti del webinar e guida pratica al legal design, Value Sensitive Design e compliance preventiva.">
<link rel="stylesheet" href="style.css"></head>
<body>{body}</body></html>"""
    path = ROOT / "book.html"
    path.write_text(html)
    return path


def render(path, pdf):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium" if pathlib.Path("/opt/pw-browsers/chromium").is_file() else None)
        page = b.new_page()
        page.goto(path.as_uri())
        page.evaluate("document.fonts.ready")
        headings = page.evaluate("""() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
            .map(h => [Number(h.tagName[1]), h.innerText.replace(/\\s*\\n\\s*/g, ' ').trim()])""")
        page.pdf(path=str(pdf), prefer_css_page_size=True, print_background=True, tagged=True, outline=True)
        b.close()
    return headings


def find_pages(pdf):
    """Page number (1-based) of each section, by its eyebrow text."""
    marks = {f"s{i}": f"Sezione {i} ·" for i in range(1, 11)}
    marks["appendice"] = "Appendice"
    found = {}
    with pdfplumber.open(pdf) as doc:
        for n, pg in enumerate(doc.pages, 1):
            text = (pg.extract_text() or "").upper()
            for k, m in marks.items():
                if k not in found and m.upper() in text:
                    found[k] = n
    return found


def fix_pdf(pdf, headings):
    with pikepdf.open(pdf, allow_overwriting_input=True) as doc:
        with doc.open_outline() as outline:
            flat = []
            def walk(items):
                for it in items:
                    flat.append(it)
                    walk(it.children)
            walk(outline.root)
            if len(flat) != len(headings):
                print(f"! outline items {len(flat)} != headings {len(headings)}; titles left as-is")
                new = None
            else:
                new, cur = [], None
                for it, (lvl, text) in zip(flat, headings):
                    if lvl == 1:
                        cur = pikepdf.OutlineItem(text, it.destination)
                        new.append(cur)
                    elif lvl == 2 and cur is not None:
                        cur.children.append(pikepdf.OutlineItem(text, it.destination))
            if new is not None:
                outline.root.clear()
                outline.root.extend(new)
        doc.Root.Lang = pikepdf.String("it-IT")
        doc.Root.PageMode = pikepdf.Name.UseOutlines
        doc.Root.ViewerPreferences = pikepdf.Dictionary(DisplayDocTitle=True)
        with doc.open_metadata() as meta:
            meta["dc:title"] = TITLE
            meta["dc:creator"] = ["Michele Pozzo"]
            meta["dc:language"] = ["it-IT"]
        doc.docinfo["/Title"] = TITLE
        doc.docinfo["/Author"] = "Michele Pozzo"
        doc.docinfo["/Subject"] = "Atti del webinar e guida pratica al legal design, Value Sensitive Design e compliance preventiva"
        doc.save(pdf)


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    render(merge(), OUT)
    toc = find_pages(OUT)
    print("TOC:", toc)
    headings = render(merge(toc), OUT)
    assert find_pages(OUT) == toc, "page numbers shifted after filling the TOC"
    fix_pdf(OUT, headings)
    print("PDF:", OUT)


def export_text():
    """Plain-text version (Markdown) of the whole guide, for templates and reuse."""
    import subprocess
    html = (ROOT / "book.html").read_text()
    html = re.sub(r"<svg.*?</svg>", "", html, flags=re.S)
    tmp = ROOT / "_text.html"
    tmp.write_text(html)
    subprocess.run(["pandoc", str(tmp), "-f", "html", "-t", "gfm-raw_html", "--wrap=none",
                    "-o", str(ROOT / "testo-completo.md")], check=True)
    tmp.unlink()


if __name__ == "__main__":
    export_text()
