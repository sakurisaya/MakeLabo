import math
def hex_to_rgb(hex_code: str):
    hex_code = hex_code.lstrip('#')[:6]
    return tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))

def hex_to_hsv(hex_code: str):
    """HEX を HSV (色相0-360, 彩度0-100, 明度0-100) に変換する"""
    r, g, b = (v / 255.0 for v in hex_to_rgb(hex_code))
    v = max(r, g, b)
    d = v - min(r, g, b)
    s = 0 if v == 0 else d / v
    h = 0
    if d != 0:
        if v == r:
            h = ((g - b) / d + (6 if g < b else 0)) / 6
        elif v == g:
            h = ((b - r) / d + 2) / 6
        else:
            h = ((r - g) / d + 4) / 6
    return round(h * 360), round(s * 100), round(v * 100)

# PCCS各色相のV-toneの基準H角度（V-toneの代表色から算出）
PCCS_HUE_ANGLES = [
    340, 350, 0,   14,  20,  30,  48,  54,   # 1-8
     64,  77, 97, 125, 158, 174, 185, 204,   # 9-16
    219, 237, 242, 252, 262, 282, 303, 325   # 17-24
]

def angle_to_pccs_hue(angle: int) -> int:
    """H角度 → 最も近いPCCS色相番号（1-24）"""
    min_diff = float('inf')
    closest = 1
    for i, ref in enumerate(PCCS_HUE_ANGLES):
        diff = abs(angle - ref)
        if diff > 180:
            diff = 360 - diff  # 環状距離
        if diff < min_diff:
            min_diff = diff
            closest = i + 1
    return closest

def sv_to_pccs_tone(s: int, v: int) -> str:
    """HSV S+V → PCCS トーン名 + カスタム拡張トーン"""
    
    # 1. すべての彩度帯における「極めて暗い有彩色」
    if v < 20: 
        return 'vdk'  # Very Dark (限りなく黒に近い色味)

    # 2. PCCSでカバーされない超低彩度領域 (6 <= S < 15)
    if s < 15:
        if v >= 85: return 'vp'    # Very Pale
        if v >= 65: return 'pg'    # Pale Grayish
        if v >= 45: return 'mg'    # Middle Grayish
        return 'vkg'               # Very Grayish (V < 45)

    # 3. 純色・暗清色 (白が混ざっていない: S >= 85)
    if s >= 85:
        if v >= 85: return 'V'    # Vivid (明清・純色)
        if v >= 55: return 'dp'   # Deep (暗清色)
        return 'dk'               # Dark (暗清色でかなり暗い)

    # 4. 明清色・高彩度濁色 (65 <= S < 85)
    if s >= 65:
        if v >= 85: return 'b'    # Bright (明清色: やや白混じり)
        if v >= 55: return 's'    # Strong (濁色: 彩度も明度も中程度)
        return 'dk'               # Dark (またはDeep領域)

    # 5. 明清色・中彩度濁色 (45 <= S < 65)
    if s >= 45:
        if v >= 85: return 'lt'   # Light (明清色)
        if v >= 60: return 'sf'   # Soft (濁色: やや明るい)
        return 'd'                # Dull (濁色: 暗い)

    # 6. 明清色・低彩度濁色 (15 <= S < 45)
    if s >= 15:
        if v >= 85: return 'p'    # Pale (明清色)
        if v >= 65: return 'ltg'  # Light Grayish (濁色)
        if v >= 45: return 'g'    # Grayish (濁色)
        return 'dkg'              # Dark Grayish (濁色)
        
    return 'W'

def find_closest_pccs(target_hex: str):
    """デジタルカラーピッカー（HSV）の直感に完全準拠した新基準PCCS判定"""
    h, s, v = hex_to_hsv(target_hex)

    # 1. 極暗領域（明度が低すぎる場合はすべて黒または極暗色）
    if v < 15:
        if s < 6: return {"tone": 'Bk', "hue": 0}
        return {"tone": 'vdk', "hue": angle_to_pccs_hue(h)}

    # 2. 無彩色 (S < 6)
    if s < 6:
        if v >= 90: tone = 'W'
        elif v >= 75: tone = 'N9'
        elif v >= 55: tone = 'N7'
        elif v >= 35: tone = 'N5'
        else: tone = 'N3'
        return {"tone": tone, "hue": 0}

    h_idx = angle_to_pccs_hue(h)

    # 3. 超低彩度領域 (6 <= S < 15) はカスタム拡張トーン
    if s < 15:
        if v >= 85: return {"tone": 'vp', "hue": h_idx}
        if v >= 65: return {"tone": 'pg', "hue": h_idx}
        if v >= 45: return {"tone": 'mg', "hue": h_idx}
        return {"tone": 'vg', "hue": h_idx}

    # 4. 有彩色の空間分類（ユーザーの「右上は必ずVivid」というデジタル直感を最優先）
    
    # 【ピッカー右端】超高彩度 (S >= 80)
    if s >= 80:
        if v >= 85: return {"tone": 'V', "hue": h_idx}    # 右上：純色 Vivid
        if v >= 55: return {"tone": 'dp', "hue": h_idx}   # 中央右：暗清色 Deep
        return {"tone": 'dk', "hue": h_idx}               # 右下：暗清色 Dark

    # 【ピッカー右寄り】高〜中彩度 (60 <= S < 80)
    if s >= 60:
        if v >= 85: return {"tone": 'b', "hue": h_idx}    # 上側：明清色 Bright (白混じり)
        if v >= 55: return {"tone": 's', "hue": h_idx}    # 中段：濁色 Strong (グレー混じり)
        if v >= 40: return {"tone": 'd', "hue": h_idx}    # 下段：濁色 Dull
        return {"tone": 'dk', "hue": h_idx}               # 最下段：Dark

    # 【ピッカー中央】中彩度 (30 <= S < 60)
    if s >= 30:
        if v >= 85: return {"tone": 'lt', "hue": h_idx}   # 上側：明清色 Light
        if v >= 60: return {"tone": 'sf', "hue": h_idx}   # 中段：濁色 Soft
        if v >= 40: return {"tone": 'd', "hue": h_idx}    # 下段：濁色 Dull
        return {"tone": 'dk', "hue": h_idx}               # 最下段：Dark

    # 【ピッカー左寄り】低彩度 (15 <= S < 30)
    if s >= 15:
        if v >= 85: return {"tone": 'p', "hue": h_idx}    # 上側：明清色 Pale
        if v >= 60: return {"tone": 'ltg', "hue": h_idx}  # 中段：濁色 Light Grayish
        if v >= 40: return {"tone": 'g', "hue": h_idx}    # 下段：濁色 Grayish
        return {"tone": 'dkg', "hue": h_idx}              # 最下段：Dark Grayish

    return {"tone": 'W', "hue": 0}



