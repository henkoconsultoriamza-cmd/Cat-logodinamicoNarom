"""
Extrae recortes de sección del catálogo Saniplast.
Por cada código, recorta el bloque del producto (nombre + foto + specs + tabla).
Genera public/products/sani_sections/ y sani_sections_map.json
"""
import sys, json, re
from pathlib import Path
import pymupdf
from PIL import Image

PDF_PATH = Path(sys.argv[1])
PROJECT_DIR = Path(sys.argv[2])
SECTIONS_DIR = PROJECT_DIR / "public" / "products" / "sani_sections"
MAP_FILE = SECTIONS_DIR / "sani_sections_map.json"
SECTIONS_DIR.mkdir(parents=True, exist_ok=True)

SCALE = 3.0
CODE_RE = re.compile(r'^\d{3,5}$')   # códigos Saniplast: 3-5 dígitos
# Palabras que NO son códigos aunque sean solo dígitos
SKIP_WORDS = {'100', '120', '150', '140', '180', '200', '60', '50', '40', '70', '30',
              '27', '42', '72', '80', '90', '12', '25', '20', '32', '40', '50'}

def render_page(page):
    mat = pymupdf.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def is_product_name_word(word, y, x, size_hint=None):
    """Detecta si una palabra es parte de un nombre de producto (mayúsculas, no es header ni footer)."""
    if not word.isupper():
        return False
    if len(word) < 3:
        return False
    # Ignorar header de categoría (primeras líneas, y < 120)
    if y < 100:
        return False
    # Ignorar footer (y > 800)
    if y > 800:
        return False
    # Ignorar palabras de tabla
    if word in {'MEDIDA', 'CODIGO', 'BULTO', 'UNID', 'MM', 'CM', 'ML', 'CC', 'WW', 'W'}:
        return False
    return True

def find_codes_on_page(words):
    """Extrae todos los códigos (3-5 dígitos) con sus posiciones."""
    codes = []
    for w in words:
        x0, y0, x1, y1, word = w[:5]
        word = word.strip().rstrip('.')
        if CODE_RE.match(word) and word not in SKIP_WORDS:
            # Validate: should have a | nearby (table row)
            codes.append({'code': word, 'x': (x0+x1)/2, 'y': (y0+y1)/2, 'y0': y0, 'y1': y1})
    return codes

def find_product_blocks(words, page_w, page_h):
    """
    Detecta bloques de productos: regiones de la página donde hay un nombre de producto.
    Retorna lista de {name, x_col (L/R), y_top, y_bot}.
    """
    # Collect uppercase word groups (product names)
    # Group consecutive uppercase words at similar Y
    name_words = []
    for w in words:
        x0, y0, x1, y1, word = w[:5]
        if is_product_name_word(word, (y0+y1)/2, (x0+x1)/2):
            name_words.append({'word': word, 'x': (x0+x1)/2, 'y': (y0+y1)/2, 'y0': y0})

    # Group words into name blocks (same Y ± 30, same X column)
    blocks = []
    used = set()
    for i, nw in enumerate(name_words):
        if i in used:
            continue
        group = [nw]
        used.add(i)
        for j, nw2 in enumerate(name_words):
            if j in used:
                continue
            if abs(nw2['y'] - nw['y']) < 35 and abs(nw2['x'] - nw['x']) < 300:
                group.append(nw2)
                used.add(j)
        name = ' '.join(g['word'] for g in sorted(group, key=lambda g: g['x']))
        y_top = min(g['y0'] for g in group) - 5
        col = 'L' if sum(g['x'] for g in group)/len(group) < page_w/2 else 'R'
        blocks.append({'name': name, 'col': col, 'y_name': y_top, 'group_y': nw['y']})

    # Sort by y
    blocks.sort(key=lambda b: b['y_name'])

    # Assign y_bot = next block start in same column (or page bottom)
    for i, b in enumerate(blocks):
        next_same_col = [b2 for b2 in blocks[i+1:] if b2['col'] == b['col']]
        b['y_bot'] = next_same_col[0]['y_name'] - 5 if next_same_col else page_h

    return blocks

