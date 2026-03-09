import math
from constants import PCCS_COLOR_MAP

# 1. HEX (#ffffff) を RGB (255, 255, 255) に変換する
def hex_to_rgb(hex_code: str):
    hex_code = hex_code.lstrip('#')
    return tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))

# 2. 2つの色の「距離」を計算する（ユークリッド距離）
# これが近いほど「似ている色」と判定
def color_distance(rgb1, rgb2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))

# 3. 入力された色に最も近いPCCSトーンと色相を判定する
def find_closest_pccs(target_hex: str):
    target_rgb = hex_to_rgb(target_hex)
    closest_pccs = {"tone": None, "hue": None}
    min_distance = float('inf')

    for tone, hex_list in PCCS_COLOR_MAP.items():
        for i, hex_val in enumerate(hex_list):
            current_rgb = hex_to_rgb(hex_val)
            dist = color_distance(target_rgb, current_rgb)
            
            if dist < min_distance:
                min_distance = dist
                closest_pccs["tone"] = tone
                closest_pccs["hue"] = i + 1 # 1-24色相
    
    return closest_pccs