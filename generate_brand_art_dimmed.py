import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out_dir = '/home/ubuntu/consultant/public/brand'
os.makedirs(out_dir, exist_ok=True)

# -------------------------------------------------------------
# HELPER: Subdued Deep Obsidian / Low-Glare Studio Backdrop
# -------------------------------------------------------------
def create_subdued_backdrop(width, height):
    base = Image.new('RGBA', (width, height), (8, 10, 13, 255))
    
    # Soft, subtle top emerald atmosphere (dimmed alpha)
    flare = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    flare_draw = ImageDraw.Draw(flare)
    cx, cy = width // 2, int(height * 0.15)
    radius = int(min(width, height) * 0.65)
    
    for r in range(radius, 0, -12):
        alpha = int(18 * (1 - r / radius)**2)
        flare_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(34, 197, 94, alpha))
        
    flare = flare.filter(ImageFilter.GaussianBlur(35))
    return Image.alpha_composite(base, flare)

# -------------------------------------------------------------
# 1. SUBDUED ICON RENDERING (1024 x 1024)
# -------------------------------------------------------------
def generate_dimmed_icon():
    size = 1024
    bg = create_subdued_backdrop(size, size)
    
    ss = 2
    canvas_size = size * ss
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    pad = 54 * ss
    r = 210 * ss
    
    # Subtle dark card base
    draw.rounded_rectangle([pad, pad, canvas_size - pad, canvas_size - pad], 
                           radius=r, fill=(11, 14, 20, 255), outline=(22, 28, 40, 255), width=int(4*ss))
    
    # Soft emerald inner border (toned down)
    draw.rounded_rectangle([pad + int(6*ss), pad + int(6*ss), canvas_size - pad - int(6*ss), canvas_size - pad - int(6*ss)], 
                           radius=r - int(6*ss), outline=(34, 197, 94, 45), width=int(2.5*ss))
    
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

    # Subtle Star Bloom (dimmed)
    bloom = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(bloom)
    b_draw.line(curve_points + [curve_points[0]], fill=(34, 197, 94, 60), width=int(s(12)), joint='curve')
    bloom = bloom.filter(ImageFilter.GaussianBlur(12 * ss))
    canvas = Image.alpha_composite(canvas, bloom)
    draw = ImageDraw.Draw(canvas)

    # Core Crisp Emerald Star Line
    draw.line(curve_points + [curve_points[0]], fill=(34, 197, 94, 230), width=int(s(7)), joint='curve')

    # Top-Right Plus (+)
    pw = int(s(6.5))
    draw.line([(s(86), s(28)), (s(86), s(44))], fill=(74, 222, 128, 230), width=pw)
    draw.line([(s(78), s(36)), (s(94), s(36))], fill=(74, 222, 128, 230), width=pw)

    # Bottom-Left Telemetry Dot (•)
    cx_dot, cy_dot, cr = s(34), s(86), s(6.0)
    draw.ellipse([cx_dot - cr, cy_dot - cr, cx_dot + cr, cy_dot + cr], fill=(74, 222, 128, 230))

    final_card = canvas.resize((size, size), Image.Resampling.LANCZOS)
    final_icon = Image.alpha_composite(bg, final_card)
    final_icon.save(f'{out_dir}/consultant_studio_dimmed_icon.png')
    return final_icon

# -------------------------------------------------------------
# 2. SUBDUED BRAND BANNER RENDERING (2400 x 800)
# -------------------------------------------------------------
def generate_dimmed_banner(icon_img):
    w, h = 2400, 800
    bg = create_subdued_backdrop(w, h)
    
    badge_size = 440
    icon_resized = icon_img.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    
    badge_x = 160
    badge_y = (h - badge_size) // 2
    bg.paste(icon_resized, (badge_x, badge_y), icon_resized)
    
    draw = ImageDraw.Draw(bg)
    
    font_pill = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 30)
    font_h1 = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 124)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 40)
    font_meta = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 30)
    
    tx = badge_x + badge_size + 110
    
    # 1. Executive Status Tag Pill (Subtle & Matte)
    pill_y = badge_y + 30
    draw.rounded_rectangle([tx, pill_y, tx + 430, pill_y + 48], radius=24, 
                           fill=(34, 197, 94, 15), outline=(34, 197, 94, 55), width=1)
    draw.ellipse([tx + 20, pill_y + 19, tx + 30, pill_y + 29], fill=(74, 222, 128, 220))
    draw.text((tx + 44, pill_y + 10), 'EXECUTIVE INTELLIGENCE', fill=(74, 222, 128, 220), font=font_pill)
    
    # 2. Main Title: "Consultant Studio" (Clean Crisp White)
    title_y = pill_y + 68
    draw.text((tx, title_y), 'Consultant Studio', fill=(245, 248, 252, 255), font=font_h1)
    
    # 3. Subtitle / Creed (Subdued Slate)
    sub_y = title_y + 148
    draw.text((tx, sub_y), 'Real-Time Commercial Intelligence & Operations Platform', fill=(130, 145, 165, 255), font=font_sub)
    
    # 4. Domain & Verification Anchor (Matte Emerald & Slate)
    meta_y = sub_y + 70
    draw.text((tx, meta_y), '🌐 consultant-studio.app', fill=(34, 197, 94, 220), font=font_meta)
    draw.text((tx + 430, meta_y), '•', fill=(80, 95, 115, 255), font=font_meta)
    draw.text((tx + 465, meta_y), 'HUMAN-IN-THE-LOOP ORCHESTRATION', fill=(130, 145, 165, 255), font=font_meta)

    bg.save(f'{out_dir}/consultant_studio_dimmed_brand.png')
    print('Dimmed brand banner rendered successfully.')

icon = generate_dimmed_icon()
generate_dimmed_banner(icon)
