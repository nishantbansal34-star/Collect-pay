"""Turn index.html (the web version) into the app's offline page:
bundled QR library, bundled fonts, nothing loaded from the internet.
Run from the repo root:  python3 tools/make_app_html.py"""
import re
src = open('index.html', encoding='utf-8').read()
src = src.replace('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'qrcode.min.js')
src = re.sub(r'<link rel="preconnect"[^>]*>\n', '', src)
src = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n', '', src)
faces = [('Onest', w, f'fonts/onest-latin-{w}-normal.woff2') for w in (300, 400, 500, 600)] + \
        [('JetBrains Mono', w, f'fonts/jetbrains-mono-latin-{w}-normal.woff2') for w in (400, 500)]
css = '\n'.join(f'@font-face{{font-family:"{f}";font-style:normal;font-weight:{w};font-display:swap;src:url("{u}") format("woff2")}}' for f, w, u in faces)
src = src.replace('<style>\n', '<style>\n' + css + '\n', 1)
assert 'googleapis' not in src and 'cdnjs' not in src, 'page still loads something from the internet'
open('app/src/main/assets/index.html', 'w', encoding='utf-8').write(src)
print('wrote app/src/main/assets/index.html')
