"""
Busca los SKUs sin mapeo en el PDF del catálogo INGCO y extrae sus secciones.
Actualiza public/products/ingco_sections/sections_map.json con los nuevos hallazgos.
"""
import sys, json, re, math
from pathlib import Path
import pymupdf
from PIL import Image

PDF_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("Catálogo INGCO.pdf")
SECTIONS_DIR = Path("public/products/ingco_sections")
MAP_FILE = SECTIONS_DIR / "sections_map.json"
UNMAPPED_FILE = Path("unmapped_skus.json")

SCALE = 3.0  # resolución de render
NUMERIC_RE = re.compile(r'\b7\d{4,6}\b')

def render_page(page):
    mat = pymupdf.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return img

def get_words(page):
    return page.get_text("words")  # (x0,y0,x1,y1,word,block,line,word_idx)

def find_products_on_page(words, page_h):
    """
    Devuelve lista de dicts: {sku, code, y_top, y_bot, x_left, x_right}
    sku = alphanumeric (ej. COSLI241197)
    code = numeric (ej. 701234)
    """
    # Collect numeric codes and their positions
    numeric_positions = []  # (y_center, x_center, code)
    sku_positions = []      # (y_center, x_center, sku)

    for w in words:
        x0, y0, x1, y1, word, *_ = w
        word = word.strip()
        y_c = (y0 + y1) / 2
        x_c = (x0 + x1) / 2
        if NUMERIC_RE.fullmatch(word):
            numeric_positions.append((y_c, x_c, word))
        # Alphanumeric SKU patterns
        elif re.match(r'^[A-Z]{2,}[\w\-]*\d+[\w\-]*$', word) and len(word) > 4:
            sku_positions.append((y_c, x_c, word))

    return numeric_positions, sku_positions

def associate_sku_code(numeric_positions, sku_positions, tolerance=25):
    """
    Match each numeric code with the nearest alphanumeric SKU within tolerance pts.
    Returns list of (sku, code, y_center, x_center)
    """
    results = []
    used_skus = set()
    for ny, nx, code in numeric_positions:
        best = None
        best_dist = tolerance * 2
        for sy, sx, sku in sku_positions:
            if sku in used_skus:
                continue
            dist = math.sqrt((ny - sy)**2 + (nx - sx)**2)
            if dist < best_dist:
                best_dist = dist
                best = (sy, sx, sku)
        if best:
            sy, sx, sku = best
            used_skus.add(sku)
            results.append((sku, code, (ny + sy) / 2, (nx + sx) / 2))
    return results

def crop_section(img, page, products_on_page, target_sku, page_h, page_w):
    """
    Recorta la sección del producto en la imagen renderizada.
    Si hay productos en la misma fila (misma Y), hace mitad izquierda/derecha.
    """
    if not products_on_page:
        return None

    # Ordenar por Y
    products_on_page_sorted = sorted(products_on_page, key=lambda p: p[2])
    target = next((p for p in products_on_page_sorted if p[0] == target_sku), None)
    if not target:
        return None

    t_sku, t_code, t_y, t_x = target

    # Buscar compañeros en la misma fila (mismo Y ± 30pt)
    row_companions = [p for p in products_on_page_sorted if abs(p[2] - t_y) < 30]

    # Determinar rango Y de la sección
    idx = products_on_page_sorted.index(target)
    y_above = products_on_page_sorted[idx - 1][2] if idx > 0 else 0
    y_below = products_on_page_sorted[idx + 1][2] if idx < len(products_on_page_sorted) - 1 else page_h

    # Para lado-a-lado con compañero, ajustar Y al compañero si están en misma fila
    row_y_vals = [p[2] for p in row_companions]
    min_row_y = min(row_y_vals)
    # Buscar el product anterior a la fila
    before_row = [p for p in products_on_page_sorted if p[2] < min_row_y - 30]
    after_row = [p for p in products_on_page_sorted if p[2] > min_row_y + 30]

    top_y = before_row[-1][2] if before_row else 0
    bot_y = after_row[0][2] if after_row else page_h

    # Margen vertical
    top_y = max(0, top_y - 5)
    bot_y = min(page_h, bot_y + 5)

    # Coordenadas en píxeles
    s = SCALE
    px_top = int(top_y * s)
    px_bot = int(bot_y * s)
    img_h, img_w = img.height, img.width

    px_top = max(0, px_top)
    px_bot = min(img_h, px_bot)

    if len(row_companions) >= 2:
        # Lado a lado: determinar si izquierda o derecha
        sorted_row = sorted(row_companions, key=lambda p: p[3])
        mid_x = page_w / 2
        if t_x < mid_x:
            px_left, px_right = 0, int(mid_x * s)
        else:
            px_left, px_right = int(mid_x * s), img_w
    else:
        px_left, px_right = 0, img_w

    return img.crop((px_left, px_top, px_right, px_bot))

