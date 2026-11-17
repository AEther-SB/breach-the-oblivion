// Formattazione non distruttiva del testo originale dei prerequisiti.
export function parseRequirements(source) {
  let text = String(source || 'Nessuno.').trim();
  if (/^nessun[oi]?\.?$/i.test(text)) return {free:true, level:null, routes:[], note:''};
  let note = '';
  text = text.replace(/\s*Verificat[oa] a ogni aumento\.?/i, () => {
    note = 'Da verificare a ogni aumento di Purezza.';
    return '';
  }).trim().replace(/[.;]\s*$/, '');

  let level = null;
  // Estrae il livello obbligatorio senza reinterpretare le combinazioni di materiali.
  text = text.replace(/^Livello Exalt (\d+)\+\s*(?:e\s+|,\s*)?/i, (_all, n) => {
    level = Number(n);
    return '';
  });
  const hasViaFra = /^una via fra:/i.test(text);
  text = text.replace(/^una via fra:\s*/i, '');
  const multiplePaths = /;\s*oppure\s+/i.test(text) || (hasViaFra && text.includes(';'));
  const routeTexts = multiplePaths
    ? text.split(/;\s*(?:oppure\s+)?/i).map(v=>v.trim().replace(/^oppure\s+/i,'').replace(/[.;]\s*$/,'')).filter(Boolean)
    : [text].filter(Boolean);
  return {free:false, level, routes:routeTexts, note};
}

