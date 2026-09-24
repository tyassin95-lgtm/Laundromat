#!/usr/bin/env python3
"""Build every audio file the game uses into web/assets/audio/.

Sources (all free to use, see CREDITS.md):
  * Music   - Kevin MacLeod (incompetech.com), CC BY 4.0   -> downloaded MP3s in tools/.cache/music
  * SFX/amb - Freesound.org CC0 sounds (tools/fetch_freesound.py) and Kenney.nl CC0 packs
  * A few UI/machine blips are synthesised here.

Run:  python3 tools/fetch_freesound.py && python3 tools/build_audio.py
The game only needs the files in web/assets/audio; replacing any of them with another file of
the same name (ogg) swaps the sound.
"""
import json
import os
import subprocess
import sys
import urllib.parse

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.cache')
FS = os.path.join(CACHE, 'freesound')
KEN = os.path.join(CACHE, 'kenney')
MUS = os.path.join(CACHE, 'music')
OUT = os.path.join(ROOT, 'web', 'assets', 'audio')
SR = 44100

try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:  # pragma: no cover
    FF = 'ffmpeg'

# --------------------------------------------------------------------------- music
MUSIC = {
    # key: (incompetech title, loudness gain dB)
    'title': ('Gymnopedie No 1', 0),
    'laundromat_day': ('Local Forecast - Elevator', -2),
    'laundromat_day2': ('Lobby Time', -2),
    'laundromat_night': ('Wallpaper', -1),
    'lounge_night': ('Backbay Lounge', -2),
    'home': ('Dreamer', 0),
    'home_night': ('Fireflies and Stardust', 0),
    'morning': ('Easy Lemon', -1),
    'cafe': ('Bossa Antigua', -2),
    'street': ('Sidewalk Shade', -2),
    'park': ('Laid Back Guitars', -1),
    'garden': ('Porch Swing Days - slower', -1),
    'tension': ('Deliberate Thought', 0),
    'community': ('Carefree', -2),
    'bittersweet': ('Frost Waltz', 0),
    'ending': ('Somewhere Sunny', -1),
}

