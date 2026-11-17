# Compendio Breach the Oblivion — v2.4

- **Home:** l'anteprima dell'Atlante è solo decorativa; non permette selezione, trascinamento o zoom. L'unico accesso alla mappa completa è il link **Apri la mappa** nell'intestazione del riquadro.
- **Movimento ambientale:** i nodi fluttuano lentamente, con bagliori discreti e piccoli impulsi lungo i riferimenti testuali. Le animazioni rispettano `prefers-reduced-motion`.
- **Interfaccia:** comparsa progressiva di sezioni e schede, hover leggero delle card, icone e prerequisiti. Lo scorrimento desktop rimane confinato ai pannelli.
- **Mappa completa:** rimane interattiva, con selezione separata dall'apertura delle schede.
- **Contenuti e Firebase:** invariati. 32 materiali, 120 capacità, 12 Processi alchemici.

## Aggiornamento locale

Estrai lo ZIP nella cartella del sito e sovrascrivi i file, **conservando `.env.local`**.

```powershell
npm install
npm run check
npm run build
npm run dev
```

Non modificare la configurazione Firebase e non ripetere l’importazione dei contenuti. In GitHub, carica i sorgenti aggiornati, inclusa la nuova `src/motion.css`.
