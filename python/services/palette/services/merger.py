from utils.color import rgb_to_hsl, hue_distance


def merge_palettes(all_colors: list[list[tuple[int, int, int]]]) -> list[tuple[int, int, int]]:
    flat: list[tuple[int, int, int]] = []
    for palette in all_colors:
        flat.extend(palette)

    if not flat:
        return []

    clusters: list[list[tuple[int, int, int]]] = []

    for color in flat:
        h, s, l = rgb_to_hsl(color)
        placed = False
        
        for cluster in clusters:
            rh, rs, rl = rgb_to_hsl(cluster[0])
            
            if hue_distance(h, rh) < 10 and abs(s - rs) < 10 and abs(l - rl) < 10:
                cluster.append(color)
                placed = True
                break
        
        if not placed:
            clusters.append([color])

    clusters.sort(key=len, reverse=True)

    merged = []
    for cluster in clusters:
        avg_r = int(sum(c[0] for c in cluster) / len(cluster))
        avg_g = int(sum(c[1] for c in cluster) / len(cluster))
        avg_b = int(sum(c[2] for c in cluster) / len(cluster))
        merged.append((avg_r, avg_g, avg_b))

    if len(merged) < 6:
        existing_hex = {f"#{r:02x}{g:02x}{b:02x}" for r, g, b in merged}
        for color in flat:
            r, g, b = color
            hex_val = f"#{r:02x}{g:02x}{b:02x}"
            if hex_val not in existing_hex:
                merged.append(color)
                existing_hex.add(hex_val)
            if len(merged) >= 6:
                break
                
    return merged[:6]