def assign_code_to_block(code_info, blocks, page_w):
    """Asigna un código al bloque de producto más cercano."""
    col = 'L' if code_info['x'] < page_w / 2 else 'R'
    cx, cy = code_info['x'], code_info['y']

    # Filter by column
    col_blocks = [b for b in blocks if b['col'] == col]
    if not col_blocks:
        col_blocks = blocks

    # Find block whose Y range contains this code (or is just above it)
    for b in sorted(col_blocks, key=lambda b: b['y_name']):
        if b['y_name'] <= cy <= b['y_bot'] + 30:
            return b

    # Fallback: nearest block in same column above the code
    above = [b for b in col_blocks if b['y_name'] <= cy + 50]
    if above:
        return sorted(above, key=lambda b: abs(b['y_name'] - cy))[0]

    return None

def crop_block(img, block, page_w, page_h, scale):
    """Recorta el bloque del producto de la imagen renderizada."""
    col = block['col']
    y_top = max(0, block['y_name'] - 10)
    y_bot = min(page_h, block['y_bot'] + 10)

    # X range
    half = page_w / 2
    if col == 'L':
        x_left, x_right = 0, half
    else:
        x_left, x_right = half, page_w

    # Convert to pixels
    px_l = int(x_left * scale)
    px_r = int(x_right * scale)
    px_t = int(y_top * scale)
    px_b = int(y_bot * scale)

    px_l = max(0, px_l)
    px_r = min(img.width, px_r)
    px_t = max(0, px_t)
    px_b = min(img.height, px_b)

    return img.crop((px_l, px_t, px_r, px_b))

def main():
    # Load existing Saniplast SKUs from catalog-data
    catalog_file = PROJECT_DIR / "app" / "catalog-data.ts"
    catalog_text = catalog_file.read_text(encoding='utf-8')

    # Extract SKUs for SANIPLAST products
    sani_skus = set()
    blocks_ts = catalog_text.split('brand: "SANIPLAST"')
    for i in range(1, len(blocks_ts)):
        m = re.search(r'sku:\s*"([^"]+)"', blocks_ts[i])
        if m:
            sani_skus.add(m.group(1))
    print(f"SKUs SANIPLAST en catalogo: {len(sani_skus)}")

    doc = pymupdf.open(str(PDF_PATH))
    total_pages = doc.page_count
    print(f"Paginas en PDF: {total_pages}")

    code_to_image = {}   # code -> image path
    code_to_block = {}   # code -> block name (for debug)
    page_renders = {}    # page_num -> PIL Image (lazy)

    for pnum in range(total_pages):
        page = doc[pnum]
        words = page.get_text("words")
        page_w = page.rect.width
        page_h = page.rect.height

        codes = find_codes_on_page(words)
        # Only codes that match catalog SKUs
        relevant_codes = [c for c in codes if c['code'] in sani_skus]
        if not relevant_codes:
            continue

        blocks = find_product_blocks(words, page_w, page_h)
        if not blocks:
            print(f"  Pag {pnum+1}: sin bloques detectados ({len(relevant_codes)} codigos)")
            continue

        # Render page once
        if pnum not in page_renders:
            page_renders[pnum] = render_page(page)
        img = page_renders[pnum]

        for ci in relevant_codes:
            code = ci['code']
            if code in code_to_image:
                continue  # ya procesado

            block = assign_code_to_block(ci, blocks, page_w)
            if block is None:
                print(f"  Pag {pnum+1}: codigo {code} sin bloque")
                continue

            crop = crop_block(img, block, page_w, page_h, SCALE)
            if crop.width < 20 or crop.height < 20:
                print(f"  Pag {pnum+1}: codigo {code} crop invalido")
                continue

            # Save image
            # Use block name slug + code to avoid collisions
            fname = f"sani_p{pnum+1:02d}_{code}.jpeg"
            out_path = SECTIONS_DIR / fname
            crop.save(str(out_path), "JPEG", quality=88)

            rel_path = f"/products/sani_sections/{fname}"
            code_to_image[code] = rel_path
            code_to_block[code] = block['name']
            print(f"  Pag {pnum+1}: [{block['col']}] {block['name'][:30]} -> codigo {code}")

    doc.close()

    # Save map
    result = {
        "code_to_image": code_to_image,
        "code_to_block": code_to_block
    }
    MAP_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nGuardados: {len(code_to_image)} secciones de {len(sani_skus)} SKUs")
    missing = sani_skus - set(code_to_image.keys())
    if missing:
        print(f"Sin seccion ({len(missing)}): {sorted(missing)[:20]}")

if __name__ == "__main__":
    main()
