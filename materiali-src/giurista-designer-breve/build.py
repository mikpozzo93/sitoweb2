#!/usr/bin/env python3
"""Build the short version (about 10 pages) of "Il Giurista Designer nel Prodotto".

Reuses the full guide's pipeline (../giurista-designer/build.py) with its own
parts, stylesheet, output file and page markers.

    python3 build.py
"""
import pathlib, sys
import pdfplumber

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "giurista-designer"))
import build as base  # noqa: E402

base.ROOT = HERE
base.OUT = HERE.parent.parent / "assets" / "materiali" / "il-giurista-designer-nel-prodotto-breve.pdf"
base.TITLE = "Il Giurista Designer nel Prodotto — Versione breve"
KEYS = [f"p{i}" for i in range(1, 10)] + ["contatti"]


def find_pages(pdf):
    found = {}
    with pdfplumber.open(pdf) as doc:
        for n, pg in enumerate(doc.pages, 1):
            text = (pg.extract_text() or "").upper()
            for i, k in enumerate(KEYS, 1):
                mark = "CONTATTI ·" if k == "contatti" else f"PARTE {i} ·"
                if k not in found and mark in text:
                    found[k] = n
    return found


if __name__ == "__main__":
    base.render(base.merge(), base.OUT)
    toc = find_pages(base.OUT)
    print("TOC:", toc)
    headings = base.render(base.merge(toc), base.OUT)
    assert find_pages(base.OUT) == toc, "page numbers shifted after filling the TOC"
    base.fix_pdf(base.OUT, headings)
    base.export_text()
    print("PDF:", base.OUT)
