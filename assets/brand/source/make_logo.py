import sys,os,glyphs
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
NAVY='#0A1630';LIME='#B9F23C';CYAN='#2FC6F6';WHITE='#FFFFFF'
LIME_D='#5FA800';CYAN_D='#0E9BD6'
THEMES={ # name: (bg, main, accent, rule, padbg)
 'dark':(NAVY,WHITE,LIME,CYAN),'light':('#FFFFFF',NAVY,LIME_D,CYAN_D),
 'mono-white':(None,WHITE,WHITE,WHITE),'mono-navy':(None,NAVY,NAVY,NAVY)}
SIZE=200; TRACK=0.012
def word():
    g,adv,cap=glyphs.shape('FREIGHTIX',800,SIZE,TRACK)
    x0=g[0][2]; x1=g[-1][3]
    lime=[0,7,8]  # F, I, X
    return g,x0,x1,cap
def fmt(v): return ('%.2f'%v).rstrip('0').rstrip('.')
def paths(glist,dx,dy,color,idx=None):
    ds=[d for i,(c,d,a,b) in enumerate(glist) if idx is None or i in idx]
    return f'<path fill="{color}" transform="translate({fmt(dx)} {fmt(dy)})" d="{" ".join(ds)}"/>'
def build(kind,theme,pad=True):
    bg,main,acc,rule=THEMES[theme]
    g,x0,x1,cap=word(); W=x1-x0
    els=[]; H=cap
    # wordmark: baseline at y=cap, ink from x=0
    els.append(paths(g,-x0,cap,main,[1,2,3,4,5,6]))
    els.append(paths(g,-x0,cap,acc,[0,7,8]))
    if kind in('primary','inline'):
        tcap_target=cap*(0.36 if kind=='primary' else 0.40)
        # find size for cap
        _,_,c1=glyphs.shape('GET YOUR FIX!',700,100,0.3); ts=100*tcap_target/c1
        tg,tadv,tcap=glyphs.shape('GET YOUR FIX!',700,ts,0.3)
        tx0=tg[0][2]; tx1=tg[-1][3]; TW=tx1-tx0
        thick=tcap*0.2
        if kind=='primary':
            gap=cap*0.30; ty=cap+gap+tcap   # tagline baseline
            tleft=(W-TW)/2
            rg=tcap*0.95; rl=tleft-rg
            yc=ty-tcap/2
            els.append(f'<rect fill="{rule}" x="0" y="{fmt(yc-thick/2)}" width="{fmt(rl)}" height="{fmt(thick)}"/>')
            els.append(f'<rect fill="{rule}" x="{fmt(W-rl)}" y="{fmt(yc-thick/2)}" width="{fmt(rl)}" height="{fmt(thick)}"/>')
            H=ty
        else: # inline: wordmark | divider | tagline, tagline vertically centred on cap
            dg=cap*0.32; dx=W+dg; dw=thick*1.1
            els.append(f'<rect fill="{rule}" x="{fmt(dx)}" y="{fmt(-cap*0.02)}" width="{fmt(dw)}" height="{fmt(cap*1.04)}"/>')
            tleft=dx+dw+dg; ty=cap/2+tcap/2
            W=tleft+TW
        els.append(paths(tg,tleft-tx0,ty,main,list(range(len(tg)-1))))
        els.append(paths(tg,tleft-tx0,ty,acc,[len(tg)-1]))
    p=cap*0.5 if (pad and bg) else 0
    vb=f'{fmt(-p)} {fmt(-p - (cap*0.02 if kind=="inline" else 0))} {fmt(W+2*p)} {fmt(H+2*p + (cap*0.04 if kind=="inline" else 0))}'
    w,h=[float(v) for v in vb.split()[2:]]
    bgr=f'<rect x="{fmt(-p)}" y="{fmt(-p- (cap*0.02 if kind=="inline" else 0))}" width="100%" height="100%" fill="{bg}"/>' if (bg and pad) else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{fmt(w)}" height="{fmt(h)}" role="img" aria-label="FREIGHTIX{": Get your FIX!" if kind!="wordmark" else ""}"><title>FREIGHTIX</title>{bgr}{"".join(els)}</svg>'
for kind in ('primary','wordmark','inline'):
    for th in THEMES:
        open(f'{OUT}/freightix-{kind}-{th}.svg','w').write(build(kind,th))
    open(f'{OUT}/freightix-{kind}-web.svg','w').write(build(kind,'dark',pad=False))
print('ok')