# --------------------------------------------------------------------------- one-shot sfx
# name: (source, start, duration, gain_db, fade_in, fade_out)
SFX = {
    'shop_bell': ('fs:door_bell_long', 0.0, 3.2, 0, 0.0, 1.2),
    'bell_small': ('fs:door_bell_short', 0.0, 0.9, 0, 0.0, 0.2),
    'thunder': ('fs:thunder_short', 0.0, 6.4, -2, 0.02, 2.0),
    'thunder_far': ('fs:thunder_long', 6.0, 12.0, -3, 0.5, 4.0),
    'meow': ('fs:cat_meow', 0.0, 1.8, 0, 0.0, 0.2),
    'meow2': ('fs:cat_meow2', 0.0, 0.9, 0, 0.0, 0.15),
    'purr': ('fs:cat_purr', 0.0, 5.6, 0, 0.3, 1.0),
    'camera': ('fs:camera', 0.55, 1.0, 0, 0.0, 0.2),
    'needle_drop': ('fs:needle_drop', 0.0, 3.0, -3, 0.0, 1.0),
    'phone_buzz': ('fs:phone_buzz', 0.0, 3.0, -2, 0.0, 0.2),
    'ratchet': ('fs:ratchet', 0.0, 2.2, -3, 0.0, 0.3),
    'wrench': ('fs:socket_wrench', 0.0, 1.1, -2, 0.0, 0.2),
    'applause': ('fs:applause', 0.0, 4.5, -2, 0.1, 1.2),
    'applause_big': ('fs:applause2', 0.0, 5.7, -2, 0.2, 1.5),
    'spray': ('fs:spray', 0.0, 1.9, -3, 0.0, 0.2),
    'coin': ('fs:coin_single', 0.0, 0.8, -2, 0.0, 0.1),
    'coins_jar': ('fs:coins_jar', 2.2, 1.6, -3, 0.0, 0.4),
    'type_key': ('fs:type_key', 0.0, 0.3, -6, 0.0, 0.05),
    'type_bell': ('fs:type_bell', 0.0, 0.9, -4, 0.0, 0.2),
    'chime': ('fs:chime', 0.0, 3.5, 0, 0.0, 1.2),
    'machine_door': ('fs:dryer_door', 1.45, 1.0, -2, 0.0, 0.3),
    'kettle': ('fs:kettle', 60.0, 5.0, -4, 0.4, 1.2),
    'pencil': ('auto:fs:pencil', 2.6, 0, -1, 0.1, 0.4),
    'mop': ('fs:mop', 0.2, 2.6, 4, 0.1, 0.5),
    'knitting': ('auto:fs:knitting', 2.6, 0, -3, 0.1, 0.4),
    'pigeons': ('fs:pigeons', 0.0, 9.0, -6, 0.3, 2.0),
    'bus': ('fs:bus', 3.0, 14.0, -4, 1.0, 3.0),
    # Kenney CC0
    'click': ('ken:interface-sounds/Audio/click_002.ogg', 0, 0, -2, 0, 0),
    'select': ('ken:interface-sounds/Audio/select_002.ogg', 0, 0, -3, 0, 0),
    'confirm': ('ken:interface-sounds/Audio/confirmation_002.ogg', 0, 0, -3, 0, 0),
    'back': ('ken:interface-sounds/Audio/back_002.ogg', 0, 0, -3, 0, 0),
    'error': ('ken:interface-sounds/Audio/error_004.ogg', 0, 0, -4, 0, 0),
    'pop': ('ken:interface-sounds/Audio/pluck_001.ogg', 0, 0, -3, 0, 0),
    'drop': ('ken:interface-sounds/Audio/drop_002.ogg', 0, 0, -3, 0, 0),
    'toggle': ('ken:interface-sounds/Audio/toggle_002.ogg', 0, 0, -4, 0, 0),
    'tick': ('ken:interface-sounds/Audio/tick_002.ogg', 0, 0, -6, 0, 0),
    'question': ('ken:interface-sounds/Audio/question_002.ogg', 0, 0, -4, 0, 0),
    'open': ('ken:interface-sounds/Audio/open_002.ogg', 0, 0, -4, 0, 0),
    'close': ('ken:interface-sounds/Audio/close_002.ogg', 0, 0, -4, 0, 0),
    'coins': ('ken:rpg-audio/Audio/handleCoins.ogg', 0, 0, -2, 0, 0),
    'coins2': ('ken:rpg-audio/Audio/handleCoins2.ogg', 0, 0, -2, 0, 0),
    'cloth1': ('ken:rpg-audio/Audio/cloth1.ogg', 0, 0, 0, 0, 0),
    'cloth2': ('ken:rpg-audio/Audio/cloth2.ogg', 0, 0, 0, 0, 0),
    'cloth3': ('ken:rpg-audio/Audio/cloth3.ogg', 0, 0, 0, 0, 0),
    'cloth4': ('ken:rpg-audio/Audio/cloth4.ogg', 0, 0, 0, 0, 0),
    'book_open': ('ken:rpg-audio/Audio/bookOpen.ogg', 0, 0, -2, 0, 0),
    'book_close': ('ken:rpg-audio/Audio/bookClose.ogg', 0, 0, -2, 0, 0),
    'page': ('ken:rpg-audio/Audio/bookFlip2.ogg', 0, 0, -2, 0, 0),
    'door_open': ('ken:rpg-audio/Audio/doorOpen_1.ogg', 0, 0, -3, 0, 0),
    'door_close': ('ken:rpg-audio/Audio/doorClose_2.ogg', 0, 0, -3, 0, 0),
    'creak': ('ken:rpg-audio/Audio/creak1.ogg', 0, 0, -5, 0, 0),
    'latch': ('ken:rpg-audio/Audio/metalLatch.ogg', 0, 0, -2, 0, 0),
    'metal_click': ('ken:rpg-audio/Audio/metalClick.ogg', 0, 0, -2, 0, 0),
    'clank': ('ken:impact-sounds/Audio/impactMetal_light_002.ogg', 0, 0, -3, 0, 0),
    'clank2': ('ken:impact-sounds/Audio/impactMetal_medium_001.ogg', 0, 0, -4, 0, 0),
    'cup': ('ken:impact-sounds/Audio/impactGlass_light_001.ogg', 0, 0, -4, 0, 0),
    'thud': ('ken:impact-sounds/Audio/impactPlank_medium_000.ogg', 0, 0, -4, 0, 0),
    'step_tile1': ('ken:impact-sounds/Audio/footstep_concrete_000.ogg', 0, 0, -10, 0, 0),
    'step_tile2': ('ken:impact-sounds/Audio/footstep_concrete_001.ogg', 0, 0, -10, 0, 0),
    'step_tile3': ('ken:impact-sounds/Audio/footstep_concrete_002.ogg', 0, 0, -10, 0, 0),
    'step_wood1': ('ken:impact-sounds/Audio/footstep_wood_000.ogg', 0, 0, -9, 0, 0),
    'step_wood2': ('ken:impact-sounds/Audio/footstep_wood_001.ogg', 0, 0, -9, 0, 0),
    'step_wood3': ('ken:impact-sounds/Audio/footstep_wood_002.ogg', 0, 0, -9, 0, 0),
    'jingle_good': ('ken:music-jingles/Audio/Pizzicato jingles/jingles_PIZZI01.ogg', 0, 0, -3, 0, 0),
    'jingle_great': ('ken:music-jingles/Audio/Pizzicato jingles/jingles_PIZZI10.ogg', 0, 0, -3, 0, 0),
    'jingle_sad': ('ken:music-jingles/Audio/Pizzicato jingles/jingles_PIZZI05.ogg', 0, 0, -3, 0, 0),
    'jingle_day': ('ken:music-jingles/Audio/Sax jingles/jingles_SAX02.ogg', 0, 0, -4, 0, 0),
    'jingle_week': ('ken:music-jingles/Audio/Sax jingles/jingles_SAX10.ogg', 0, 0, -4, 0, 0),
    'jingle_steel': ('ken:music-jingles/Audio/Steel jingles/jingles_STEEL03.ogg', 0, 0, -4, 0, 0),
}

