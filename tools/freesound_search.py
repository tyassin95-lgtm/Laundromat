#!/usr/bin/env python3
"""Search freesound.org for CC0 sounds (used while sourcing audio; see CREDITS.md)."""
import re, sys, urllib.parse, subprocess, html

def search(q, n=8, extra=''):
    url = 'https://freesound.org/search/?q=%s&f=%s%s' % (urllib.parse.quote_plus(q), urllib.parse.quote('license:"Creative Commons 0"'), extra)
    h = subprocess.run(['curl', '-sS', url], capture_output=True, text=True).stdout
    out = []
    for m in re.finditer(r'<div\s+class="bw-player"(.*?)tabindex', h, re.S):
        blk = m.group(1)
        g = lambda k: (re.search(r'data-%s="([^"]*)"' % k, blk) or [None, ''])[1]
        rating = ''
        tail = h[m.end():m.end() + 3000]
        r = re.search(r'Average rating of ([0-9.]+)', tail)
        if r: rating = r.group(1)
        out.append({'id': g('sound-id'), 'user': g('username'), 'title': html.unescape(g('title')),
                    'dur': float(g('duration') or 0), 'dl': int(g('num-downloads') or 0), 'rating': rating,
                    'ogg': g('ogg').replace('-lq.ogg', '-hq.ogg')})
    return out[:n]

if __name__ == '__main__':
    for q in sys.argv[1:]:
        print('###', q)
        for r in search(q):
            print('  %-8s %-22s %6.1fs dl=%-6d r=%-4s %s' % (r['id'], r['user'][:22], r['dur'], r['dl'], r['rating'], r['title'][:60]))
