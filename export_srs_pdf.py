from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph as RP, Spacer, Table as RT, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth

SRC=Path('output/Salary_Pro_Software_Requirements_Specification.docx')
DST=Path('output/Salary_Pro_Software_Requirements_Specification.pdf')

def blocks(parent):
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    for child in parent.element.body.iterchildren():
        if isinstance(child, CT_P): yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl): yield Table(child, parent)

styles=getSampleStyleSheet()
styles.add(ParagraphStyle('Cover', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=24, leading=29, alignment=TA_CENTER, textColor=colors.HexColor('#4C1D95'), spaceAfter=12))
styles.add(ParagraphStyle('H1x', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=colors.HexColor('#4C1D95'), spaceBefore=12, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle('H2x', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#5B21B6'), spaceBefore=9, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle('H3x', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=colors.HexColor('#4C1D95'), spaceBefore=7, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle('Bodyx', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.9, leading=11.4, spaceAfter=5))
styles.add(ParagraphStyle('Bulletx', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.8, leading=11, leftIndent=14, firstLineIndent=-8, spaceAfter=3))
styles.add(ParagraphStyle('Smallx', parent=styles['BodyText'], fontName='Helvetica', fontSize=8, leading=9.5, spaceAfter=0))

def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
def on_page(canvas, doc):
    canvas.saveState(); canvas.setFont('Helvetica',7.5); canvas.setFillColor(colors.HexColor('#64748B'))
    canvas.drawString(0.72*inch, 0.42*inch, 'Salary Pro | Software Requirements Specification')
    canvas.drawRightString(7.78*inch,0.42*inch,f'Page {doc.page}')
    canvas.restoreState()

docx=Document(SRC); story=[]
for b in blocks(docx):
    if isinstance(b, Paragraph):
        txt=b.text.strip()
        if not txt: story.append(Spacer(1,5)); continue
        sn=b.style.name
        if sn=='Title': st=styles['Cover']
        elif sn=='Heading 1': st=styles['H1x']
        elif sn=='Heading 2': st=styles['H2x']
        elif sn=='Heading 3': st=styles['H3x']
        elif sn.startswith('List Bullet'): st=styles['Bulletx']; txt='• '+txt
        else: st=styles['Bodyx']
        story.append(RP(esc(txt),st))
    else:
        data=[]
        for row in b.rows:
            data.append([RP(esc(cell.text.strip()), styles['Smallx']) for cell in row.cells])
        n=len(data[0]); avail=6.7*inch
        lens=[max(1,max(len(c) for c in col)) for col in zip(*[[cell.text for cell in r.cells] for r in b.rows])]
        total=sum(lens); widths=[avail*l/total for l in lens]
        # keep identifier/status columns readable
        if n==4: widths=[0.78*inch,4.23*inch,0.72*inch,0.97*inch]
        rt=RT(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        rt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#4C1D95')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#CBD5E1')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F8FAFC')])]))
        story.append(rt); story.append(Spacer(1,7))

pdf=SimpleDocTemplate(str(DST),pagesize=letter,rightMargin=.72*inch,leftMargin=.72*inch,topMargin=.62*inch,bottomMargin=.6*inch,title='Salary Pro Software Requirements Specification',author='Salary Pro Project Team')
pdf.build(story,onFirstPage=on_page,onLaterPages=on_page)
print(DST.resolve())
