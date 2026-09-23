import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import subprocess
import os

def set_cell_margins(cell, top=0, bottom=0, left=0, right=0):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_section_header(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.05
    
    # Bottom border on paragraph
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                     r'<w:bottom w:val="single" w:sz="6" w:space="2" w:color="182030"/>'
                     r'</w:pBdr>')
    pPr.append(pBdr)
    
    run = p.add_run(title)
    run.font.name = 'Arial'
    run.font.size = Pt(9.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(12, 16, 23) # Near black #0C1017
    return p

def create_resume():
    doc = docx.Document()
    
    # Page setup - 0.42 inch margins for exact 1-page density
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.40)
        s.bottom_margin = Inches(0.40)
        s.left_margin = Inches(0.45)
        s.right_margin = Inches(0.45)
        s.page_width = Inches(8.5)
        s.page_height = Inches(11.0)
        
    # HEADER
    p_name = doc.add_paragraph()
    p_name.paragraph_format.space_before = Pt(0)
    p_name.paragraph_format.space_after = Pt(1)
    p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_name = p_name.add_run("LANDEN JACKSON")
    r_name.font.name = 'Arial'
    r_name.font.size = Pt(15.5)
    r_name.font.bold = True
    r_name.font.color.rgb = RGBColor(7, 9, 13)
    
    # TITLE SUBHEAD
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(2)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Operations & Commercial Growth Strategist • Systems & Unit-Economic Operator")
    r_sub.font.name = 'Arial'
    r_sub.font.size = Pt(9.5)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(34, 139, 34) # Forest green #228B22 / #16a34a
    
    # CONTACT INFO (No phone number on LinkedIn background rule / standard header)
    p_contact = doc.add_paragraph()
    p_contact.paragraph_format.space_before = Pt(0)
    p_contact.paragraph_format.space_after = Pt(4)
    p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_cont = p_contact.add_run("Tallahassee, FL  •  (850) 459-9148  •  jacksonlanden3986@gmail.com  •  linkedin.com/in/landenjackson  •  consultant-studio.app")
    r_cont.font.name = 'Arial'
    r_cont.font.size = Pt(8.5)
    r_cont.font.color.rgb = RGBColor(75, 85, 99)
    
    # EXECUTIVE PROFILE
    add_section_header(doc, "EXECUTIVE PROFILE")
    p_prof = doc.add_paragraph()
    p_prof.paragraph_format.space_before = Pt(2)
    p_prof.paragraph_format.space_after = Pt(4)
    p_prof.paragraph_format.line_spacing = 1.10
    r_prof = p_prof.add_run(
        "Systems-driven multi-unit operator and commercial strategist specializing in frontline unit economics, floor throughput engineering, and zero-overhead workflow automation. Track record of unlocking gross margin capacity, eliminating peak-service labor bottlenecks, and protecting 100% full-price realization without discounting. Developer of client-side diagnostic systems that model P&Ls, 13-week cash flows, and operating variance in real time."
    )
    r_prof.font.name = 'Arial'
    r_prof.font.size = Pt(8.5)
    r_prof.font.color.rgb = RGBColor(30, 41, 59)
    
    # CORE COMPETENCIES
    add_section_header(doc, "CORE COMPETENCIES")
    comp_data = [
        ("Operations & Throughput: ", "Line & Expo Velocity, Labor Schedule Calibration, Peak Turn Rate, Kitchen Workflow Re-sequencing"),
        ("Financial & Margin Defense: ", "COGS & Prime Cost Reduction, Zero-Discount Yield Management, Menu Engineering, Inventory Controls"),
        ("Systems & Software: ", "Client-Side Financial Diagnostics, 13-Week Cash Flow Models, POS Real-Time Telemetry, MS Excel (Advanced)")
    ]
    for label, desc in comp_data:
        p_c = doc.add_paragraph()
        p_c.paragraph_format.space_before = Pt(0)
        p_c.paragraph_format.space_after = Pt(1.5)
        p_c.paragraph_format.line_spacing = 1.08
        p_c.paragraph_format.left_indent = Inches(0.12)
        
        r_bullet = p_c.add_run("• ")
        r_bullet.font.name = 'Arial'
        r_bullet.font.size = Pt(8.5)
        r_bullet.font.bold = True
        
        r_lbl = p_c.add_run(label)
        r_lbl.font.name = 'Arial'
        r_lbl.font.size = Pt(8.5)
        r_lbl.font.bold = True
        r_lbl.font.color.rgb = RGBColor(15, 23, 42)
        
        r_txt = p_c.add_run(desc)
        r_txt.font.name = 'Arial'
        r_txt.font.size = Pt(8.5)
        r_txt.font.color.rgb = RGBColor(51, 65, 85)

    # OPERATIONAL VENTURES & SYSTEMS
    add_section_header(doc, "OPERATIONAL VENTURES & SYSTEMS DEVELOPMENT")
    
    # Job Header
    p_jh1 = doc.add_paragraph()
    p_jh1.paragraph_format.space_before = Pt(2)
    p_jh1.paragraph_format.space_after = Pt(1.5)
    
    r_co = p_jh1.add_run("Consultant Studio ")
    r_co.font.name = 'Arial'
    r_co.font.size = Pt(9.0)
    r_co.font.bold = True
    r_co.font.color.rgb = RGBColor(15, 23, 42)
    
    r_loc = p_jh1.add_run("— Tallahassee, FL\t\t\t")
    r_loc.font.name = 'Arial'
    r_loc.font.size = Pt(8.5)
    r_loc.font.color.rgb = RGBColor(100, 116, 139)
    
    r_title = p_jh1.add_run("Founder & Lead Product Architect | 2026 – Present")
    r_title.font.name = 'Arial'
    r_title.font.size = Pt(8.5)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(51, 65, 85)
    
    p_jh1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    
    bullets_cs = [
        "Engineered a zero-infrastructure browser financial diagnostic engine delivering 13-week cash flow projections, P&L modeling, and variance analytics directly in client memory at $0.00/month recurring compute overhead.",
        "Built automated client-side parsing pipelines converting complex financial records and POS logs into MSO-compliant workbooks (.xlsx), executive memos (.docx), and board decks (.pptx) with zero data privacy exposure.",
        "Architected dynamic margin and prime cost diagnostic tools deployed across independent service operators to identify labor bleed and waste leakage within <3 minutes of data ingest."
    ]
    for b in bullets_cs:
        p_b = doc.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(2)
        p_b.paragraph_format.line_spacing = 1.08
        p_b.paragraph_format.left_indent = Inches(0.15)
        
        r_b = p_b.add_run(f"• {b}")
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(8.3)
        r_b.font.color.rgb = RGBColor(30, 41, 59)

    # PROFESSIONAL EXPERIENCE
    add_section_header(doc, "PROFESSIONAL EXPERIENCE")
    
    # Ma's Diner
    p_jh2 = doc.add_paragraph()
    p_jh2.paragraph_format.space_before = Pt(2)
    p_jh2.paragraph_format.space_after = Pt(1.5)
    
    r_co2 = p_jh2.add_run("Ma's Diner ")
    r_co2.font.name = 'Arial'
    r_co2.font.size = Pt(9.0)
    r_co2.font.bold = True
    r_co2.font.color.rgb = RGBColor(15, 23, 42)
    
    r_loc2 = p_jh2.add_run("— Tallahassee, FL\t\t")
    r_loc2.font.name = 'Arial'
    r_loc2.font.size = Pt(8.5)
    r_loc2.font.color.rgb = RGBColor(100, 116, 139)
    
    r_title2 = p_jh2.add_run("Marketing & Operations Growth Specialist | Apr 2025 – Present")
    r_title2.font.name = 'Arial'
    r_title2.font.size = Pt(8.5)
    r_title2.font.bold = True
    r_title2.font.color.rgb = RGBColor(51, 65, 85)
    
    bullets_mas = [
        "Engineered shift-level expo handoff protocols and line-sequencing, cutting average ticket times by 90 seconds and unlocking +$2,200 in gross sales per peak service (+12% throughput lift).",
        "Recovered $35,000 in annualized gross margin (4.2% COGS reduction) by implementing shift-level waste logging and strict portioning recalibration across 3 critical dayparts.",
        "Scaled weekday customer volume by 25% across an 8-week targeted local trade-area campaign while defending 100% full-price realization with zero margin-eroding discounts.",
        "Audited trade-area dining density and competitor pricing arrays, executing hyper-targeted local capture to build a 5% repeat baseline from ground zero."
    ]
    for b in bullets_mas:
        p_b = doc.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(2)
        p_b.paragraph_format.line_spacing = 1.08
        p_b.paragraph_format.left_indent = Inches(0.15)
        
        r_b = p_b.add_run(f"• {b}")
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(8.3)
        r_b.font.color.rgb = RGBColor(30, 41, 59)

    # Walk-On's
    p_jh3 = doc.add_paragraph()
    p_jh3.paragraph_format.space_before = Pt(3)
    p_jh3.paragraph_format.space_after = Pt(1.5)
    
    r_co3 = p_jh3.add_run("Walk-On's Sports Bistreaux ")
    r_co3.font.name = 'Arial'
    r_co3.font.size = Pt(9.0)
    r_co3.font.bold = True
    r_co3.font.color.rgb = RGBColor(15, 23, 42)
    
    r_loc3 = p_jh3.add_run("— Tallahassee, FL\t\t")
    r_loc3.font.name = 'Arial'
    r_loc3.font.size = Pt(8.5)
    r_loc3.font.color.rgb = RGBColor(100, 116, 139)
    
    r_title3 = p_jh3.add_run("Operations & Shift Coordinator | Jun 2021 – Feb 2025")
    r_title3.font.name = 'Arial'
    r_title3.font.size = Pt(8.5)
    r_title3.font.bold = True
    r_title3.font.color.rgb = RGBColor(51, 65, 85)
    
    bullets_wo = [
        "Recalibrated closing procedures and station breakdown sequences, recovering 22 minutes of idle labor per shift ($18,000 annual margin capture) and reallocating capacity to prep for high-volume lunch rushes.",
        "Designed a modular kitchen cross-training matrix that condensed line-cook onboarding from 14 shifts to 8 while sustaining 98% order accuracy across $8,000+ peak game-day services.",
        "Directed floor throughput and concurrent dual-channel fulfillment (in-venue floor seating and 10–60 simultaneous delivery orders) during max-capacity events with 0% fulfillment error rates.",
        "Standardized station operating checklists and opening/closing handovers across 15+ frontline staff, reducing shift transition friction and communication errors by 50%."
    ]
    for b in bullets_wo:
        p_b = doc.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(2)
        p_b.paragraph_format.line_spacing = 1.08
        p_b.paragraph_format.left_indent = Inches(0.15)
        
        r_b = p_b.add_run(f"• {b}")
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(8.3)
        r_b.font.color.rgb = RGBColor(30, 41, 59)

    # EDUCATION & CREDENTIALS
    add_section_header(doc, "EDUCATION & CREDENTIALS")
    
    p_ed = doc.add_paragraph()
    p_ed.paragraph_format.space_before = Pt(2)
    p_ed.paragraph_format.space_after = Pt(1.5)
    
    r_uni = p_ed.add_run("Florida State University ")
    r_uni.font.name = 'Arial'
    r_uni.font.size = Pt(9.0)
    r_uni.font.bold = True
    r_uni.font.color.rgb = RGBColor(15, 23, 42)
    
    r_loc_ed = p_ed.add_run("— Tallahassee, FL\t\t\t")
    r_loc_ed.font.name = 'Arial'
    r_loc_ed.font.size = Pt(8.5)
    r_loc_ed.font.color.rgb = RGBColor(100, 116, 139)
    
    r_deg = p_ed.add_run("Bachelor of Science in Marketing | May 2024 – Jul 2026")
    r_deg.font.name = 'Arial'
    r_deg.font.size = Pt(8.5)
    r_deg.font.bold = True
    r_deg.font.color.rgb = RGBColor(51, 65, 85)
    
    ed_bullets = [
        "Empirical Academic Research: Co-authored study on consumer trust dynamics and institutional decision-making structures (p < .001).",
        "Certifications & Honors: Advanced Microsoft Excel Certified • Google AI Professional Certificate • Eagle Scout (Boy Scouts of America)",
        "Tallahassee State College: Associate of Arts (Dean's List 3x Honors Recognition)"
    ]
    for b in ed_bullets:
        p_b = doc.add_paragraph()
        p_b.paragraph_format.space_before = Pt(0)
        p_b.paragraph_format.space_after = Pt(1.5)
        p_b.paragraph_format.line_spacing = 1.08
        p_b.paragraph_format.left_indent = Inches(0.15)
        
        r_b = p_b.add_run(f"• {b}")
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(8.3)
        r_b.font.color.rgb = RGBColor(30, 41, 59)

    docx_path = "/home/ubuntu/consultant/public/brand/Landen_Jackson_Master_1Page_Executive_Resume.docx"
    doc.save(docx_path)
    print("Saved DOCX:", docx_path)

create_resume()
