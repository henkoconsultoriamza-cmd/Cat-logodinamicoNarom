"""
Extrae secciones del catálogo MOTA.
Las imágenes del PDF son XObjects, no bloques inline. Usamos get_image_rects()
para obtener la bbox de cada imagen en la página, filtramos por tamaño y
asignamos ART codes a la imagen más grande de cada zona vertical.

Multiples SKUs pueden compartir la misma imagen (variantes de color, boquilla, etc.)
"""
import sys, json, re
from pathlib import Path
import pymupdf
from PIL import Image

PDF_PATH = Path(sys.argv[1])
PROJ_DIR = Path(sys.argv[2])
OUT_DIR  = PROJ_DIR / "public" / "products" / "mota_sections"
MAP_FILE = OUT_DIR / "mota_sections_map.json"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SCALE        = 2.5     # render resolution
MIN_PT_AREA  = 35_000  # pt² mínimo para considerar imagen de producto (~188x188pt)
MIN_PT_DIM   = 100     # ancho Y alto mínimo en pt (filtra strips horizontales/verticales)

# ART code MOTA: 1-5 letras MAYÚSCULAS + 1-5 dígitos + sufijo opcional
# Requiere al menos 1 letra Y al menos 1 dígito → excluye palabras puras en mayúsculas
ART_RE = re.compile(r'^[A-Z]{1,5}\d{1,5}[A-Z0-9]*(?:/[A-Z0-9]+)?$')

# Códigos completamente alfabéticos que SÍ son ART codes de MOTA
ART_ALPHA_ALLOW = {'PISD', 'PISL', 'PISP', 'PISR'}

SKIP = {
    'ART', 'MAX', 'MIN', 'RPM', 'KG', 'LTS', 'LT', 'CC', 'ML', 'MM', 'CM',
    'BAR', 'PSI', 'HZ', 'VAC', 'VDC', 'PDF', 'USA', 'EUR', 'RRP', 'EAN',
    'UPC', 'ISO', 'DIN', 'CEE', 'HVLP', 'TIPO', 'SIZE', 'TANK', 'TYPE',
    'PACK', 'CAJA', 'BOX', 'BOLSA', 'BAG', 'ENTRY', 'EXIT', 'COLOR', 'PESO',
    'WEIGHT', 'ENTRADA', 'SALIDA', 'HOSE', 'HEAD', 'INLET', 'TRUCK',
    'ROUND', 'IRON', 'WOOD', 'GLASS', 'TILES', 'CENTER', 'ZONE', 'BODY',
    'BLADE', 'HOLE', 'INFO', 'PAGE', 'MOTA', 'CODE', 'UNIT', 'UNITS',
}


def is_art_code(word):
    w = word.strip().rstrip('.')
    if len(w) < 3 or len(w) > 12:
        return False
    if w in SKIP:
        return False
    # Excluir códigos RAL (colores de pintura, no son SKU de producto)
    if w.startswith('RAL') and w[3:].isdigit():
        return False
    if ART_RE.match(w):
        return True
    if w in ART_ALPHA_ALLOW:
        return True
    return False


def find_art_codes(words):
    seen = set()
    codes = []
    for w in words:
        x0, y0, x1, y1, word, *_ = w
        if is_art_code(word) and word not in seen:
            seen.add(word)
            codes.append({
                'code': word,
                'x':  (x0 + x1) / 2,
                'y':  (y0 + y1) / 2,
            })
    return codes


def get_product_images(page):
    """
    Devuelve lista de imágenes de producto (grandes) con su bbox en coordenadas de página.
    Filtra por área y dimensiones mínimas para excluir iconos y strips delgados.
    Deduplica por xref (misma imagen puede aparecer varias veces — ej: logo).
    """
    seen_xrefs = set()
    result = []
    for img in page.get_images(full=True):
        xref, smask, px_w, px_h, bpc, cs, alt, name, filt, ref = img
        if xref in seen_xrefs:
            continue
        seen_xrefs.add(xref)

        if px_w < 150 or px_h < 150:
            continue  # tiny image, skip quickly

        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue

        for r in rects:
            pt_w = r.x1 - r.x0
            pt_h = r.y1 - r.y0
            pt_area = pt_w * pt_h
            if pt_area < MIN_PT_AREA:
                continue
            if pt_w < MIN_PT_DIM or pt_h < MIN_PT_DIM:
                continue
            result.append({
                'xref':    xref,
                'px_area': px_w * px_h,
                'pt_area': pt_area,
                'bbox':    (r.x0, r.y0, r.x1, r.y1),
            })

    return sorted(result, key=lambda x: x['bbox'][1])   # sort by Y (top→bottom)


