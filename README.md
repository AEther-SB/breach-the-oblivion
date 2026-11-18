# Compendio Breach the Oblivion · v2.7.0

**Sito React + Vite per GitHub Pages, con editor GM su Firebase Authentication e Cloud Firestore.** Non serve Firebase Storage: immagini tramite URL HTTPS.

## Editor GM

Dopo il login autorizzato, dal lucchetto in alto crea **Raccolta** oppure **Pagina**. Le raccolte possono contenere altre raccolte e pagine, senza limite fisso di profondità. Alchimia è la sezione principale; Materiali alchemici e Processi alchemici sono due raccolte esistenti con una visualizzazione specializzata. Modifica i loro contenuti tramite il pulsante **Modifica pagina**.

Le pagine possono contenere blocchi di testo, titoli, immagini URL, gallerie, citazioni, riquadri, elenchi, collegamenti singoli o multipli, tabelle e separatori. Blocchi duplicabili, riordinabili ed eliminabili. Per i link interni, puoi cercare una pagina nel selettore; nell'editor di testo, digitando il nome di un elemento appare **una proposta cliccabile**, mai un collegamento automatico. La mappa mostra collegamenti scelti esplicitamente e requisiti alchemici reali, evitando i falsi riferimenti per parole generiche.

Puoi salvare una **bozza** senza modificarne la versione pubblica, pubblicare una revisione e consultare la cronologia. L'editor modifica contenuti sul database senza deploy; il codice e la grafica vanno aggiornati con un push GitHub.

## Dati già su Firestore

**Non reimportare tutto il compendio.** Dopo il deploy e l'accesso GM, usa **Allinea testi iniziali** dal menu del lucchetto. Aggiorna i riferimenti storici ripuliti e la capacità di Amalgama soltanto quando i testi pubblicati coincidono con la v2.5; mantiene anche le precedenti correzioni editoriali e Scudo di Azoth. Le versioni personalizzate dal GM rimangono intatte; le personalizzazioni non vengono sovrascritte. Le raccolte strutturali mancanti vengono aggiunte. Le bozze esistenti vengono rispettate.

La versione iniziale locale del sito incorpora 32 materiali, 120 capacità e 12 processi; il database pubblicato ha comunque precedenza quando è stato inizializzato.

## Avvio e pubblicazione

```powershell
npm install
npm run check
npm run build
npm run dev
```

Carica il codice su GitHub con `git add .`, `git commit -m "Compendio BTO v2.7"`, `git push origin main`. Il workflow in `.github/workflows/deploy.yml` pubblica `dist` su GitHub Pages. Mantieni il tuo `.env.local`, che non deve entrare nel repository. Per il deploy sono previste le variabili `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` nelle Variables di GitHub Actions. Le regole `firestore.rules` esistenti non richiedono cambiamenti.

## Fonti e ambito

- Meccaniche esportate dalla Suite BTE v0.7.36; correzioni: **Scudo di Azoth +1 CA** e **riserva di Amalgama 6/3 per grado di Purezza**.
- Le **26 introduzioni narrative** riviste nella versione precedente erano testi editoriali creati per il sito. I 32 riferimenti storico-alchemici sono ora puramente descrittivi, senza link alle fonti. Le descrizioni originali delle capacità non sono state riscritte.
- Nessun caricamento immagini su Firebase.
- La build Vite va verificata localmente: l'ambiente in cui è stato preparato questo archivio non riesce a raggiungere npm.



## Editor GM v2.7 · importazione e modelli

- **Importa file in blocco** dal menu GM: Markdown, HTML, JSON e cartelle; anteprima, gestione ID duplicati, bozze di default, pubblicazione esplicita.
- **Modelli** per nuove pagine: Personaggio, Luogo, Evento; modelli per raccolte: Raccolta vuota, Archivio personaggi.
- **Posizione leggibile** nel pannello di modifica, senza timestamp numerici.
- **Nessun nuovo deploy per i contenuti**: dal sito pubblico, una volta autorizzato come GM, i file vengono importati direttamente in Firestore.
- `esempi-importazione/` contiene tre file illustrativi da provare senza alterare le regole del compendio.
- Il CSS separa le icone delle sezioni dal testo e usa il blu per la scheda dei Materiali; i vecchi segni Markdown ricevono formattazione in visualizzazione.

Prima di distribuire una nuova build, esegui `npm run check` e `npm run build`.
