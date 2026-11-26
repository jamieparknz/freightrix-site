"""Outline text with HarfBuzz shaping (kerning on) + extra tracking. Returns SVG path data per glyph."""
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
FONTDIR=__import__('os').environ.get('MONTSERRAT_DIR','./fonts/')
_cache={}
def font(w):
    if w not in _cache:
        p=FONTDIR+f'montserrat-latin-{w}-normal.woff2'
        tt=TTFont(p); data=open(p,'rb').read()
        # harfbuzz needs sfnt; save decompressed
        import io; b=io.BytesIO(); tt.flavor=None; tt.save(b); raw=b.getvalue()
        _cache[w]=(TTFont(io.BytesIO(raw)),hb.Font(hb.Face(raw)))
    return _cache[w]
def shape(text,w,size,track=0.0):
    """track in em. Returns list of (char, pathd, x0,x1) in px, total advance, cap height px."""
    tt,hf=font(w); upem=tt['head'].unitsPerEm; s=size/upem
    buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hf,buf,{'kern':True,'liga':False})
    gs=tt.getGlyphSet(); order=tt.getGlyphOrder(); x=0; out=[]
    for i,(info,pos) in enumerate(zip(buf.glyph_infos,buf.glyph_positions)):
        name=order[info.codepoint]; ch=text[info.cluster]
        pen=SVGPathPen(gs,ntos=lambda v:('%.2f'%v).rstrip('0').rstrip('.'))
        # flip y: font y-up -> svg y-down, baseline at y=0
        gs[name].draw(TransformPen(pen,(s,0,0,-s,x+pos.x_offset*s,-pos.y_offset*s)))
        bp=BoundsPen(gs); gs[name].draw(bp); b=bp.bounds
        x0=x+(b[0]*s if b else 0); x1=x+(b[2]*s if b else 0)
        out.append((ch,pen.getCommands(),x0,x1))
        x+=pos.x_advance*s+(track*size if i<len(text)-1 else 0)
    cap=tt['OS/2'].sCapHeight*s
    return out,x,cap
