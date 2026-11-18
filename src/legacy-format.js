// Formattazione esclusivamente visiva: non modifica parole, numeri, CD o regole.
// Rende evidenti i titoli seguiti da «:» e la vecchia notazione corsiva *...*.
export function formatLegacyMarkup(markup) {
  return String(markup||'')
    .replace(/(<p(?:\s[^>]*)?>)\s*\*([^*<>\n]+)\*(\s*<\/p>)/giu,(_all,start,label,end)=>`${start}<em>${label}</em>${end}`)
    .replace(/(<p(?:\s[^>]*)?>)([A-ZÀ-ÖØ-Ý][\p{L}’'\- ]{2,46}:)(\s+)(?!<)/giu,(_all,start,label,space)=>`${start}<strong>${label}</strong>${space}`)
    .replace(/>([^<>]+)</gu,(_all,plain)=>`>${plain
      .replace(/\*\*([^*\n]+)\*\*/gu,'<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/gu,'<em>$1</em>')
      // Refuso ortografico inequivocabile nel Processo di Digestione.
      .replace(/\bessicare\b/giu,'essiccare')}<`);

}
