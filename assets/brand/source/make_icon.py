import sys,glyphs
NAVY='#0A1630';LIME='#B9F23C';CYAN='#2FC6F6';WHITE='#FFFFFF'
def f(v):return ('%.2f'%v).rstrip('0').rstrip('.')
def tile(variant,R=112):
    N=512; els=[f'<rect width="{N}" height="{N}" rx="{R}" fill="{NAVY}"/>']
    if variant=='F':
        g,adv,cap=glyphs.shape('F',900,400,0); c,d,x0,x1=g[0]; w=x1-x0
        capH=cap; bar=30; gap=34; tot=capH+gap+bar; top=(N-tot)/2
        dx=(N-w)/2-x0
        els.append(f'<path fill="{LIME}" transform="translate({f(dx)} {f(top+capH)})" d="{d}"/>')
        els.append(f'<rect fill="{CYAN}" x="{f((N-w)/2)}" y="{f(top+capH+gap)}" width="{f(w)}" height="{bar}"/>')
    elif variant=='FIX':
        g,adv,cap=glyphs.shape('FIX',900,250,0.0); x0=g[0][2];x1=g[-1][3];w=x1-x0
        s=380/w; g,adv,cap=glyphs.shape('FIX',900,250*s,0.0); x0=g[0][2];x1=g[-1][3];w=x1-x0
        bar=26; gap=30; tot=cap+gap+bar; top=(N-tot)/2; dx=(N-w)/2-x0
        els.append(f'<path fill="{LIME}" transform="translate({f(dx)} {f(top+cap)})" d="{" ".join(d for _,d,_,_ in g)}"/>')
        els.append(f'<rect fill="{CYAN}" x="{f((N-w)/2)}" y="{f(top+cap+gap)}" width="{f(w)}" height="{bar}"/>')
    elif variant=='FX':
        g,adv,cap=glyphs.shape('FIX',900,300,0.0)
        g=[g[0],g[2]]  # F and X only
        # re-space: F then X
        gap=26; xF0,xF1=g[0][2],g[0][3]; xX0,xX1=g[1][2],g[1][3]
        wF=xF1-xF0; wX=xX1-xX0; w=wF+gap+wX; s=400/w
        g,adv,cap=glyphs.shape('F',900,300*s,0); gx,_,_=glyphs.shape('X',900,300*s,0)
        F=g[0];X=gx[0]; wF=F[3]-F[2]; wX=X[3]-X[2]; w=wF+gap*s+wX; left=(N-w)/2; top=(N-cap)/2
        els.append(f'<path fill="{WHITE}" transform="translate({f(left-F[2])} {f(top+cap)})" d="{F[1]}"/>')
        els.append(f'<path fill="{LIME}" transform="translate({f(left+wF+gap*s-X[2])} {f(top+cap)})" d="{X[1]}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" width="{N}" height="{N}" role="img" aria-label="FREIGHTIX"><title>FREIGHTIX</title>{"".join(els)}</svg>'
if __name__=='__main__':
    out=sys.argv[1]
    for v in ('F','FIX','FX'): open(f'{out}/icon-{v}.svg','w').write(tile(v))
