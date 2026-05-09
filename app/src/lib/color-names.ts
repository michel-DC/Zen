export const COLOR_NAMES: Record<string, string> = {
  "#000000": "Noir",
  "#FFFFFF": "Blanc",
  "#FF0000": "Rouge",
  "#00FF00": "Vert",
  "#0000FF": "Bleu",
  "#FFFF00": "Jaune",
  "#00FFFF": "Cyan",
  "#FF00FF": "Magenta",
  "#C0C0C0": "Argent",
  "#808080": "Gris",
  "#800000": "Marron",
  "#808000": "Olive",
  "#008000": "Vert foncé",
  "#800080": "Pourpre",
  "#008080": "Sarcelle",
  "#000080": "Bleu marine",
  "#1A1A2E": "Bleu nuit",
  "#E94560": "Rouge cerise",
  "#F5A623": "Orange miel",
  "#0F3460": "Bleu océan",
  "#dBQuk2": "Beige sable",
  "#7B68EE": "Violet des ondes",
};

/**
 * Retourne le nom de la couleur la plus proche du code hexadécimal fourni.
 * Pour cet exemple, on utilise une recherche exacte ou un fallback.
 */
export function getColorName(hex: string): string {
  const upperHex = hex.toUpperCase();
  if (COLOR_NAMES[upperHex]) {
    return COLOR_NAMES[upperHex];
  }
  
  // Fallback simple : si on n'a pas la couleur exacte, on retourne le code hex
  // ou on pourrait implémenter un algorithme de distance de couleur.
  // Pour rester simple et efficace :
  return `Teinte ${upperHex}`;
}