# --------------------------------------------------------------------------- ambience loops
# name: (source, start, loop_len, gain_db, stereo)
AMB = {
    'amb_laundromat': ('fs:laundromat_roomtone', 20.0, 32.0, 2, False),
    'amb_washers': ('fs:laundromat_washers', 30.0, 30.0, -4, False),
    'amb_washer_slosh': ('fs:washer_rinse', 0.5, 8.5, -2, False),
    'amb_spin': ('fs:washer_spin', 10.0, 20.0, -6, False),
    'amb_dryer': ('fs:tumble_dryer', 20.0, 22.0, -8, False),
    'amb_rain_in': ('fs:rain_indoor', 0.0, 0, 0, True),  # already a perfect loop
    'amb_rain_out': ('fs:rain_outdoor', 0.0, 36.0, -1, True),
    'amb_street': ('fs:street_night', 5.0, 34.0, 0, True),
    'amb_city': ('fs:city_night', 10.0, 34.0, -2, True),
    'amb_cafe': ('fs:cafe', 20.0, 34.0, -3, True),
    'amb_birds': ('fs:birds', 0.0, 26.0, -3, True),
    'amb_vinyl': ('fs:vinyl_crackle', 5.0, 16.0, -4, False),
    'amb_chatter': ('fs:chatter', 10.0, 34.0, -4, True),
}


