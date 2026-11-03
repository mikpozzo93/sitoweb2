# Michele Pozzo · Avvocato, legal designer

Sito personale di Michele Pozzo. Statico, senza build e senza dipendenze: HTML, CSS e JavaScript puri. Nessun cookie, nessun tracciamento, nessuna risorsa di terze parti (il video YouTube si carica solo al clic).

## Avvio in locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Struttura

```
index.html                 pagina unica
lettore.html               lettore online delle guide (lettore.html?guida=<nome>)
assets/css/fonts.css       @font-face dei caratteri ospitati in locale
assets/css/site.css        design token e stili
assets/js/site.js          menu mobile, comparsa al scroll, video YouTube al clic
assets/css/lettore.css     stili del lettore
assets/js/lettore.js       lettore: scorrimento, zoom, indice, link, pagina nell'URL
assets/vendor/pdfjs/       PDF.js 4.10.38 (Mozilla, Apache 2.0), ospitato nel sito
assets/fonts/              Atkinson Hyperlegible Next e Mono (licenza SIL OFL)
assets/img/foto/           ritratti (WebP con JPEG di riserva)
assets/img/materiali/      copertine dei materiali
assets/img/og-image.png    anteprima per i social (1200×630)
assets/img/logo.svg        logo (originale); in index.html è inserito nell'header come SVG in linea, per usare i font del sito
assets/img/favicon.svg     icona del sito: la "D" del logo
assets/materiali/          guide in PDF
robots.txt, sitemap.xml    file per i motori di ricerca
llms.txt                   sintesi per i motori di risposta basati su AI
```

## Sezioni

| Ancora | Contenuto |
| --- | --- |
| `#top` | Hero con ritratto e i due mestieri |
| (senza ancora) | Tre competenze, un solo lavoro: avvocato, esperienza di prodotto, legal designer |
| `#chi-sono` | Biografia, punti chiave e "cosa non sono" |
| `#temi` | Di cosa mi occupo: GDPR, AI Act, accessibilità, dark pattern, consumatori, identità digitale |
| `#materiali` | I miei materiali: "Il Giurista Designer nel Prodotto", guida in PDF tratta dal webinar Exeen Talks |
| `#interventi` | I miei interventi: webinar Exeen Talks, invito a intervenire come relatore |
| `#contatti` | Email (ciao@michelepozzo.digital) e LinkedIn |

## Aggiungere contenuti

- **Nuova edizione della guida.** Sostituisci il PDF in `assets/materiali/` e la copertina in `assets/img/materiali/` (600×800, JPEG e WebP), poi aggiorna in `index.html` l'edizione, il numero di pagine e i dati strutturati.
- **Nuova guida nel lettore.** Metti il PDF in `assets/materiali/` e aggiungi una voce in `GUIDES` all'inizio di `assets/js/lettore.js`. Il link è `lettore.html?guida=<nome>`, e `#pagina=N` apre una pagina precisa.
- **Video.** Il link YouTube sta nell'attributo `data-youtube-url` dell'articolo `#interventi` (vanno bene `youtube.com/watch?v=…`, `youtu.be/…`, `/live/…`). Se è vuoto il riquadro mostra "Video in pubblicazione".
- **Nuovo materiale o intervento.** Duplica il blocco `<article class="material">` o `<article class="talk">`.

## Prima di andare online

1. **Dati professionali.** Il footer mostra solo il nome: aggiungi l'Ordine di iscrizione e la partita IVA.
2. **Dominio.** Il sito è pubblicato su GitHub Pages all'indirizzo `https://mikpozzo93.github.io/sitoweb2/`, senza file `CNAME`. Per un dominio personale: configura i DNS, aggiungi `CNAME` con il nome del dominio e sostituisci l'URL in `index.html`, `robots.txt`, `sitemap.xml` e `llms.txt`.
