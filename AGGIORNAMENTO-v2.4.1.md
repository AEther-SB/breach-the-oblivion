# Compendio BTO — v2.4.1

Correzione del layout della Home: `.home-explore.page-width` non eredita più il limite di `max-width: 1440px`. La sezione delle card occupa il 100% della larghezza disponibile, conservando i margini interni responsivi.

Tutti gli altri componenti, il contenuto, Firebase e l’editor GM restano invariati.

Per aggiornare in locale: conserva `.env.local`, sovrascrivi i file dello ZIP e avvia `npm run dev`.
