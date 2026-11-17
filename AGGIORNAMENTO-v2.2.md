# Aggiornamento v2.2 — Connessioni globali

La **Mappa delle connessioni** non si trova più sotto Alchimia: è una sezione generale del sito.

- Barra principale: **HOME · ALCHIMIA · CONNESSIONI**, oltre agli eventuali capitoli creati dal GM.
- **Alchimia** contiene soltanto **Materiali alchemici** e **Processi alchemici**.
- La mappa è in **`#/connessioni`** e include tutti i capitoli e le pagine pubblicate da Firebase, più materiali e processi. Mostra la gerarchia editoriale e i collegamenti testuali espliciti.
- Il vecchio link **`#/alchimia/connessioni`** resta funzionante grazie al reindirizzamento.
- I collegamenti contestuali dei singoli materiali e dei processi aprono la mappa globale.
- Editor GM, contenuti, permessi Firebase e tema scuro predefinito restano invariati.

## Aggiornare il progetto locale

1. Ferma il server Vite (`Ctrl+C`).
2. Estrai questo archivio sopra la cartella del progetto **conservando `.env.local`**.
3. Da terminale esegui `npm install`, `npm run check:relations`, `npm run check:content`, `npm run check:structure`, `npm run build`, `npm run dev`.
4. Verifica `http://localhost:5173/#/connessioni` e la pagina `#/alchimia`.

Non occorre modificare Firebase né reinizializzare Firestore: i dati già pubblicati vengono utilizzati anche nella mappa generale.
