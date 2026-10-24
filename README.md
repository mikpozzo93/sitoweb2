# Michele Pozzo · Avvocato, product manager, legal designer

Sito personale di Michele Pozzo. Statico, senza build e senza dipendenze: HTML, CSS e JavaScript puri. Nessun cookie, nessun tracciamento, nessuna risorsa di terze parti (il video YouTube si carica solo al clic).

## Avvio in locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Struttura

```
index.html                 pagina unica
assets/css/fonts.css       @font-face dei caratteri ospitati in locale
assets/css/site.css        design token e stili
assets/js/site.js          menu mobile, comparsa al scroll, video YouTube al clic
assets/fonts/              Atkinson Hyperlegible Next e Mono (licenza SIL OFL)
assets/img/foto/           ritratti (WebP con JPEG di riserva)
assets/img/og-image.png    anteprima per i social (1200×630)
assets/materiali/          PDF scaricabili
robots.txt, sitemap.xml    file per i motori di ricerca
llms.txt                   sintesi per i motori di risposta basati su AI
```

## Sezioni

| Ancora | Contenuto |
| --- | --- |
| `#top` | Hero con ritratto e i tre mestieri |
| (senza ancora) | Tre mestieri, un solo lavoro: avvocato, product manager, legal designer |
| `#chi-sono` | Biografia, punti chiave e "cosa non sono" |
| `#temi` | Di cosa mi occupo: GDPR, AI Act, accessibilità, dark pattern, consumatori, identità digitale |
| `#materiali` | I miei materiali: il libro sul Codice del Consumo in PDF |
| `#interventi` | I miei interventi: webinar Exeen Talks, invito a intervenire come relatore |
| `#contatti` | Email e LinkedIn |

## Aggiungere contenuti

- **Libro sul Codice del Consumo.** Carica il PDF in `assets/materiali/codice-del-consumo-in-parole-semplici.pdf`.
- **Webinar Exeen.** In `index.html` incolla il link YouTube nell'attributo `data-youtube-url` dell'articolo `#interventi` (vanno bene `youtube.com/watch?v=…`, `youtu.be/…`, `/live/…`). Finché è vuoto il riquadro mostra "Video in pubblicazione".
- **Nuovo materiale o intervento.** Duplica il blocco `<article class="material">` o `<article class="talk">`.

## Prima di andare online

1. **Dati professionali.** Nel footer sostituisci `[Foro]` con l'Ordine di iscrizione e `P.IVA 00000000000`.
2. **Email.** Verifica che `ciao@legalproductstudio.tech` sia l'indirizzo giusto (compare in `index.html` e `llms.txt`).
3. **Dominio.** `CNAME` punta ancora a `www.legalproductstudio.tech`. Se passi a un dominio personale, aggiorna `CNAME` e gli URL assoluti in `index.html`, `robots.txt`, `sitemap.xml` e `llms.txt`.
