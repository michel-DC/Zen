from utils.color import rgb_to_hsl

def merge_palettes(all_colors: list[list[tuple[int, int, int]]]) -> list[tuple[int, int, int]]:
    flat = []
    for p in all_colors:
        flat.extend(p)
    
    clusters = []
    for color in flat:
        h, s, l = rgb_to_hsl(color)
        # Moins restrictif sur les neutres
        if s < 5 and (l < 10 or l > 95):
            continue
        
        placed = False
        for cluster in clusters:
            rep_h, _, _ = rgb_to_hsl(cluster[0])
            # Seuil de fusion réduit pour plus de nuances
            if abs(h - rep_h) < 15 or abs(h - rep_h) > 345:
                cluster.append(color)
                placed = True
                break
        if not placed:
            clusters.append([color])
            
    merged = []
    for cluster in clusters:
        avg_r = int(sum(c[0] for c in cluster) / len(cluster))
        avg_g = int(sum(c[1] for c in cluster) / len(cluster))
        avg_b = int(sum(c[2] for c in cluster) / len(cluster))
        merged.append((avg_r, avg_g, avg_b))
    return merged