def load(path, sr=SR, stereo=False):
    raw = subprocess.run([FF, '-v', 'quiet', '-i', path, '-f', 'f32le', '-ac', '2' if stereo else '1', '-ar', str(sr), '-'],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    if stereo:
        x = x.reshape(-1, 2)
    return x


def save_ogg(x, path, quality=3, sr=SR):
    stereo = x.ndim == 2
    x = np.clip(x, -1, 1).astype(np.float32)
    subprocess.run([FF, '-v', 'quiet', '-y', '-f', 'f32le', '-ac', '2' if stereo else '1', '-ar', str(sr), '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', str(quality), path], input=x.tobytes(), check=True)


def src_path(src):
    kind, _, rest = src.partition(':')
    if kind == 'fs':
        return os.path.join(FS, rest + '.ogg')
    if kind == 'ken':
        return os.path.join(KEN, rest)
    raise ValueError(src)


def fade(x, fin, fout, sr=SR):
    n = len(x)
    if fin > 0:
        k = min(n, int(fin * sr))
        ramp = np.linspace(0, 1, k)
        x[:k] = (x[:k].T * ramp).T
    if fout > 0:
        k = min(n, int(fout * sr))
        ramp = np.linspace(1, 0, k) ** 1.5
        x[n - k:] = (x[n - k:].T * ramp).T
    return x


def normalize(x, target_peak_db=-1.0, target_rms_db=None):
    peak = np.abs(x).max() + 1e-9
    g = 10 ** (target_peak_db / 20) / peak
    if target_rms_db is not None:
        rms = np.sqrt(np.mean(x ** 2)) + 1e-9
        g = min(g, 10 ** (target_rms_db / 20) / rms)
    return x * g


def densest_window(x, dur, sr=SR):
    w = int(dur * sr)
    e = np.convolve(x ** 2, np.ones(int(0.05 * sr)), 'same')
    c = np.cumsum(e)
    best = int(np.argmax(c[w:] - c[:-w])) if len(x) > w else 0
    return x[best:best + w].copy()


def make_loop(x, loop_len, sr=SR, xfade=1.5):
    """Return a seamless loop of loop_len seconds by crossfading the tail into the head."""
    n = int(loop_len * sr)
    k = int(xfade * sr)
    if len(x) < n + k:
        k = max(int(0.2 * sr), len(x) - n)
    seg = x[:n + k].copy()
    head = seg[:k].copy()
    tail = seg[n:n + k].copy()
    t = np.linspace(0, 1, k)
    win_in = np.sin(t * np.pi / 2)
    win_out = np.cos(t * np.pi / 2)
    mixed = (tail.T * win_out + head.T * win_in).T
    out = seg[:n].copy()
    out[:k] = mixed
    return out


# --------------------------------------------------------------------------- synthesis
def synth_beeps(freqs, dur=0.12, gap=0.09, sr=SR):
    parts = []
    for f in freqs:
        t = np.arange(int(dur * sr)) / sr
        tone = np.sin(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.12
        env = np.minimum(1, t / 0.005) * np.minimum(1, (dur - t) / 0.02)
        parts.append(tone * env)
        parts.append(np.zeros(int(gap * sr)))
    return np.concatenate(parts) * 0.5


def synth_blip(f0=520, dur=0.07, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    f = f0 * (1 + 0.15 * np.exp(-t * 60))
    ph = 2 * np.pi * np.cumsum(f) / sr
    tone = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 38)
    return tone * env * 0.45


def synth_chime(notes, step=0.11, sr=SR, decay=2.2):
    total = int((step * len(notes) + 1.6) * sr)
    out = np.zeros(total)
    for i, f in enumerate(notes):
        t = np.arange(total - int(i * step * sr)) / sr
        # soft bell: fundamental + inharmonic partials
        tone = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)
                + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8))
        env = np.minimum(1, t / 0.003) * np.exp(-t * decay)
        out[int(i * step * sr):] += tone * env * 0.25
    return out


def synth_whoosh(dur=0.35, sr=SR, seed=1):
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    noise = rng.standard_normal(n)
    # sweeping band-pass via simple one-pole filters with moving cutoff
    t = np.arange(n) / n
    out = np.zeros(n)
    lp = 0.0
    hp_prev_in = 0.0
    hp = 0.0
    for i in range(n):
        a = 0.02 + 0.25 * np.sin(np.pi * t[i])
        lp += a * (noise[i] - lp)
        hp = 0.97 * (hp + lp - hp_prev_in)
        hp_prev_in = lp
        out[i] = hp
    env = np.sin(np.pi * t) ** 1.5
    return out * env * 0.8


def synth_register(sr=SR):
    bell = synth_chime([1318.5, 1760.0], step=0.06, decay=5.0)
    return bell


