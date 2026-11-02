# Il Giurista Designer nel Prodotto — sorgenti dell'ebook

Atti del webinar "The Legal Mind Within Digital Product Design", impaginati come guida PDF accessibile.

- `parts/NN-*.html` — una sezione per file (copertina, guida all'uso e indice, sezioni 1–10, appendice)
- `parts/_icons.svg` — icone (sprite SVG)
- `style.css` — design system del sito, pagina 768×1024 px, contrasti ≥ 7:1
- `fonts/` — istanze statiche di Atkinson Hyperlegible Next/Mono (SIL OFL), così il PDF incorpora TrueType e non Type 3
- `build.py` — genera `assets/materiali/il-giurista-designer-nel-prodotto.pdf` (PDF taggato, segnalibri, lingua e titolo) e `testo-completo.md`

```bash
pip install playwright pikepdf pdfplumber
python3 build.py
```
