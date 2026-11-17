# Compendio Breach the Oblivion

Sito pubblico **Vite + React su GitHub Pages**, con editor visuale per il GM basato su **Firebase Authentication e Cloud Firestore**. Niente Firebase Storage: immagini soltanto mediante **URL HTTPS**.

**Contenuti iniziali:** 32 materiali, 120 capacità, 12 Processi alchemici. Niente classi o archetipi. Nelle schede dei materiali la descrizione tematica e alchemica precede i dati meccanici. Layout desktop a 100vh con scorrimento nei pannelli; layout mobile a scorrimento tradizionale. Font EB Garamond e DM Sans, tema scuro predefinito con modalità chiara opzionale. L’interfaccia è organizzata in **HOME · ALCHIMIA, con Materiali e Processi dentro Alchimia e un’anteprima interattiva delle Connessioni a destra nella Home**; Connessioni è una sezione generale del compendio, non una diramazione di Alchimia. I futuri capitoli creati dal GM compariranno accanto alle sezioni principali.

## Aggiornamento v2.3

- La mappa compare **nella home, sulla destra**. Non è un elemento del menu principale: il pulsante **Mappa completa** apre l’atlante globale.
- Cliccando un nodo si mette in evidenza la sua rete; i nodi collegati sono selezionabili anche dalla preview. **Apri scheda** è una scelta separata.
- La mappa non contiene alcun nodo «Breach the Oblivion».
- Le card di Alchimia usano **azzurro e rame**, senza verde; il resto delle sezioni mantiene accenti distinti.
- I prerequisiti sono impaginati come **percorsi alternativi** con link ai materiali nominati; contenuti e meccaniche restano invariati.

## In breve

Il lettore consulta le pagine senza login. Il GM può autenticarsi con Google, modificare direttamente le schede, aggiungere **pagine, capitoli, materiali e Processi alchemici**, inserire testo formattato, collegamenti e immagini da URL. Le modifiche possono essere salvate come **bozza privata** o **pubblicate**. Il sito conserva una cronologia delle pubblicazioni (accessibile solo al GM) da cui recuperare il contenuto precedente.

Firebase **non** pubblica il sito: GitHub Pages ospita React e Firestore ospita i contenuti. Le pubblicazioni non richiedono ulteriori push o deploy. Le pagine dei materiali contengono link automatici ai materiali e ai processi citati nei testi. La **Mappa delle connessioni globale**, accessibile dall’anteprima in Home, collega capitoli, pagine, materiali e processi senza rappresentare il titolo Breach the Oblivion come nodo. Distingue i raggruppamenti editoriali dai riferimenti espliciti nei testi; una modifica pubblicata dal GM aggiorna anche la mappa. I file locali `src/data/compendium.json` restano una copia di partenza consultabile prima dell'inizializzazione Firebase.

## Configurazione Firebase

1. Apri <https://console.firebase.google.com/>, crea un progetto e aggiungi una **Web App**. Copia i quattro parametri `apiKey`, `authDomain`, `projectId`, `appId` (sono configurazioni pubbliche, non password).
2. In **Authentication → Sign-in method** abilita il provider **Google**. In **Authentication → Settings → Authorized domains** aggiungi il dominio `TUO-USERNAME.github.io` (senza `https://` e senza nome repository). Se usi un dominio personalizzato, autorizza anche quello. Per test locali aggiungi `localhost` se necessario.
3. In **Firestore Database** crea il database. Vai alla scheda **Rules**, sostituisci integralmente le regole con il contenuto del file `firestore.rules` e premi **Publish**. **Non usare regole aperte di test**.
4. Pubblica il sito su GitHub Pages (istruzioni sotto). Apri l'icona del lucchetto e accedi con Google: il sito mostrerà il tuo **UID** anche prima di attribuirti il ruolo GM.
5. In **Firestore → Data** crea la raccolta `admins` e un documento con **ID esattamente uguale al tuo UID**. Aggiungi il campo `enabled` di tipo **boolean** con valore `true`. Questo passaggio va fatto manualmente dal proprietario del progetto nella console, non dal browser. Esci e rientra nel sito.
6. Nell'icona del lucchetto appare il comando **Importa compendio iniziale**. Eseguilo **una sola volta**: pubblica i 32 materiali, i 12 processi e il capitolo Alchimia, senza perdere i dati di partenza.

**Ruolo GM:** non basta effettuare il login Google. Le autorizzazioni sono imposte da **Firestore Security Rules** che verificano `admins/<UID>.enabled === true`. Chi non ha il ruolo può soltanto leggere ciò che è pubblicato.

## GitHub Pages

1. Crea un repository GitHub, ad esempio `compendio-breach-the-oblivion`.
2. Carica **tutti i file** estratti dallo ZIP, compresa la directory `.github/`.
3. In **Settings → Secrets and variables → Actions → Variables**, aggiungi:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`

   Copia i valori dalla Web App Firebase (nessun file `.env.local` va pubblicato).
4. In **Settings → Pages → Source**, seleziona **GitHub Actions**.
5. Fai push su `main` o avvia il workflow da **Actions**. GitHub compila Vite, sceglie automaticamente il percorso corretto del repository e pubblica il sito.

Indirizzo tipico: `https://TUO-USERNAME.github.io/NOME-REPOSITORY/`.