SYNTH = {
    'machine_done': lambda: synth_beeps([1046.5, 1046.5, 1318.5], dur=0.13, gap=0.1),
    'machine_start': lambda: synth_beeps([784.0, 1046.5], dur=0.08, gap=0.05),
    'machine_error': lambda: synth_beeps([392.0, 311.1], dur=0.18, gap=0.06),
    'blip': lambda: synth_blip(520),
    'heart': lambda: synth_chime([659.3, 830.6, 987.8, 1318.5], step=0.09),
    'sparkle': lambda: synth_chime([1567.98, 2093.0, 2637.0], step=0.05, decay=4.0),
    'whoosh': lambda: synth_whoosh(0.35),
    'whoosh2': lambda: synth_whoosh(0.28, seed=5),
    'register': synth_register,
    'notify': lambda: synth_chime([987.8, 1318.5], step=0.08, decay=3.5),
}


def build_music():
    os.makedirs(os.path.join(OUT, 'music'), exist_ok=True)
    for key, (title, gain) in MUSIC.items():
        src = os.path.join(MUS, title + '.mp3')
        if not os.path.exists(src):
            url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/%s.mp3' % urllib.parse.quote(title)
            os.makedirs(MUS, exist_ok=True)
            subprocess.run(['curl', '-sSL', '-o', src, url], check=True)
        dst = os.path.join(OUT, 'music', key + '.ogg')
        subprocess.run([FF, '-v', 'quiet', '-y', '-i', src, '-af', 'volume=%ddB' % gain, '-ac', '2', '-ar', '44100',
                        '-c:a', 'libvorbis', '-q:a', '0.6', dst], check=True)
        print('music', key, os.path.getsize(dst) // 1024, 'KB')


def build_sfx():
    os.makedirs(os.path.join(OUT, 'sfx'), exist_ok=True)
    for name, (src, start, dur, gain, fin, fout) in SFX.items():
        auto = src.startswith('auto:')
        path = src_path(src[5:] if auto else src)
        x = load(path)
        if auto:
            x = densest_window(x, start)
        else:
            s = int(start * SR)
            x = x[s:s + int(dur * SR)] if dur > 0 else x[s:]
        x = fade(x, fin, fout)
        x = normalize(x, -1.0) * 10 ** (gain / 20)
        save_ogg(x, os.path.join(OUT, 'sfx', name + '.ogg'), quality=3)
    for name, fn in SYNTH.items():
        x = normalize(fn(), -3.0)
        save_ogg(x, os.path.join(OUT, 'sfx', name + '.ogg'), quality=3)
    print('sfx', len(SFX) + len(SYNTH))


def build_amb():
    os.makedirs(os.path.join(OUT, 'amb'), exist_ok=True)
    for name, (src, start, length, gain, stereo) in AMB.items():
        x = load(src_path(src), stereo=stereo)
        s = int(start * SR)
        x = x[s:]
        loop = make_loop(x, length) if length > 0 else x.copy()
        loop = normalize(loop, -3.0, target_rms_db=-18.0) * 10 ** (gain / 20)
        save_ogg(loop, os.path.join(OUT, 'amb', name + '.ogg'), quality=1)
        print('amb', name, '%.1fs' % (len(loop) / SR))


def write_credits():
    creds = json.load(open(os.path.join(FS, 'credits.json')))
    used = set()
    for spec in list(SFX.values()) + list(AMB.values()):
        src = spec[0].replace('auto:', '')
        if src.startswith('fs:'):
            used.add(src[3:])
    lines = []
    for k in sorted(used):
        c = creds[k]
        lines.append({'sound': c['title'], 'author': c.get('author', ''), 'license': c['license'], 'url': c['url']})
    json.dump({'freesound': lines,
               'music': [{'key': k, 'title': t, 'author': 'Kevin MacLeod (incompetech.com)', 'license': 'CC BY 4.0'}
                         for k, (t, _) in MUSIC.items()]},
              open(os.path.join(OUT, 'credits.json'), 'w'), indent=1)


if __name__ == '__main__':
    what = sys.argv[1:] or ['music', 'sfx', 'amb']
    if 'music' in what:
        build_music()
    if 'sfx' in what:
        build_sfx()
    if 'amb' in what:
        build_amb()
    write_credits()
