#!/usr/bin/env python3
"""The script, one PDF per scene, for the volunteers page (like the rehearsal audio): the Assistant Guide's
introduction, then Scenes 1 to 8, each from its "SCENE n" heading to the next. Read from the Google Doc (shared
"Anyone with the link"), so run this again after the script is edited there:

  python3 tools/script-scenes.py

(needs only Python 3 and Google Chrome, which makes the PDFs; see README.md)

Writes src/volunteers/script/introduction.pdf and scene-1.pdf … scene-8.pdf (same names every time, so the page's
links stay the same), and src/volunteers/script/index.html: the script online, where a volunteer picks their part
and sees their lines highlighted, the whole script or one scene, on a phone or printed (the page's look and workings
are in tools/script-page.html).
"""
import datetime
import os
import re
import subprocess
import tempfile
import urllib.request
from html.parser import HTMLParser

DOC = '112kx0E3xVy6x3YmJ-eO2zmc91_mYG0UvhFyk5rKnPso'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src', 'volunteers', 'script')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'



class Body(HTMLParser):
    """The <body>'s top-level elements (Google's export is one flat run of paragraphs, page breaks and tables), each
    as its tag, its own HTML and its text."""
    VOID = {'br', 'hr', 'img', 'meta', 'link', 'input', 'col', 'wbr'}

    def __init__(self, page):
        super().__init__(convert_charrefs=True)
        self.page, self.lines = page, [0]
        for line in page.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.inbody, self.depth, self.els, self.cls = False, 0, [], ''
        self.feed(page)

    def at(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag == 'body':
            self.inbody, self.cls = True, dict(attrs).get('class') or ''
        elif self.inbody:
            if self.depth == 0:
                self.cur = {'tag': tag, 'start': self.at(), 'text': ''}
            if tag in self.VOID:
                if self.depth == 0:
                    self.close(self.at() + len(self.get_starttag_text()))
            else:
                self.depth += 1

    def handle_endtag(self, tag):
        if self.inbody and tag != 'body' and tag not in self.VOID and self.depth:
            self.depth -= 1
            if self.depth == 0:
                self.close(self.page.index('>', self.at()) + 1)

    def handle_data(self, data):
        if self.inbody and self.depth:
            self.cur['text'] += data

    def close(self, end):
        self.cur['html'] = self.page[self.cur['start']:end]
        self.cur['text'] = self.cur['text'].strip()
        self.els.append(self.cur)


page = urllib.request.urlopen(f'https://docs.google.com/document/d/{DOC}/export?format=html').read().decode('utf-8')
style = ''.join(re.findall(r'<style[^>]*>(.*?)</style>', page, re.S))
body = Body(page)

# the parts: everything before SCENE 1 is the introduction; each SCENE n heading starts the next part
parts, current = [], {'n': 0, 'title': 'Assistant Guide', 'els': []}
for el in body.els:
    m = re.match(r'SCENE\s+(\d+)(.*)', el['text'], re.S)
    if m and el['tag'] == 'p':
        parts.append(current)
        # (the title is the next line: its own paragraph, or after a line break in this one, as in Scene 4)
        current = {'n': int(m.group(1)), 'title': m.group(2).strip() or None, 'els': [el]}
        continue
    if current['n'] and current['title'] is None and el['text']:
        current['title'] = el['text']   # (the line after the heading: A MODERN FAMILY'S HOME)
    current['els'].append(el)
parts.append(current)
found = [p['n'] for p in parts]
if found != list(range(9)):
    raise SystemExit(f'expected the introduction and scenes 1 to 8, found {found}: has a SCENE heading changed?')


def title_case(t):   # A MODERN FAMILY’S HOME → A Modern Family’s Home; THE TEMPLE IN JERUSALEM → The Temple in Jerusalem
    words = t.lower().split()
    return ' '.join(w if i and w in ('in', 'of', 'the', 'and', 'a', 'at') else w[:1].upper() + w[1:] for i, w in enumerate(words))


# ----- the script online (src/volunteers/script/index.html): each line knows who says it, so a volunteer can pick their
# part and see their lines highlighted (made from the same reading of the Doc as the PDFs below) -----
import html as htmllib
import json

CLS = dict(re.findall(r'\.(c\d+)\{([^}]*)\}', style))
CUE_FIX = {'WISEMEN 1': 'WISEMAN 1'}   # (a typo in the Doc)
# parts with no lines of their own, named only in the stage directions
SILENT = ['MARY', 'JOSEPH', 'ANGEL CHOIR', 'ANGEL']
# the Doc's group names, and who they mean (ALL and ALL ACTORS: everyone in that scene)
GROUPS = {'WISEMEN': r'WISEMAN \d', 'SHEPHERDS': r'SHEPHERD \d', 'PRIESTS': r'(HIGH )?PRIEST', 'TEACHERS': r'TEACHER \d',
          'ANGELS CHOIR': r'ANGEL CHOIR', 'GUARDS': r'GUARDS|TEMPLE GUARD', 'SOLDIERS': r'.*SOLDIER'}


def css_of(classes):
    return ';'.join(CLS.get(c, '') for c in (classes or '').split())


def runs(el):   # a paragraph's text in runs, each [text, 1 if in italics (a stage direction) else 0]
    out = []
    for c, inner in re.findall(r'<span class="([^"]*)"[^>]*>(.*?)</span>', el['html'], re.S):
        t = htmllib.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<br[^>]*>', ' ', inner))).replace('\xa0', ' ')
        t = re.sub(r'[ \t]+', ' ', t)
        if not t:
            continue
        it = 1 if 'font-style:italic' in css_of(c) else 0
        if out and out[-1][1] == it:
            out[-1][0] += t
        else:
            out.append([t, it])
    if out:
        out[0][0] = out[0][0].lstrip(); out[-1][0] = out[-1][0].rstrip()
    return [r for r in out if r[0]]


def members(cue):   # WISEMAN 1 & 2 → WISEMAN 1, WISEMAN 2; WISEMEN & GUIDE → the three wise men and the guide
    out, base = [], ''
    for part in re.split(r'\s*(?:&|,|\bAND\b)\s*', CUE_FIX.get(cue, cue)):
        part = part.strip()
        if part.isdigit() and base:
            part = base + ' ' + part
        if part in GROUPS:
            out.append(part); base = 'WISEMAN' if part == 'WISEMEN' else ''; continue
        if part:
            out.append(part); base = re.sub(r'\s*\d+$', '', part)
    return out


def named(text, roles):   # the parts and groups a stage direction names, longest names first (ASSISTANT GUIDE before GUIDE)
    found, rest = [], text
    for name in sorted(set(roles) | set(GROUPS) | {'ALL ACTORS', 'ALL'}, key=len, reverse=True):
        pat = r'(?<![A-Z’\'])' + re.escape(name).replace(r'\ ', r'\s+') + r'(?![A-Z’\'])'
        if name in ('MARY', 'JOSEPH'):
            pat = pat.replace(re.escape(name), name + r'(?:’S)?')
        if re.search(pat, rest):
            found.append(name); rest = re.sub(pat, ' ', rest)
    return found


script = []
for p in parts:
    blocks, speaker = [], None
    for i, el in enumerate(p['els']):
        t = re.sub(r'\s+', ' ', el['text']).strip()
        if el['tag'] != 'p' or not t or (p['n'] and i == 0) or (p['n'] and t == p['title'] and not blocks):
            continue   # (empty, the SCENE heading and its title)
        pcss = css_of((re.match(r'<p class="([^"]*)"', el['html']) or [None, ''])[1])
        if 'text-align:center' in pcss and t.upper() == t and len(t) < 45:
            speaker = CUE_FIX.get(re.sub(r'\s*\(.*?\)', '', t).strip(), t)
            blocks.append({'cue': speaker, 'who': members(speaker)})
            continue
        rs = runs(el)
        if not rs:
            continue
        if speaker and any(not it and x.strip() for x, it in rs):
            blocks.append({'say': rs, 'who': members(speaker)})
        else:   # a stage direction: who it names, or else (just after a line) what the speaker does
            blocks.append({'dir': ' '.join(x for x, _ in rs).strip(), 'speaker': speaker})
    script.append({'n': p['n'], 'title': 'Assistant Guide' if p['n'] == 0 else title_case(p['title']), 'blocks': blocks})
speaking = list(dict.fromkeys(w for s_ in script for b in s_['blocks'] if 'cue' in b for w in b['who'] if w not in GROUPS))
for s_ in script:
    for b in s_['blocks']:
        if 'dir' in b:
            sp = b.pop('speaker')
            # (who it names; but "To WISEMEN" inside a line is who the speaker turns to, not what they do)
            who = [] if re.match(r'(?i)to\s', b['dir']) and sp else named(b['dir'], speaking + SILENT)
            b['who'] = who or ([w for w in members(sp)] if sp and len(b['dir']) < 90 else [])
ALL_PARTS = speaking + SILENT


def expand(who, scene):   # group names → the parts they mean
    out = []
    for w in who:
        if w in GROUPS:
            out += [r for r in ALL_PARTS if re.fullmatch(GROUPS[w], r)]
        elif w in ('ALL', 'ALL ACTORS'):
            out += scene
        else:
            out.append(w)
    return list(dict.fromkeys(out))


for s_ in script:
    here = list(dict.fromkeys(w for b in s_['blocks'] for w in b['who'] if w in ALL_PARTS))
    for b in s_['blocks']:
        b['who'] = expand(b['who'], here)
    s_['parts'] = list(dict.fromkeys(w for b in s_['blocks'] for w in b['who']))
PAGE = os.path.join(ROOT, 'tools', 'script-page.html')   # (the page itself: its look and how it works)
page_html = open(PAGE).read().replace('__SCRIPT__', json.dumps({'scenes': script, 'speaking': speaking, 'silent': SILENT}, ensure_ascii=False)) \
    .replace('__DATE__', datetime.date.today().strftime('%B %-d, %Y'))
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w').write(page_html)
print('wrote', os.path.relpath(os.path.join(OUT, 'index.html'), ROOT), '· the script online, with', len(ALL_PARTS), 'parts to pick from')


today = datetime.date.today().strftime('%B %-d, %Y')
os.makedirs(OUT, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    for p in parts:
        els = p['els']
        while els and (els[-1]['tag'] == 'hr' or not els[-1]['text']):   # (the page break before the next scene)
            els.pop()
        name = 'introduction' if p['n'] == 0 else f'scene-{p["n"]}'
        label = 'Introduction: Assistant Guide' if p['n'] == 0 else f'Scene {p["n"]}: {title_case(p["title"])}'
        html = (f'<!doctype html><html><head><meta charset="utf-8"><title>Follow the Star script: {label}</title><style>{style}\n'
                '@page {size: letter; margin: 0.75in;}\n'
                '.doc-content {max-width: none !important; padding: 0 !important;}\n'
                '.made {font: 9pt Arial, sans-serif; color: #777; border-bottom: 1px solid #ccc; padding-bottom: 4pt; margin-bottom: 12pt;}\n'
                f'</style></head><body class="{body.cls}">'
                f'<div class="made">Follow the Star script · {label} · as of {today} (the full script: followthestar.church/volunteers)</div>'
                + ''.join(e['html'] for e in els) + '</body></html>')
        src = os.path.join(tmp, name + '.html')
        open(src, 'w').write(html)
        pdf = os.path.join(OUT, name + '.pdf')
        subprocess.run([CHROME, '--headless=new', '--no-pdf-header-footer', f'--print-to-pdf={pdf}', 'file://' + src], check=True, capture_output=True)
        print('wrote', os.path.relpath(pdf, ROOT), '·', label)
