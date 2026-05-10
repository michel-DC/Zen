COLOR_NAMES = {
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
    "#7B68EE": "Violet des ondes",
}

def getColorName(hex_code: str) -> str:
    upper_hex = hex_code.upper()
    if upper_hex in COLOR_NAMES:
        return COLOR_NAMES[upper_hex]
    
    # Fallback simple
    return f"Teinte {upper_hex}"
