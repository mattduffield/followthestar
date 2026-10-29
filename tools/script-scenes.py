#!/usr/bin/env python3
"""The script, one PDF per scene, for the volunteers page (like the rehearsal audio): the Assistant Guide's
introduction, then Scenes 1 to 8, each from its "SCENE n" heading to the next. Read from the Google Doc (shared
"Anyone with the link"), so run this again after the script is edited there:

  python3 tools/script-scenes.py

(needs only Python 3 and Google Chrome, which makes the PDFs; see README.md)

Writes src/volunteers/script/introduction.pdf and scene-1.pdf … scene-8.pdf (same names every time, so the page's
links stay the same).
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
