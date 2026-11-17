# Breach the Oblivion — aggiornamento v2.3

- Preview della mappa interattiva nella Home (a destra su desktop).
- Rimossa Connessioni dalla barra superiore. La mappa completa resta raggiungibile dalla preview e dalle schede.
- Primo clic sul nodo: seleziona e mette in evidenza le connessioni; il pulsante **Apri scheda** naviga.
- Eliminato il nodo artificiale «Breach the Oblivion» dal grafo.
- Alchimia: card con accenti blu e rame, nessun verde; miglioramenti a spaziatura e contrasto.
- Prerequisiti nelle schede: livello minimo evidenziato, alternative numerate e link ai materiali citati.
- Conservati: 32 materiali, 120 capacità, 12 Processi alchemici, editor GM Firebase, bozze e pubblicazioni, immagini solo da URL, tema scuro predefinito, desktop a 100vh.
- Dipendenze: Firebase 13.4.0, Vite 7.3.8, React Router 7.18.5, override @grpc/grpc-js 1.14.7.

## Aggiornamento locale

1. Arresta il server Vite.
2. Estrai lo ZIP nella cartella del progetto, sostituendo i file. **Conserva `.env.local`**.
3. Esegui `npm install`, `npm run check`, `npm run build`, `npm run dev`.
4. Ricarica il browser. Non reimportare Firebase: i dati già pubblicati vengono mantenuti.

Non caricare su GitHub `node_modules`, `.env.local` o `dist`. Il progetto non richiede Firebase Storage.