def main():
    unmapped = json.loads(UNMAPPED_FILE.read_text())
    existing_map = json.loads(MAP_FILE.read_text())
    sku_to_code = existing_map.get("sku_to_code", {})
    code_to_image = existing_map.get("code_to_image", {})

    unmapped_set = set(unmapped) - set(sku_to_code.keys())
    print(f"Buscando {len(unmapped_set)} SKUs en el PDF...")

    doc = pymupdf.open(str(PDF_PATH))
    total_pages = doc.page_count

    found = {}      # sku -> (page_num, code, y, x)
    page_products = {}  # page_num -> list of (sku, code, y, x)

    print(f"Escaneando {total_pages} páginas...")
    for pnum in range(total_pages):
        page = doc[pnum]
        words = get_words(page)
        page_h = page.rect.height
        page_w = page.rect.width

        numeric_pos, sku_pos = find_products_on_page(words, page_h)
        associations = associate_sku_code(numeric_pos, sku_pos, tolerance=40)

        # Filter to only unmapped SKUs
        relevant = [(sku, code, y, x) for sku, code, y, x in associations if sku in unmapped_set]
        if relevant:
            page_products[pnum] = associations  # all products on page (for section calc)
            for sku, code, y, x in relevant:
                found[sku] = (pnum, code, y, x)
                if (pnum + 1) % 10 == 0 or len(found) % 20 == 0:
                    print(f"  Pag {pnum+1}: {sku} -> {code}")

    print(f"\nEncontrados: {len(found)} de {len(unmapped_set)}")
    print(f"No encontrados: {len(unmapped_set) - len(found)}")

    # Extract section crops
    saved = 0
    for sku, (pnum, code, y, x) in found.items():
        page = doc[pnum]
        page_h = page.rect.height
        page_w = page.rect.width
        img = render_page(page)

        all_products = page_products.get(pnum, [])
        crop = crop_section(img, page, all_products, sku, page_h, page_w)
        if crop is None or crop.width < 10 or crop.height < 10:
            print(f"  SKIP {sku}: crop inválido")
            continue

        fname = f"sect_p{pnum+1:03d}_{code}.jpeg"
        out_path = SECTIONS_DIR / fname
        crop.save(str(out_path), "JPEG", quality=85)

        rel_path = f"/products/ingco_sections/{fname}"
        sku_to_code[sku] = code
        code_to_image[code] = rel_path
        saved += 1

    doc.close()

    # Save updated map
    existing_map["sku_to_code"] = sku_to_code
    existing_map["code_to_image"] = code_to_image
    MAP_FILE.write_text(json.dumps(existing_map, ensure_ascii=False, indent=2))

    print(f"\nGuardados: {saved} nuevas secciones")
    print(f"Total en mapa: {len(sku_to_code)} SKUs")

    # Report not found
    not_found = unmapped_set - set(found.keys())
    if not_found:
        print(f"\nNo encontrados en PDF ({len(not_found)}):")
        for s in sorted(not_found):
            print(f"  {s}")

if __name__ == "__main__":
    main()
