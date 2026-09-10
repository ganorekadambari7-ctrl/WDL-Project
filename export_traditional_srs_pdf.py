from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph as RP, Spacer, Table as RT, TableStyle, PageBreak

SRC=Path('output/Salary_Pro_SRS_Traditional_Format.docx')
DST=Path('output/Salary_Pro_SRS_Traditional_Format.pdf')
def blocks(parent):
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    for child in parent.element.body.iterchildren():
        if isinstance(child, CT_P): yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl): yield Table(child, parent)
def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
ss=getSampleStyleSheet()
ss.add(ParagraphStyle('cover',fontName='Times-Bold',fontSize=16,leading=20,alignment=TA_CENTER,spaceAfter=8))
ss.add(ParagraphStyle('traditional_h1',fontName='Times-Bold',fontSize=14,leading=17,spaceBefore=9,spaceAfter=4,keepWithNext=True))
ss.add(ParagraphStyle('traditional_h2',fontName='Times-Bold',fontSize=12,leading=14,spaceBefore=6,spaceAfter=3,keepWithNext=True))
ss.add(ParagraphStyle('traditional_h3',fontName='Times-Bold',fontSize=12,leading=14,spaceBefore=5,spaceAfter=2,keepWithNext=True))
ss.add(ParagraphStyle('body',fontName='Times-Roman',fontSize=10.5,leading=13,alignment=TA_JUSTIFY,spaceAfter=5))
ss.add(ParagraphStyle('bullet',fontName='Times-Roman',fontSize=10.5,leading=13,leftIndent=20,firstLineIndent=-10,spaceAfter=2))
ss.add(ParagraphStyle('cell',fontName='Times-Roman',fontSize=8.5,leading=10))
def footer(canvas,doc):
    if doc.page == 1: return
    canvas.saveState(); canvas.setFont('Times-Roman',8)
    canvas.drawString(.8*inch,.42*inch,'Software Requirements Specification for Salary Pro')
    label = 'Page i' if doc.page == 2 else ('Page ii' if doc.page == 3 else f'Page {doc.page - 3}')
    canvas.drawRightString(7.7*inch,.42*inch,label)
    canvas.restoreState()

story=[]; source=Document(SRC)
# Match the reference packet's three-page front matter: academic cover, SRS title page, and contents.
story += [Spacer(1, .55*inch), RP('Department of Computer Engineering', ss['cover']), RP('A.Y. 2025-26', ss['body']), RP('Semester T.E. Semester V - CMPN', ss['body']), Spacer(1, .1*inch)]
front=[
    ['Subject','Software Engineering & Web Development'], ['Subject Professor In-charge','Prof. Divya Nimbalkar'], ['Assisting Teachers','Prof. Divya Nimbalkar'], ['Laboratory','M 313'], ['Experiment No.','02'], ['Experiment Title','Preparation of System Requirement Specification']]
t=RT([[RP(esc(a),ss['cell']),RP(esc(b),ss['cell'])] for a,b in front],colWidths=[2.2*inch,4.6*inch],hAlign='LEFT')
t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.35,colors.black),('FONTNAME',(0,0),(-1,-1),'Times-Roman'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)])); story += [t,Spacer(1,.2*inch)]
story += [RP('Group Members:',ss['traditional_h2']), RT([[RP('Roll No.',ss['cell']),RP('Name',ss['cell']),RP('Roll No.',ss['cell']),RP('Name',ss['cell'])],[RP('TBD',ss['cell']),RP('Salary Pro Project Member',ss['cell']),RP('TBD',ss['cell']),RP('Salary Pro Project Member',ss['cell'])]],colWidths=[.8*inch,2.6*inch,.8*inch,2.6*inch],hAlign='LEFT'), PageBreak()]
story += [Spacer(1, 1.25*inch), RP('Software Requirements<br/>Specification',ss['cover']), Spacer(1,.18*inch), RP('for',ss['body']), Spacer(1,.18*inch), RP('Salary Pro',ss['cover']), RP('Version 1.0 approved',ss['body']), Spacer(1,.45*inch), RP('Prepared by',ss['body']), RP('Salary Pro Project Team',ss['body']), Spacer(1,.2*inch), RP('Vidyalankar Institute of Technology',ss['body']), RP('August 13, 2026',ss['body']), PageBreak()]
story += [RP('Table of Contents',ss['cover'])]
for item,pg in [('Table of Contents','ii'),('Revision History','ii'),('1. Introduction','1'),('1.1 Purpose','1'),('1.2 Document Conventions','1'),('1.3 Intended Audience and Reading Suggestions','1'),('1.4 Product Scope','1'),('1.5 References','2'),('2. Overall Description','2'),('3. External Interface Requirements','4'),('4. System Features','6'),('5. Other Nonfunctional Requirements','8'),('6. Other Requirements','9'),('Appendix A: Glossary','9'),('Appendix B: Analysis Model','10'),('Appendix C: To Be Determined List','10')]:
    story.append(RP(f'{esc(item)}{"." * max(3, 68-len(item))}{pg}',ss['body']))
story += [Spacer(1,.12*inch), RP('Revision History',ss['traditional_h2'])]
rh=RT([[RP('Version',ss['cell']),RP('Date',ss['cell']),RP('Description',ss['cell'])],[RP('1.0',ss['cell']),RP('August 13, 2026',ss['cell']),RP('Initial Salary Pro SRS.',ss['cell'])]],colWidths=[1*inch,2*inch,3.8*inch],hAlign='LEFT')
rh.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.35,colors.black),('FONTNAME',(0,0),(-1,0),'Times-Bold'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)])); story += [rh,PageBreak()]
copying=False
for b in blocks(source):
    if isinstance(b,Paragraph) and b.text.strip()=='1. Introduction': copying=True
    if not copying: continue
    if isinstance(b,Paragraph):
        text=b.text.strip(); n=b.style.name
        if not text: story.append(Spacer(1,5)); continue
        st=ss['cover'] if n=='Title' else ss['traditional_h1'] if n=='Heading 1' else ss['traditional_h2'] if n=='Heading 2' else ss['traditional_h3'] if n=='Heading 3' else ss['bullet'] if n.startswith('List Bullet') else ss['body']
        story.append(RP(esc(('• '+text) if n.startswith('List Bullet') else text),st))
    else:
        data=[[RP(esc(cell.text.strip()),ss['cell']) for cell in row.cells] for row in b.rows]
        count=len(data[0]); width=6.8*inch
        if count==4: widths=[.78*inch,4.3*inch,.72*inch,1*inch]
        elif count==3: widths=[.7*inch,1.55*inch,4.55*inch]
        elif count==2: widths=[1.7*inch,5.1*inch]
        else: widths=[width/count]*count
        t=RT(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.35,colors.black),('VALIGN',(0,0),(-1,-1),'TOP'),('FONTNAME',(0,0),(-1,0),'Times-Bold'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
        story.extend([t,Spacer(1,6)])
pdf=SimpleDocTemplate(str(DST),pagesize=letter,leftMargin=.8*inch,rightMargin=.8*inch,topMargin=.65*inch,bottomMargin=.62*inch,title='Software Requirements Specification for Salary Pro')
pdf.build(story,onFirstPage=footer,onLaterPages=footer)
print(DST.resolve())
