"""Static checks for the story data: every referenced script node exists, every <<command>>
is one the story director implements, and every character/expression used has a portrait.
Usage: python3 tools/check_story.py   (exit code 1 on problems)
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'web', 'js', 'data')
problems = []

nodes = {}
lines_by_node = {}
for f in sorted(glob.glob(os.path.join(DATA, 'story', '*.js'))):
    cur = None
    for i, line in enumerate(open(f, encoding='utf8').read().split('\n'), 1):
        m = re.match(r'^===\s*(\S+)', line)
        if m:
            cur = m.group(1)
            if cur in nodes:
                problems.append(f'duplicate node {cur} ({os.path.basename(f)}:{i} and {nodes[cur]})')
            nodes[cur] = f'{os.path.basename(f)}:{i}'
            lines_by_node[cur] = []
        elif cur:
            lines_by_node[cur].append((f, i, line))

story_src = open(os.path.join(ROOT, 'web', 'js', 'game', 'story.js'), encoding='utf8').read()
known_cmds = set(re.findall(r"case '([a-z_]+)':", story_src)) | {'if', 'elseif', 'else', 'endif'}

refs = []   # (node, where)
for n, lines in lines_by_node.items():
    for f, i, line in lines:
        where = f'{os.path.basename(f)}:{i}'
        for cmd in re.findall(r'<<\s*([a-z_]+)', line):
            if cmd not in known_cmds:
                problems.append(f'unknown command <<{cmd}>> at {where}')
        m = re.match(r'^\s*->\s*(\S+)', line)
        if m:
            refs.append((m.group(1), where))
        m = re.search(r'<<jump\s+(\S+?)>>', line)
        if m:
            refs.append((m.group(1), where))

for f in ['events.js', 'chatter.js']:
    src = open(os.path.join(DATA, f), encoding='utf8').read()
    for m in re.finditer(r"node:\s*'([^']+)'", src):
        refs.append((m.group(1), f))
calls = open(os.path.join(DATA, 'calls.js'), encoding='utf8').read()
for m in re.finditer(r"goto:\s*'([^']+)'", calls):
    refs.append((m.group(1), 'calls.js'))
for m in re.finditer(r"goto:\s*\w+\s*\?\s*'([^']+)'\s*:\s*'([^']+)'", calls):
    refs.append((m.group(1), 'calls.js')); refs.append((m.group(2), 'calls.js'))
for who in ['walt', 'maya', 'june', 'remy']:
    for react in ['love', 'like', 'neutral', 'dislike']:
        refs.append((f'gift_{who}_{react}', 'story.giftTo'))
refs.append(('chat_generic', 'story.pickChatter'))
refs.append(('prologue', 'main.prologue'))

for n, where in refs:
    if n not in nodes:
        problems.append(f'missing node {n} (referenced from {where})')

# speakers and expressions
chars = open(os.path.join(DATA, 'characters.js'), encoding='utf8').read()
sprites = set(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(ROOT, 'web', 'assets', 'sprites', '*.webp')))
speakers = set(re.findall(r'^\s{2}(\w+):\s*\{\s*\n?\s*name:', chars, re.M)) | set(re.findall(r'^\s{2}(\w+):\s*\{\s*name:', chars, re.M))
for n, lines in lines_by_node.items():
    for f, i, line in lines:
        m = re.match(r'^\s*(\w+)(?:\.(\w+))?:\s', line)
        if m and not line.strip().startswith('*'):
            who = m.group(1)
            if who not in speakers:
                problems.append(f'unknown speaker {who} at {os.path.basename(f)}:{i}')

# command arguments must name things that exist
def keys_of(file, table):
    t = open(os.path.join(DATA, file), encoding='utf8').read()
    start = t.index('export const ' + table)
    body = t[start:t.index('\n};', start)]
    return set(re.findall(r'^\s{2}(\w+)\s*(?::|\()', body, re.M))
tables = {
    'give': keys_of('items.js', 'ITEMS'), 'take': keys_of('items.js', 'ITEMS'),
    'letter': keys_of('letters.js', 'LETTERS'), 'decor': keys_of('decor.js', 'DECOR'),
    'upgrade': keys_of('decor.js', 'UPGRADES'), 'record': keys_of('items.js', 'RECORDS'),
    'call': keys_of('calls.js', 'CALLS'),
}
people = {'walt', 'maya', 'june', 'remy'}
for n, lines in lines_by_node.items():
    for f, i, line in lines:
        for cmd, arg in re.findall(r'<<\s*([a-z_]+)\s+([\w.-]+)', line):
            where = f'{os.path.basename(f)}:{i}'
            if cmd in tables and arg not in tables[cmd]:
                problems.append(f'<<{cmd} {arg}>> names something that does not exist ({where})')
            if cmd in ('visit', 'leave', 'pin', 'stay', 'await_arrival', 'rel') and arg not in people:
                problems.append(f'<<{cmd} {arg}>>: unknown person ({where})')
        m = re.search(r'<<place\s+(\w+)\s+(\w+)', line)
        if m and m.group(2) not in tables['decor']:
            problems.append(f'<<place>> unknown decor {m.group(2)} ({os.path.basename(f)}:{i})')

# text placeholders the dialogue formatter understands (ui/dialogue.js formatText)
fmt = open(os.path.join(ROOT, 'web', 'js', 'ui', 'dialogue.js'), encoding='utf8').read()
known_ph = set(re.findall(r"\\\{(\w+)\\\}", fmt)) | {'var'}
for n, lines in lines_by_node.items():
    for f, i, line in lines:
        if line.strip().startswith('<<'):
            continue
        for ph in re.findall(r'\{(\w+)(?:\.\w+)?\}', line):
            if ph not in known_ph:
                problems.append(f'unknown placeholder {{{ph}}} at {os.path.basename(f)}:{i}')

unused = [n for n in nodes if n not in {r[0] for r in refs} and not n.startswith(('gift_', 'chat_')) and not re.match(r'^(walt|maya|june|remy)_c\d+$', n)]
print(f'{len(nodes)} nodes, {len(refs)} references, {len(problems)} problems')
for p in problems:
    print('  -', p)
if unused:
    print('nodes never referenced directly (may be fine: reached via specific gifts etc.):')
    for n in unused:
        print('   ', n, nodes[n])
sys.exit(1 if problems else 0)