## Uso dell'editor

- **Modifica pagina**: appare solo al GM nelle schede dei materiali, sui Processi alchemici e nelle pagine generiche.
- **Salva bozza**: la bozza è visibile al GM, ma i lettori continuano a vedere l'ultima pubblicazione.
- **Pubblica**: i lettori vedono il cambiamento in tempo reale, senza ricompilare GitHub Pages.
- **Nuova pagina / sezione** (menu GM): consente di creare capitoli, pagine, materiali e Processi alchemici.
- **Blocchi**: nelle nuove pagine puoi aggiungere testo ricco, immagini URL e collegamenti. Puoi riordinare o eliminare blocchi.
- **Cronologia pubblicazioni**: carica una versione precedente nell'editor; poi salvala come bozza o pubblicala per ripristinarla.
- **Elimina**: elimina definitivamente una voce; consigliato effettuare prima un'esportazione dei dati Firestore dal proprio progetto.

### Immagini

Incolla un **URL HTTPS** pubblico in un blocco immagine o nell'immagine introduttiva. Aggiungi una descrizione alternativa. Il sito non carica file, non salva immagini in Firestore e non usa Firebase Storage. Alcuni siti esterni impediscono la visualizzazione tramite hotlink: scegli URL stabili e autorizzati. L'immagine potrebbe scomparire se il sito che la ospita la rimuove.

### Collegamenti

- Siti esterni: `https://esempio.it/pagina`.
- Una nuova pagina del compendio: `#/pagina/ID-DELLA-PAGINA`, dove l'ID compare nell'indirizzo dopo aver aperto la pagina.
- Le pagine dei materiali mantengono i collegamenti precedenti `#/alchimia/materiali/NOME`.
- Processi alchemici: `#/alchimia/processi`; i vecchi indirizzi `#/alchimia/processi-di-genesi` e `#/genesi` continuano a funzionare.
- Mappa generale: `#/connessioni` (il vecchio `#/alchimia/connessioni` reindirizza automaticamente). Aprila dalla **anteprima animata e non interattiva sulla destra della Home**. Trascina e usa lo zoom; **cliccare un nodo lo seleziona**, evidenzia i suoi collegamenti e apre il pannello informativo. Solo il pulsante **Apri scheda** naviga alla pagina. Puoi selezionare un nodo anche dall’elenco laterale.

La mappa **non crea legami di lore inventati**: gli archi tratteggiati derivano dalla presenza esplicita del nome di un altro materiale/processo nelle descrizioni; gli archi sottili rappresentano la gerarchia tra capitoli, pagine e categorie alchemiche. Il titolo del sito non è un nodo.

## Sviluppo locale

Usa Node.js 22.12+ e un ambiente con accesso a npm.

```bash
cp .env.example .env.local
# Inserisci i valori Firebase nel file .env.local
npm install
npm run dev
npm run check:content
npm run check:structure
npm run check:relations
npm run check:ui
npm run build
```

**Importante:** non inserire nel repository chiavi di servizio Firebase Admin, password o credenziali private. Le sole variabili `VITE_FIREBASE_*` sono i parametri pubblici della Web App; **le regole Firestore sono il controllo di sicurezza effettivo**.

## Fonte e limiti

I contenuti iniziali sono estratti dalla Suite BTE v0.7.36. La struttura del sito è stata estesa per la gestione editoriale; le regole delle 120 capacità e dei 12 Processi alchemici non sono state riscritte. CD: `6 + Competenza + Purezza effettiva del materiale + modificatore di Intelligenza`, salvo eccezioni.

I test statici verificano la completezza del catalogo, i riferimenti tra voci, l’editor e le regole di sicurezza. **La build Vite e il login/publishing Firebase non sono stati collaudati con un progetto reale in questo ambiente**.

## Aggiornamento dipendenze (novembre 2026)

`package.json` include Firebase 13.4.0, React Router 7.18.5, Vite 7.3.8 e un override mirato `@grpc/grpc-js: 1.14.7` per correggere le segnalazioni di sicurezza gRPC. **Non eseguire `npm audit fix --force`.**

La segnalazione relativa a `picomatch` in una dipendenza di sviluppo di Vite potrebbe permanere finché l’ecosistema non pubblica una versione corretta; non è inclusa nel bundle statico del browser. Esegui `npm install`, poi `npm audit`, `npm audit --omit=dev` e `npm run build`. La validità del codice dopo gli aggiornamenti va verificata sul tuo PC; nell’ambiente di preparazione il registro npm non è accessibile.

**Per GitHub**: carica anche `package.json` e il `package-lock.json` rigenerato da `npm install`, ma non `node_modules`, `.env.local` o `dist`.
