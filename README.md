# Legal Product Studio · Law, by design.

Pagina **coming soon** di Legal Product Studio, con un modulo "Resta connesso" per raccogliere i contatti delle aziende interessate.

Statica, senza build e senza dipendenze: HTML, CSS e JavaScript puri.

Il sito completo è in lavorazione e non è pubblicato: su questo branch c'è solo ciò che va online. Finché non è pronto si recupera dalla cronologia git (commit `70eb779`, cartella `servizi/` più `assets/css/styles.css` e `assets/js/main.js`).

## Avvio in locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Struttura

```
index.html                   pagina coming soon
assets/css/fonts.css         @font-face dei caratteri ospitati in locale
assets/css/coming-soon.css   design token e stili
assets/js/coming-soon.js     animazione del titolo, modulo, finestra privacy
assets/fonts/                Atkinson Hyperlegible Next e Mono (licenza SIL OFL)
assets/img/                  favicon e immagine di anteprima per i social
robots.txt, sitemap.xml      file per i motori di ricerca
llms.txt                     sintesi per i motori di risposta basati su AI
```

## Raccolta contatti

Il modulo `#resta-connesso` chiede email (obbligatoria), nome, azienda, ruolo e la presa visione dell'informativa privacy con il consenso a ricevere email, non preselezionato. Un campo nascosto (honeypot) scarta lo spam.

Imposta `data-endpoint` con l'URL di un servizio di form o newsletter (per esempio Formspree o Brevo) per ricevere le iscrizioni in POST. Senza, il modulo apre il programma di posta del visitatore con la richiesta già compilata.

## SEO

- Title e description mirati (legal design, compliance by design, GDPR, AI Act, EAA, dark pattern).
- `canonical` e `hreflang` su `https://www.legalproductstudio.tech/`, Open Graph e Twitter card.
- Dati strutturati JSON-LD: `ProfessionalService` con catalogo servizi, `WebSite`, `WebPage`.
- `robots.txt`, `sitemap.xml` e `llms.txt`.
- Nessuna risorsa di terze parti: pagina leggera e veloce.

Dopo la pubblicazione verifica il dominio in Google Search Console e Bing Webmaster Tools e invia `sitemap.xml`. Se il dominio non usa `www`, aggiorna gli URL assoluti in `index.html`, `robots.txt`, `sitemap.xml` e `llms.txt`.

## Prima di andare online

1. **Dati dello studio.** Verifica l'indirizzo `ciao@legalproductstudio.tech` e sostituisci `P.IVA 00000000000` nel footer e `[ragione sociale e indirizzo]` nella finestra "Privacy in breve".
2. **Modulo.** Imposta `data-endpoint` (vedi sopra).
3. **Contenuti legali.** I riferimenti normativi e l'informativa vanno fatti rivedere dal giurista dello studio.

## Scelte di progetto

- **Il sito pratica ciò che vende.** Nessun cookie, nessun tracker, nessuna richiesta a terze parti, navigazione da tastiera, focus visibile, pulsanti da almeno 44 px, rispetto di `prefers-reduced-motion`. Verificato con axe-core (WCAG 2.2 AA, nessuna violazione).
- **Tipografia.** Atkinson Hyperlegible, progettato dal Braille Institute per chi ha una vista ridotta: niente corsivi, niente maiuscole spaziate, nessun testo sotto i 14 px.
- **Linguaggio visivo.** Uno "statuto in revisione": testo barrato in rosso e inserimenti in blu come nelle revisioni di un documento, timbro alla conferma dell'iscrizione.

## Pubblicazione

Funziona su qualsiasi hosting statico. Il file `.nojekyll` dice a GitHub Pages di servire i file così come sono. Con GitHub Pages: *Settings → Pages*, *Source: Deploy from a branch*, branch `main` e cartella `/ (root)`. Per il dominio, scrivi `www.legalproductstudio.tech` in *Custom domain* e crea presso il provider un record `CNAME` da `www` a `mikpozzo93.github.io`.