def render_page(page):
    mat = pymupdf.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def crop_bbox(pil_img, bbox, pad=15):
    x0, y0, x1, y1 = bbox
    px0 = max(0,             int(x0 * SCALE) - pad)
    py0 = max(0,             int(y0 * SCALE) - pad)
    px1 = min(pil_img.width,  int(x1 * SCALE) + pad)
    py1 = min(pil_img.height, int(y1 * SCALE) + pad)
    return pil_img.crop((px0, py0, px1, py1))


def assign_codes_to_images(img_list, codes, page_h):
    """
    Divide la página en zonas verticales basadas en las imágenes de producto.
    Asigna cada ART code a la imagen cuya zona Y lo contiene.
    Códigos huérfanos (fuera de toda zona) se asignan a la imagen más grande.
    """
    if not img_list:
        return []

    # Crear zonas: cada imagen "domina" desde su Y superior hasta el inicio de la siguiente
    zones = []
    for i, img in enumerate(img_list):
        ix0, iy0, ix1, iy1 = img['bbox']
        next_y = img_list[i + 1]['bbox'][1] if i + 1 < len(img_list) else page_h
        # La zona incluye algo por encima de la imagen (heading, título) y llega hasta la próxima
        zone_y0 = max(0, iy0 - 60)
        zone_y1 = next_y - 5
        zones.append({
            'img':       img,
            'zone_y0':   zone_y0,
            'zone_y1':   zone_y1,
            'codes':     [],
        })

    # Asignar códigos a zonas
    assigned = set()
    for code in codes:
        for z in zones:
            if z['zone_y0'] <= code['y'] <= z['zone_y1']:
                z['codes'].append(code['code'])
                assigned.add(code['code'])
                break

    # Huérfanos → imagen más grande de la página
    biggest = max(img_list, key=lambda x: x['pt_area'])
    biggest_zone = next(z for z in zones if z['img'] is biggest)
    for code in codes:
        if code['code'] not in assigned:
            biggest_zone['codes'].append(code['code'])

    return [z for z in zones if z['codes']]


def main():
    doc = pymupdf.open(str(PDF_PATH))
    print(f"Paginas: {doc.page_count}")

    art_to_image = {}
    art_to_page  = {}
    saved_files  = {}   # fname → already written

    for pnum in range(doc.page_count):
        page   = doc[pnum]
        words  = page.get_text("words")
        page_h = page.rect.height

        codes    = find_art_codes(words)
        img_list = get_product_images(page)

        if not codes:
            continue

        if not img_list:
            # Página sin imagen de producto grande → registrar sin imagen
            for c in codes:
                if c['code'] not in art_to_image:
                    art_to_image[c['code']] = ''
                    art_to_page[c['code']]  = pnum + 1
            print(f"Pag {pnum+1:03d}: {len(codes)} codigos, sin foto de producto")
            continue

        zones    = assign_codes_to_images(img_list, codes, page_h)
        pil_img  = None   # lazy render

        for z in zones:
            if not z['codes']:
                continue

            main_code = z['codes'][0].replace('/', '_')
            fname     = f"mota_{main_code}.jpeg"
            rel_path  = f"/products/mota_sections/{fname}"
            out_path  = OUT_DIR / fname

            if fname not in saved_files:
                if pil_img is None:
                    pil_img = render_page(page)
                crop = crop_bbox(pil_img, z['img']['bbox'])
                if crop.width > 20 and crop.height > 20:
                    crop.save(str(out_path), "JPEG", quality=88)
                    saved_files[fname] = True
                else:
                    rel_path = ''

            for code in z['codes']:
                if code not in art_to_image:
                    art_to_image[code] = rel_path
                    art_to_page[code]  = pnum + 1

            print(f"Pag {pnum+1:03d}: {z['codes']} -> {fname}")

    doc.close()

    result = {"art_to_image": art_to_image, "art_to_page": art_to_page}
    MAP_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    with_img  = sum(1 for v in art_to_image.values() if v)
    print(f"\nTotal codigos: {len(art_to_image)}  |  Con imagen: {with_img}  |  Sin imagen: {len(art_to_image) - with_img}")


if __name__ == "__main__":
    main()
