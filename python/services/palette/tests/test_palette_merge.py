from services.merger import merge_palettes


def test_merge_palettes_basic() -> None:
    palette1 = [(255, 0, 0), (0, 255, 0)]
    palette2 = [(255, 10, 10), (0, 0, 255)]
    
    merged = merge_palettes([palette1, palette2])
    
    assert len(merged) >= 3


def test_merge_palettes_filtering_neutrals() -> None:
    colors = [[(255, 0, 0), (200, 200, 200), (20, 20, 20)]]
    merged = merge_palettes(colors)
    
    assert len(merged) == 1
    assert merged[0] == (255, 0, 0)
