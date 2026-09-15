import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out_dir = '/home/ubuntu/consultant/public/brand'
os.makedirs(out_dir, exist_ok=True)

# Load the verified good dimmed icon
icon_img = Image.open(f'{out_dir}/consultant_studio_dimmed_icon.png')

# Create 2400 x 800 widescreen banner canvas
w, h = 2400, 800
base = Image.new('RGBA', (w, h), (8, 10, 13, 255))

# Soft, subtle background glow
flare = Image.new('RGBA', (w, h), (0, 0, 0, 0))
flare_draw = ImageDraw.Draw(flare)
cx, cy = w // 2, int(h * 0.15)
radius = int(min(w, h) * 0.65)
for r in range(radius, 0, -12):
    alpha = int(18 * (1 - r / radius)**2)
    flare_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(34, 197, 94, alpha))
flare = flare.filter(ImageFilter.GaussianBlur(35))
bg = Image.alpha_composite(base, flare)

# Place Icon Badge on left
badge_size = 460
icon_resized = icon_img.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
badge_x = 150
badge_y = (h - badge_size) // 2
bg.paste(icon_resized, (badge_x, badge_y), icon_resized)

draw = ImageDraw.Draw(bg)

# Fonts
font_pill = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 30)
font_h1 = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 128)
font_sub = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 42)
font_meta = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 32)

tx = badge_x + badge_size + 110

# 1. High-Contrast, Clearly Visible Executive Intelligence Tag Pill
pill_y = badge_y + 24
pill_w = 460
pill_h = 54
# Solid dark card background with emerald border so text POPS
draw.rounded_rectangle([tx, pill_y, tx + pill_w, pill_y + pill_h], radius=14, 
                       fill=(16, 24, 34, 255), outline=(34, 197, 94, 200), width=2)
# Glowing bright indicator dot
draw.ellipse([tx + 20, pill_y + 20, tx + 34, pill_y + 34], fill=(74, 222, 128, 255))
# Crisp, bright mint-white text that is 100% readable
draw.text((tx + 48, pill_y + 11), 'EXECUTIVE INTELLIGENCE', fill=(74, 222, 128, 255), font=font_pill)

# 2. Main Title: "Consultant Studio"
title_y = pill_y + 76
draw.text((tx, title_y), 'Consultant Studio', fill=(255, 255, 255, 255), font=font_h1)

# 3. Subtitle / Creed
sub_y = title_y + 152
draw.text((tx, sub_y), 'Real-Time Commercial Intelligence & Operations Platform', fill=(160, 175, 195, 255), font=font_sub)

# 4. Domain & Verification Anchor
meta_y = sub_y + 74
draw.text((tx, meta_y), '🌐 consultant-studio.app', fill=(34, 197, 94, 255), font=font_meta)
draw.text((tx + 440, meta_y), '•', fill=(100, 116, 139, 255), font=font_meta)
draw.text((tx + 480, meta_y), 'HUMAN-IN-THE-LOOP ORCHESTRATION', fill=(160, 175, 195, 255), font=font_meta)

bg.save(f'{out_dir}/consultant_studio_final_banner.png')
print('Final banner saved successfully.')
