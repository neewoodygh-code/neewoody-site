"""Build the public catalogue PDFs (2026-11-17).

usage: python scripts/build-catalogue-pdf.py [two|one|all]     (default: all)
  two: catalogue.html            -> neewoody-catalogue.pdf             (Volume Two, 2026)
  one: catalogue-volume-one.html -> neewoody-catalogue-volume-one.pdf  (Volume One, the Nov 2026 first edition)
Both PDFs are published at the site root and linked from Portfolio and the footer.

1. Headless Chrome prints catalogue.html to A4 (the tab links and the contents
   entries become clickable links inside the PDF).
2. PyMuPDF adds bookmarks (the PDF reader's sidebar): one per section, with each
   project page under it, so a client can jump straight to Wardrobes.
3. Photos are printed from copies resized to 1000 px on the long side, so the file
   downloads on a phone (the site's own photos are not touched).
Needs Chrome and PyMuPDF (pip install pymupdf, outside the repo).
Run it again after any change to catalogue.html, then commit the PDF.
"""
import os, re, subprocess, tempfile, pathlib
import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOLUMES = {
    'two': ('catalogue.html', 'neewoody-catalogue.pdf', 'Neewoody Custom Woodwork, Catalogue Volume Two'),
    'one': ('catalogue-volume-one.html', 'neewoody-catalogue-volume-one.pdf', 'Neewoody Custom Woodwork, Catalogue Volume One'),
}
CHROME = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
          r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']

SECTIONS = [('contents', 'Contents'), ('homes', 'Whole homes'), ('wardrobes', 'Wardrobes'), ('kitchens', 'Kitchens'),
            ('beds', 'Beds'), ('tv', 'TV walls and shelving'), ('dining', 'Dining and living'),
            ('solid', 'Solid wood'), ('commercial', 'Commercial')]

def page_plan(html):
    """For each <section class="page"> in order: (section key, title of the page).
    The key is the section id (Volume Two) or 'divider' for a section title page (Volume One)."""
    plan = []
    for m in re.finditer(r'<section([^>]*class="page[^"]*"[^>]*)>(.*?)</section>', html, re.S):
        attrs, body = m.group(1), m.group(2)
        sid = re.search(r'id="(\w+)"', attrs)
        h = re.search(r'<h[123][^>]*>(.*?)</h[123]>', body, re.S)
        title = re.sub(r'<[^>]+>', ' ', h.group(1)) if h else ''
        title = re.sub(r'\s+', ' ', title.replace('&amp;', '&')).strip()
        key = sid.group(1) if sid else ('divider' if 'divider' in attrs else None)
        plan.append((key, title))
    return plan

def stage(tmp, html, longest=1000, quality=64):
    """Copy catalogue.html, css and fonts into tmp, with every photo it uses resized to at most
    `longest` px (Chrome embeds photos at full file size even when they show small)."""
    import shutil
    from PIL import Image, ImageOps
    (tmp / 'catalogue.html').write_text(html, encoding='utf-8')
    shutil.copytree(ROOT / 'css', tmp / 'css')
    shutil.copytree(ROOT / 'fonts', tmp / 'fonts')
    for rel in sorted(set(re.findall(r'src="(images/[^"]+)"', html)) | {'images/favicon.ico'}):
        src, dst = ROOT / rel, tmp / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix.lower() not in ('.jpg', '.jpeg'):
            shutil.copy(src, dst); continue
        pic = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        pic.thumbnail((longest, longest), Image.LANCZOS)
        pic.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)

def build(vol):
    src, out, doc_title = VOLUMES[vol]
    HTML, OUT = ROOT / src, ROOT / out
    html = HTML.read_text(encoding='utf-8')
    chrome = next(c for c in CHROME if os.path.exists(c))
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='nw-catalogue-'))
    stage(tmp, html)
    raw = tmp / 'raw.pdf'
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    '--virtual-time-budget=20000', f'--print-to-pdf={raw}', (tmp / 'catalogue.html').as_uri()],
                   check=True, capture_output=True)
    doc = pymupdf.open(raw)
    plan = page_plan(html)
    assert len(plan) == doc.page_count, (len(plan), doc.page_count)

    names = dict(SECTIONS)
    toc = [[1, 'Cover', 1]]
    in_section = False
    for i, (sid, title) in enumerate(plan, start=1):
        if sid in names:
            toc.append([1, names[sid], i]); in_section = sid != 'contents'
        elif sid == 'divider':
            toc.append([1, title, i]); in_section = True
        elif i == 2 and not in_section:
            toc.append([1, 'About us', i])
        elif in_section and title and i < len(plan):
            toc.append([2, title, i])
    toc.append([1, 'Contact us', len(plan)])
    doc.set_toc(toc)
    doc.set_metadata({'title': doc_title,
                      'author': 'Neewoody Custom Woodwork', 'subject': 'Selected works, Accra, Ghana'})
    doc.set_pagemode('UseOutlines')  # open with the bookmarks sidebar showing, where the reader allows

    doc.save(OUT, garbage=4, deflate=True)
    links = sum(len(p.get_links()) for p in pymupdf.open(OUT))
    print(f'{OUT.name}: {doc.page_count} pages, {len(toc)} bookmarks, {links} links, {OUT.stat().st_size / 1e6:.1f} MB')

if __name__ == '__main__':
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for v in (VOLUMES if which == 'all' else [which]):
        build(v)
