#!/usr/bin/env python3
"""Download the CC0 Freesound sounds used by the game (HQ previews) + record credits.

Output: tools/.cache/freesound/<name>.ogg and tools/.cache/freesound/credits.json
"""
import json, os, re, subprocess, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', '.cache', 'freesound')

SOUNDS = {
    'door_bell_short': 192761, 'door_bell_long': 57743,
    'laundromat_roomtone': 553804, 'laundromat_washers': 454465, 'laundromat_dryers': 151666,
    'washer_spin': 182011, 'washer_rinse': 384121, 'tumble_dryer': 188454, 'dryer_door': 631886,
    'rain_indoor': 242889, 'rain_outdoor': 177479, 'thunder_short': 683420, 'thunder_long': 476739,
    'cat_meow': 412017, 'cat_meow2': 479272, 'cat_purr': 575933, 'kettle': 264475,
    'camera': 520684, 'needle_drop': 556722, 'vinyl_crackle': 531438, 'pencil': 650994,
    'mop': 515158, 'street_night': 413949, 'city_night': 423644, 'cafe': 746428,
    'birds': 678073, 'phone_buzz': 384487, 'ratchet': 591529, 'socket_wrench': 616628,
    'knitting': 505486, 'applause': 462362, 'applause2': 858309, 'spray': 707374,
    'pigeons': 701282, 'coins_jar': 481805, 'coin_single': 400115, 'type_key': 380138,
    'type_bell': 318687, 'chime': 398496, 'bus': 331520, 'chatter': 138118,
}


def fetch(sid):
    page = subprocess.run(['curl', '-sSL', 'https://freesound.org/s/%d/' % sid], capture_output=True, text=True).stdout
    ogg = re.search(r'data-ogg="([^"]+)"', page)
    title = re.search(r'data-title="([^"]*)"', page)
    user = re.search(r'data-username="([^"]*)"', page)
    lic = 'CC0' if ('publicdomain/zero' in page or 'Creative Commons 0' in page) else 'UNKNOWN'
    return (ogg.group(1).replace('-lq.ogg', '-hq.ogg') if ogg else None,
            html.unescape(title.group(1)) if title else '', user.group(1) if user else '', lic)


def main():
    os.makedirs(OUT, exist_ok=True)
    credits = {}
    for name, sid in SOUNDS.items():
        dst = os.path.join(OUT, name + '.ogg')
        url, title, user, lic = fetch(sid)
        credits[name] = {'id': sid, 'title': title, 'author': user, 'license': lic,
                         'url': 'https://freesound.org/s/%d/' % sid}
        if url and not os.path.exists(dst):
            subprocess.run(['curl', '-sSL', '-o', dst, url])
        print('%-20s %-8d %-7s %-20s %s' % (name, sid, lic, user[:20], title[:50]))
    json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
