import sys,os,glyphs,cairosvg,subprocess,make_logo,make_icon
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
NAVY='#0A1630';LIME='#B9F23C';CYAN='#2FC6F6';WHITE='#FFFFFF';MIST='#8EA0BF';PALE='#C9D6E0'
f=make_logo.fmt
def text(s,w,size,x,y,colors,track=0.0,align='left'):
    """colors: one colour or list per char. y=baseline. returns (svg, ink_w, cap)"""
    g,adv,cap=glyphs.shape(s,w,size,track); x0=g[0][2]; iw=g[-1][3]-x0
    if align=='center': x=x-iw/2
    if isinstance(colors,str): colors=[colors]*len(g)
    by={}
    for (c,d,a,b),col in zip(g,colors): by.setdefault(col,[]).append(d)
    return ''.join(f'<path fill="{c}" transform="translate({f(x-x0)} {f(y)})" d="{" ".join(ds)}"/>' for c,ds in by.items() if ds),iw,cap
def inner(svg):  # strip outer <svg> wrapper, keep viewBox numbers
    import re; m=re.search(r'viewBox="([^"]+)"',svg); vb=[float(v) for v in m.group(1).split()]
    body=re.sub(r'^<svg[^>]*>(<title>[^<]*</title>)?','',svg).replace('</svg>','')
    return body,vb
def place(svg,x,y,width):
    body,vb=inner(svg); s=width/vb[2]
    return f'<g transform="translate({f(x)} {f(y)}) scale({f(s)}) translate({f(-vb[0])} {f(-vb[1])})">{body}</g>', vb[3]*s
def doc(w,h,body,bg=NAVY):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>'
def png(svg,path,w,h=None): cairosvg.svg2png(bytestring=svg.encode(),write_to=path,output_width=w,output_height=h or None)
# 1. lockups
for kind in ('primary','wordmark','inline'):
    for th in make_logo.THEMES:
        s=make_logo.build(kind,th); open(f'{OUT}/freightix-{kind}-{th}.svg','w').write(s)
        if th in('dark','light'): png(s,f'{OUT}/freightix-{kind}-{th}.png',2400)
    open(f'{OUT}/freightix-{kind}-web.svg','w').write(make_logo.build(kind,'dark',pad=False))
# 2. icons
sym=make_icon.tile('F'); open(f'{OUT}/freightix-symbol.svg','w').write(sym); open(f'{OUT}/favicon.svg','w').write(sym)
for sz in(16,32,48): png(sym,f'{OUT}/favicon-{sz}.png',sz)
for sz in(192,512,1024): png(sym,f'{OUT}/icon-{sz}.png' if sz<1024 else f'{OUT}/freightix-symbol-1024.png',sz)
png(make_icon.tile('F',R=0),f'{OUT}/apple-touch-icon.png',180)   # iOS rounds corners itself
avatar=make_icon.tile('FIX',R=0); open(f'{OUT}/freightix-fix-avatar.svg','w').write(avatar); png(avatar,f'{OUT}/freightix-fix-avatar.png',1024)
# 3. OG / link preview 1200x630
lock,lh=place(make_logo.build('primary','dark',pad=False),170,0,860)
top=(630-lh)/2-24; lock,lh=place(make_logo.build('primary','dark',pad=False),170,top,860)
d,_,_=text('AUSTRALIAN ROAD FREIGHT AND LINEHAUL INTELLIGENCE',600,17,600,top+lh+64,MIST,0.18,'center')
og=doc(1200,630,lock+d+f'<rect y="622" width="1200" height="8" fill="{LIME}"/>')
open(f'{OUT}/og-image.svg','w').write(og); png(og,f'{OUT}/og-image.png',1200,630)
# 4. podcast cover 3000x3000
N=3000; M=220; body=''
wm,wh=place(make_logo.build('wordmark','dark',pad=False),M,M,1050); body+=wm
y=930
t,_,c=text('THE',900,480,M,y,WHITE,-0.01); body+=t
y+=c+124; t,_,_=text('DAILY',900,480,M,y,WHITE,-0.01); body+=t
y+=c+124; t,fw,_=text('FIX',900,480,M,y,LIME,-0.01); body+=t
body+=f'<rect x="{M+fw+70}" y="{f(y-c/2-20)}" width="{f(N-2*M-fw-70)}" height="40" fill="{CYAN}"/>'
y+=250; t,_,_=text('Australian road freight and linehaul,',600,104,M,y,PALE); body+=t
y+=146; t,_,_=text('every morning in five minutes.',600,104,M,y,PALE); body+=t
tg,tw,tc=text('GET YOUR FIX!',700,92,N/2,N-M,[WHITE]*12+[LIME],0.3,'center'); body+=tg
rl=(N-2*M-tw)/2-80; yy=N-M-tc/2-9
body+=f'<rect fill="{CYAN}" x="{M}" y="{f(yy)}" width="{f(rl)}" height="18"/><rect fill="{CYAN}" x="{f(N-M-rl)}" y="{f(yy)}" width="{f(rl)}" height="18"/>'
cov=doc(N,N,body); open(f'{OUT}/podcast-cover.svg','w').write(cov); png(cov,f'{OUT}/podcast-cover.png',N,N)
subprocess.run(['convert',f'{OUT}/podcast-cover.png','-quality','92','-colorspace','sRGB',f'{OUT}/podcast-cover.jpg'],check=True); os.remove(f'{OUT}/podcast-cover.png')
print('built',len(os.listdir(OUT)))
