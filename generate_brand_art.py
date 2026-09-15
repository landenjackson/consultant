import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out_dir = '/home/ubuntu/consultant/public/brand'
os.makedirs(out_dir, exist_ok=True)

# -------------------------------------------------------------
# HELPER: Draw Luxury Radial / Ambient Glow Background
# -------------------------------------------------------------
def create_studio_backdrop(width, height):
    base = Image.new('RGBA', (width, height), (7, 9, 13, 255))
    
    # Layer 1: Ambient Top Emerald Flare
    flare = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    flare_draw = ImageDraw.Draw(flare)
    cx, cy = width // 2, int(height * 0.2)
    radius = int(min(width, height) * 0.75)
    
    for r in range(radius, 0, -8):
        alpha = int(45 * (1 - r / radius)**1.8)
        flare_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(34, 197, 94, alpha))
        
    # Layer 2: Deep Indigo Secondary Glow for premium contrast
    indigo_cx, indigo_cy = int(width * 0.85), int(height * 0.85)
    indigo_r = int(min(width, height) * 0.6)
    for r in range(indigo_r, 0, -10):
        alpha = int(25 * (1 - r / indigo_r)**2)
        flare_draw.ellipse([indigo_cx - r, indigo_cy - r, indigo_cx + r, indigo_cy + r], fill=(56, 189, 248, alpha))
        
    flare = flare.filter(ImageFilter.GaussianBlur(25))
    return Image.alpha_composite(base, flare)

# -------------------------------------------------------------
# 1. ICON RENDERING (1024 x 1024)
# -------------------------------------------------------------
def generate_magic_icon():
    size = 1024
    bg = create_studio_backdrop(size, size)
    
    # Supersampling canvas for ultra-crisp edges (2x scale)
    ss = 2
    canvas_size = size * ss
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    # Squircle Container with Layered Glassmorphism
    pad = 52 * ss
    r = 220 * ss
    
    # Card drop shadow
    shadow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([pad + 10*ss, pad + 25*ss, canvas_size - pad + 10*ss, canvas_size - pad + 25*ss], 
                             radius=r, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30 * ss))
    canvas = Image.alpha_composite(canvas, shadow)
    draw = ImageDraw.Draw(canvas)
    
    # Obsidian Glass Card Base
    draw.rounded_rectangle([pad, pad, canvas_size - pad, canvas_size - pad], 
                           radius=r, fill=(13, 17, 24, 240), outline=(28, 36, 52, 255), width=int(5*ss))
    
    # Emerald Outer Border Glow
    draw.rounded_rectangle([pad + int(6*ss), pad + int(6*ss), canvas_size - pad - int(6*ss), canvas_size - pad - int(6*ss)], 
                           radius=r - int(6*ss), outline=(34, 197, 94, 90), width=int(3*ss))
    
    # Cubic Bezier Star Points
    def s(v):
        return v * (canvas_size / 120.0)

    def bezier_point(p0, p1, p2, p3, t):
        return (
            (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0],
            (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        )

    curve_points = []
    steps = 40
    curve_points.extend([bezier_point((s(60), s(16)), (s(60), s(38)), (s(38), s(60)), (s(16), s(60)), i/steps) for i in range(steps)])
    curve_points.extend([bezier_point((s(16), s(60)), (s(38), s(60)), (s(60), s(82)), (s(60), s(104)), i/steps) for i in range(steps)])
    curve_points.extend([bezier_point((s(60), s(104)), (s(60), s(82)), (s(82), s(60)), (s(104), s(60)), i/steps) for i in range(steps)])
    curve_points.extend([bezier_point((s(104), s(60)), (s(82), s(60)), (s(60), s(38)), (s(60), s(16)), i/steps) for i in range(steps)])

    # Star Bloom Layer
    bloom = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(bloom)
    b_draw.line(curve_points + [curve_points[0]], fill=(74, 222, 128, 160), width=int(s(16)), joint='curve')
    bloom = bloom.filter(ImageFilter.GaussianBlur(15 * ss))
    canvas = Image.alpha_composite(canvas, bloom)
    draw = ImageDraw.Draw(canvas)

    # Core Sharp Emerald Star Line
    draw.line(curve_points + [curve_points[0]], fill=(34, 197, 94, 255), width=int(s(8)), joint='curve')
    
    # Inner Soft Core Accent Line
    draw.line(curve_points + [curve_points[0]], fill=(255, 255, 255, 120), width=int(s(2.5)), joint='curve')

    # Top-Right Plus (+) with Neon Bloom
    pw = int(s(7.2))
    p_bloom = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    pb_draw = ImageDraw.Draw(p_bloom)
    pb_draw.line([(s(86), s(28)), (s(86), s(44))], fill=(74, 222, 128, 180), width=int(pw * 1.8))
    pb_draw.line([(s(78), s(36)), (s(94), s(36))], fill=(74, 222, 128, 180), width=int(pw * 1.8))
    p_bloom = p_bloom.filter(ImageFilter.GaussianBlur(10 * ss))
    canvas = Image.alpha_composite(canvas, p_bloom)
    draw = ImageDraw.Draw(canvas)
    
    draw.line([(s(86), s(28)), (s(86), s(44))], fill=(74, 222, 128, 255), width=pw)
    draw.line([(s(78), s(36)), (s(94), s(36))], fill=(74, 222, 128, 255), width=pw)
    # Bright center core
    draw.line([(s(86), s(29)), (s(86), s(43))], fill=(255, 255, 255, 200), width=int(pw * 0.35))
    draw.line([(s(79), s(36)), (s(93), s(36))], fill=(255, 255, 255, 200), width=int(pw * 0.35))

    # Bottom-Left Telemetry Dot (•) with Radiant Glow
    cx_dot, cy_dot, cr = s(34), s(86), s(6.5)
    dot_bloom = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    db_draw = ImageDraw.Draw(dot_bloom)
    db_draw.ellipse([cx_dot - cr*2, cy_dot - cr*2, cx_dot + cr*2, cy_dot + cr*2], fill=(74, 222, 128, 150))
    dot_bloom = dot_bloom.filter(ImageFilter.GaussianBlur(8 * ss))
    canvas = Image.alpha_composite(canvas, dot_bloom)
    draw = ImageDraw.Draw(canvas)
    
    draw.ellipse([cx_dot - cr, cy_dot - cr, cx_dot + cr, cy_dot + cr], fill=(74, 222, 128, 255))
    draw.ellipse([cx_dot - cr*0.4, cy_dot - cr*0.4, cx_dot + cr*0.4, cy_dot + cr*0.4], fill=(255, 255, 255, 220))

    # Downsample to target size (Antialiased Luxury Finish)
    final_card = canvas.resize((size, size), Image.Resampling.LANCZOS)
    final_icon = Image.alpha_composite(bg, final_card)
    final_icon.save(f'{out_dir}/consultant_studio_magic_icon.png')
    return final_icon

# -------------------------------------------------------------
# 2. BRAND BANNER RENDERING (2400 x 800 Widescreen)
# -------------------------------------------------------------
def generate_magic_brand_banner(icon_img):
    w, h = 2400, 800
    bg = create_studio_backdrop(w, h)
    
    # Scale icon badge
    badge_size = 460
    icon_resized = icon_img.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    
    # Place Icon Badge on left
    badge_x = 160
    badge_y = (h - badge_size) // 2
    bg.paste(icon_resized, (badge_x, badge_y), icon_resized)
    
    draw = ImageDraw.Draw(bg)
    
    # Typography using high-contrast bold sans
    font_pill = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 32)
    font_h1 = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 130)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 44)
    font_meta = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 32)
    
    tx = badge_x + badge_size + 110
    
    # 1. Executive Status Tag Pill
    pill_y = badge_y + 20
    draw.rounded_rectangle([tx, pill_y, tx + 460, pill_y + 54], radius=27, 
                           fill=(34, 197, 94, 25), outline=(34, 197, 94, 90), width=2)
    draw.ellipse([tx + 22, pill_y + 22, tx + 34, pill_y + 34], fill=(74, 222, 128, 255))
    draw.text((tx + 48, pill_y + 11), 'EXECUTIVE INTELLIGENCE', fill=(74, 222, 128, 255), font=font_pill)
    
    # 2. Main Title: "Consultant Studio"
    title_y = pill_y + 70
    draw.text((tx, title_y), 'Consultant Studio', fill=(255, 255, 255, 255), font=font_h1)
    
    # 3. Subtitle / Creed
    sub_y = title_y + 155
    draw.text((tx, sub_y), 'Real-Time Commercial Intelligence & Operations Platform', fill=(148, 163, 184, 255), font=font_sub)
    
    # 4. Domain & Verification Anchor
    meta_y = sub_y + 75
    draw.text((tx, meta_y), '🌐 consultant-studio.app', fill=(34, 197, 94, 255), font=font_meta)
    draw.text((tx + 460, meta_y), '•', fill=(100, 116, 139, 255), font=font_meta)
    draw.text((tx + 500, meta_y), 'HUMAN-IN-THE-LOOP ORCHESTRATION', fill=(148, 163, 184, 255), font=font_meta)

    bg.save(f'{out_dir}/consultant_studio_magic_brand.png')
    print('Magic Brand Banner saved to', out_dir)

icon = generate_magic_icon()
generate_magic_brand_banner(icon)
