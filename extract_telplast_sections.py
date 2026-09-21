"""
Extrae imágenes de sección del catálogo Telplast y genera entradas para catalog-data.ts
"""
import sys, json
from pathlib import Path
import pymupdf
from PIL import Image

PDF_PATH = Path(sys.argv[1])
PROJECT_DIR = Path(sys.argv[2])
SECTIONS_DIR = PROJECT_DIR / "public" / "products" / "telplast_sections"
SECTIONS_DIR.mkdir(parents=True, exist_ok=True)

SCALE = 2.5

def render_page(doc, pnum):
    page = doc[pnum]
    mat = pymupdf.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def save(img, name):
    path = SECTIONS_DIR / f"{name}.jpeg"
    img.save(str(path), "JPEG", quality=88)
    return f"/products/telplast_sections/{name}.jpeg"

def crop_left(img):
    return img.crop((0, 0, img.width // 2, img.height))

def crop_right(img):
    return img.crop((img.width // 2, 0, img.width, img.height))

def crop_third(img, n):  # n = 0, 1, 2
    w3 = img.width // 3
    return img.crop((w3 * n, 0, w3 * (n + 1), img.height))

doc = pymupdf.open(str(PDF_PATH))

# Render páginas necesarias
pages = {}
for pnum in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]:
    pages[pnum + 1] = render_page(doc, pnum)

doc.close()

# ── Guardar imágenes por producto ────────────────────────────────────────────
imgs = {}

# Pág 4: Adhesivo Multiuso (página completa para todos los tamaños)
imgs["adhesivo_multiuso"] = save(pages[4], "telp_p04_adhesivo_multiuso")

# Pág 5: Adhesivo PU Híbrido Blanco
imgs["adhesivo_pu_hibrido"] = save(pages[5], "telp_p05_adhesivo_pu_hibrido")

# Pág 6: Sellador Multiuso Acrílico (página completa)
imgs["sellador_multiuso"] = save(pages[6], "telp_p06_sellador_multiuso")

# Pág 7: Sellador PU 40 — Negro (izquierda) y Gris (derecha)
imgs["sellador_pu40_negro"] = save(crop_left(pages[7]), "telp_p07_sellador_pu40_negro")
imgs["sellador_pu40_gris"]  = save(crop_right(pages[7]), "telp_p07_sellador_pu40_gris")

# Pág 8: Siliconas — página completa (4 productos juntos)
imgs["siliconas"] = save(pages[8], "telp_p08_siliconas")

# Pág 9: Reparador Grietas Piscinas
imgs["reparador_piscinas"] = save(pages[9], "telp_p09_reparador_piscinas")

# Pág 10: Sellador Zinguería
imgs["sellador_zingueria"] = save(pages[10], "telp_p10_sellador_zingueria")

# Pág 11: Sellador de Grietas
imgs["sellador_grietas"] = save(pages[11], "telp_p11_sellador_grietas")

# Pág 12: Masilla para Madera (página completa, 7 colores)
imgs["masilla_madera"] = save(pages[12], "telp_p12_masilla_madera")

# Pág 13: Reparador de Pared
imgs["reparador_pared"] = save(pages[13], "telp_p13_reparador_pared")

# Pág 14: Cola Vinílica Carpintera
imgs["cola_vinilica"] = save(pages[14], "telp_p14_cola_vinilica")

# Pág 15: Cemento de Contacto
imgs["cemento_contacto"] = save(pages[15], "telp_p15_cemento_contacto")

# Pág 16: Protector Subcarrocería (izquierda) + Sellador Carrocería (derecha)
imgs["protector_subcarroceria"] = save(crop_left(pages[16]),  "telp_p16_protector_subcarroceria")
imgs["sellador_carroceria"]     = save(crop_right(pages[16]), "telp_p16_sellador_carroceria")

# Pág 17 (índice 16): Promotor de Adherencia (Próximamente)
imgs["promotor_adherencia"] = save(pages[17], "telp_p17_promotor_adherencia")

# Pág 19: 3 Masillas para placa — tercios
imgs["masilla_premium_yeso"]     = save(crop_third(pages[19], 0), "telp_p19_masilla_premium_yeso")
imgs["masilla_front_exterior"]   = save(crop_third(pages[19], 1), "telp_p19_masilla_front_exterior")
imgs["masilla_dry_antihumedad"]  = save(crop_third(pages[19], 2), "telp_p19_masilla_dry_antihumedad")

# Pág 20: Enduido (izquierda) + Fijador (derecha)
imgs["enduido_plastico"] = save(crop_left(pages[20]),  "telp_p20_enduido_plastico")
imgs["fijador_sellador"] = save(crop_right(pages[20]), "telp_p20_fijador_sellador")

print("Imagenes generadas:")
for k, v in imgs.items():
    print(f"  {k}: {v}")

# ── Generar entradas TypeScript ──────────────────────────────────────────────
products = [
    # Adhesivo Multiuso
    { "id": "TELP-ADHESIVO-MULTIUSO-60GR",   "name": "Adhesivo Multiuso WOW - 60 GR",   "cat": "Adhesivos", "desc": "Adhesivo multiuso familiar. Apto para zócalos, azulejos, cerámicos, alfombras, mampostería, telgopor, yeso, metal, plásticos, parquet, MDF, madera, acrílico, poliuretano expandido. Sin solventes. Presentación: 60 GR.", "img": imgs["adhesivo_multiuso"] },
    { "id": "TELP-ADHESIVO-MULTIUSO-150GR",  "name": "Adhesivo Multiuso WOW - 150 GR",  "cat": "Adhesivos", "desc": "Adhesivo multiuso familiar. Apto para zócalos, azulejos, cerámicos, alfombras, mampostería, telgopor, yeso, metal, plásticos, parquet, MDF, madera, acrílico, poliuretano expandido. Sin solventes. Presentación: 150 GR.", "img": imgs["adhesivo_multiuso"] },
    { "id": "TELP-ADHESIVO-MULTIUSO-400GR",  "name": "Adhesivo Multiuso WOW - 400 GR",  "cat": "Adhesivos", "desc": "Adhesivo multiuso profesional. Apto para zócalos, azulejos, cerámicos, alfombras, mampostería, telgopor, yeso, metal, plásticos, parquet, MDF, madera, acrílico, poliuretano expandido. Sin solventes. Presentación: 400 GR.", "img": imgs["adhesivo_multiuso"] },
    { "id": "TELP-ADHESIVO-MULTIUSO-5KG",    "name": "Adhesivo Multiuso WOW - 5 KG",    "cat": "Adhesivos", "desc": "Adhesivo multiuso profesional. Apto para zócalos, azulejos, cerámicos, alfombras, mampostería, telgopor, yeso, metal, plásticos, parquet, MDF, madera, acrílico, poliuretano expandido. Sin solventes. Presentación: 5 KG.", "img": imgs["adhesivo_multiuso"] },
    # Adhesivo PU Híbrido
    { "id": "TELP-ADHESIVO-PU-HIBRIDO-BLANCO", "name": "Adhesivo PU Híbrido WOW - Blanco 476 GR", "cat": "Adhesivos", "desc": "Adhesivo PU Híbrido monocomponente. Gran adhesión y elasticidad. Excelente resistencia a la intemperie y versatilidad a todo tipo de superficies. Curado con humedad ambiental. Ideal para azulejos piscina, madera, tubos PVC, espejos, bachas, azulejos y zócalos. Color: Blanco. Presentación: 380 ML / 476 GR.", "img": imgs["adhesivo_pu_hibrido"] },
    # Sellador Multiuso
    { "id": "TELP-SELLADOR-MULTIUSO-300GR",  "name": "Sellador Multiuso Acrílico WOW - 300 GR", "cat": "Selladores", "desc": "Sellador multiuso acrílico familiar. Ideal para juntas de madera, chapas, cerámicos, hormigón y mampostería. Interior y exterior. Elástico. Colores: Negro y Blanco. Presentación: 300 GR.", "img": imgs["sellador_multiuso"] },
    { "id": "TELP-SELLADOR-MULTIUSO-400GR",  "name": "Sellador Multiuso Acrílico WOW - 400 GR", "cat": "Selladores", "desc": "Sellador multiuso acrílico profesional. Ideal para juntas de madera, chapas, cerámicos, hormigón y mampostería. Interior y exterior. Elástico. Colores: Negro y Blanco. Presentación: 400 GR.", "img": imgs["sellador_multiuso"] },
    # Sellador PU 40
    { "id": "TELP-SELLADOR-PU40-NEGRO",      "name": "Sellador Poliuretánico PU 40 WOW - Negro", "cat": "Selladores", "desc": "Sellador poliuretánico PU 40. Uso profesional. Ideal para premoldeado, metal, juntas de dilatación, fibra de vidrio y cerámica. Interior y exterior. Elástico. Color: Negro. Presentación: 380 ML / 465 GR.", "img": imgs["sellador_pu40_negro"] },
    { "id": "TELP-SELLADOR-PU40-GRIS",       "name": "Sellador Poliuretánico PU 40 WOW - Gris",  "cat": "Selladores", "desc": "Sellador poliuretánico PU 40. Uso profesional. Ideal para premoldeado, metal, juntas de dilatación, fibra de vidrio y cerámica. Interior y exterior. Elástico. Color: Gris. Presentación: 380 ML / 465 GR.", "img": imgs["sellador_pu40_gris"] },
    # Siliconas
    { "id": "TELP-SILICONA-ACETICA-BLANCO",      "name": "Silicona Acética WOW - Blanco",       "cat": "Siliconas", "desc": "Silicona acética multiuso. Excelente adherencia. Elástica. Interior y exterior. Color: Blanco.", "img": imgs["siliconas"] },
    { "id": "TELP-SILICONA-ACETICA-NEGRO",       "name": "Silicona Acética WOW - Negro",        "cat": "Siliconas", "desc": "Silicona acética multiuso. Excelente adherencia. Elástica. Interior y exterior. Color: Negro.", "img": imgs["siliconas"] },
    { "id": "TELP-SILICONA-ACETICA-TRANSPARENTE","name": "Silicona Acética WOW - Transparente", "cat": "Siliconas", "desc": "Silicona acética multiuso. Excelente adherencia. Elástica. Interior y exterior. Color: Transparente.", "img": imgs["siliconas"] },
    { "id": "TELP-SILICONA-NEUTRA-TRANSPARENTE", "name": "Silicona Neutra WOW - Transparente",  "cat": "Siliconas", "desc": "Silicona neutra multiuso. Excelente adherencia. Elástica. Interior y exterior. Color: Transparente.", "img": imgs["siliconas"] },
    # Reparador Grietas Piscinas
    { "id": "TELP-REPARADOR-PISCINAS-300GR", "name": "Reparador Grietas Piscinas WOW - 300 GR", "cat": "Reparadores", "desc": "Sellador ideal para reparación de grietas en piscinas. Excelente adherencia, tack inicial, elástico y pintable. Familiar. Presentación: 300 GR.", "img": imgs["reparador_piscinas"] },
    { "id": "TELP-REPARADOR-PISCINAS-400GR", "name": "Reparador Grietas Piscinas WOW - 400 GR", "cat": "Reparadores", "desc": "Sellador ideal para reparación de grietas en piscinas. Excelente adherencia, tack inicial, elástico y pintable. Profesional. Presentación: 400 GR.", "img": imgs["reparador_piscinas"] },
    # Sellador Zinguería
    { "id": "TELP-SELLADOR-ZINGUERIA-400GR", "name": "Sellador Zinguería WOW - 400 GR", "cat": "Selladores", "desc": "Sellador profesional para zinguería. Interior y exterior. Elástico. Listo para usar. Color: Gris aluminio. Presentación: 400 GR.", "img": imgs["sellador_zingueria"] },
    # Sellador de Grietas
    { "id": "TELP-SELLADOR-GRIETAS-400GR",   "name": "Sellador de Grietas WOW - 400 GR",  "cat": "Selladores", "desc": "Sellador de grietas acrílico. Interior y exterior. Elástico. Pintable. Listo para usar. Presentación: 400 GR.", "img": imgs["sellador_grietas"] },
    { "id": "TELP-SELLADOR-GRIETAS-1-5KG",   "name": "Sellador de Grietas WOW - 1.5 KG",  "cat": "Selladores", "desc": "Sellador de grietas acrílico. Interior y exterior. Elástico. Pintable. Listo para usar. Presentación: 1.5 KG.", "img": imgs["sellador_grietas"] },
    { "id": "TELP-SELLADOR-GRIETAS-5KG",     "name": "Sellador de Grietas WOW - 5 KG",    "cat": "Selladores", "desc": "Sellador de grietas acrílico. Interior y exterior. Elástico. Pintable. Listo para usar. Presentación: 5 KG.", "img": imgs["sellador_grietas"] },
    # Masilla para Madera
    { "id": "TELP-MASILLA-MADERA-ALGARROBO", "name": "Masilla para Madera WOW - Algarrobo", "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Algarrobo. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-PINO",      "name": "Masilla para Madera WOW - Pino",      "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Pino. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-NATURAL",   "name": "Masilla para Madera WOW - Natural",   "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Natural. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-NOGAL",     "name": "Masilla para Madera WOW - Nogal",     "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Nogal. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-ROBLE",     "name": "Masilla para Madera WOW - Roble",     "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Roble. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-CEDRO",     "name": "Masilla para Madera WOW - Cedro",     "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Cedro. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    { "id": "TELP-MASILLA-MADERA-CAOBA",     "name": "Masilla para Madera WOW - Caoba",     "cat": "Masillas", "desc": "Masilla reparadora de madera. Corrige imperfecciones y rellena. Excelente adherencia. Flexible. Color: Caoba. Presentaciones: 200 GR, 500 GR, 1.7 KG, 5 KG, 25 KG.", "img": imgs["masilla_madera"] },
    # Reparador de Pared
    { "id": "TELP-REPARADOR-PARED-220GR",    "name": "Reparador de Pared WOW - 220 GR", "cat": "Reparadores", "desc": "Masilla reparadora de pared. Ideal para agujeros, dibujos y rajaduras. No se seca en el envase. Secado rápido: 6 hs. Interior y exterior. Blanco. Presentación: 220 GR.", "img": imgs["reparador_pared"] },
    # Cola Vinílica
    { "id": "TELP-COLA-VINILICA-50F",        "name": "Cola Vinílica Carpintera WOW 50F - Hogar", "cat": "Adhesivos", "desc": "Cola vinílica carpintera línea hogar. Excelente adherencia. Elástica. Lista para usar. Tipo 50F. Presentaciones: 125 GR, 250 GR, 500 GR, 1 KG.", "img": imgs["cola_vinilica"] },
    { "id": "TELP-COLA-VINILICA-90C",        "name": "Cola Vinílica Carpintera WOW 90C - Fuerte", "cat": "Adhesivos", "desc": "Cola vinílica carpintera de alta resistencia. Excelente adherencia. Elástica. Lista para usar. Tipo 90C Fuerte. Presentaciones: 125 GR, 250 GR, 500 GR, 1 KG.", "img": imgs["cola_vinilica"] },
    { "id": "TELP-COLA-VINILICA-95AT",       "name": "Cola Vinílica Carpintera WOW 95AT - Alto Tack", "cat": "Adhesivos", "desc": "Cola vinílica carpintera de alto tack. Excelente adherencia. Elástica. Lista para usar. Tipo 95AT Alto Tack. Presentaciones: 125 GR, 250 GR, 500 GR, 1 KG.", "img": imgs["cola_vinilica"] },
    # Cemento de Contacto
    { "id": "TELP-CEMENTO-CONTACTO-250CM3",  "name": "Cemento de Contacto WOW - 250 CM3", "cat": "Adhesivos", "desc": "Cemento de contacto sin tolueno. Excelente adherencia. Tack inicial. Elástico. Para rígidos: placas decorativas, telgopor, maderas, poliuretano, fibra de vidrio, laminado plástico, chapa. Para flexibles: alfombras, pisos vinílicos, corcho, cartón, revestimientos acústicos. Presentación: 250 CM3 / 195 GR.", "img": imgs["cemento_contacto"] },
    { "id": "TELP-CEMENTO-CONTACTO-500CM3",  "name": "Cemento de Contacto WOW - 500 CM3", "cat": "Adhesivos", "desc": "Cemento de contacto sin tolueno. Excelente adherencia. Tack inicial. Elástico. Para rígidos y flexibles. Presentación: 500 CM3 / 390 GR.", "img": imgs["cemento_contacto"] },
    { "id": "TELP-CEMENTO-CONTACTO-4LT",     "name": "Cemento de Contacto WOW - 4 LT",   "cat": "Adhesivos", "desc": "Cemento de contacto sin tolueno. Excelente adherencia. Tack inicial. Elástico. Para rígidos y flexibles. Presentación: 4 LT / 3120 GR.", "img": imgs["cemento_contacto"] },
    { "id": "TELP-CEMENTO-CONTACTO-18LT",    "name": "Cemento de Contacto WOW - 18 LT",  "cat": "Adhesivos", "desc": "Cemento de contacto sin tolueno. Excelente adherencia. Tack inicial. Elástico. Para rígidos y flexibles. Presentación: 18 LT.", "img": imgs["cemento_contacto"] },
    # Automotriz
    { "id": "TELP-PROTECTOR-SUBCARROCERIA",  "name": "Protector Subcarrocería WOW - 1 LT", "cat": "Automotriz", "desc": "Protector subcarrocería texturado acrílico. Color negro. La fórmula que usan las automotrices. Presentación: 1 LT.", "img": imgs["protector_subcarroceria"] },
    { "id": "TELP-SELLADOR-CARROCERIA-400GR","name": "Sellador Carrocería WOW - 400 GR",   "cat": "Automotriz", "desc": "Sellador carrocería de secado rápido. Colores: Blanco, Negro, Gris. Presentación: 400 GR.", "img": imgs["sellador_carroceria"] },
    # Promotor de Adherencia
    { "id": "TELP-PROMOTOR-ADHERENCIA-1LT",  "name": "Promotor de Adherencia WOW - 1 LT", "cat": "Adhesivos", "desc": "Aditivo promotor de adherencia para revoques. Aumenta plasticidad y elasticidad. Ideal puentes de adherencia y reparaciones. Dale elasticidad a tus mezclas. Próximamente. Presentación: 1 LT.", "img": imgs["promotor_adherencia"] },
    { "id": "TELP-PROMOTOR-ADHERENCIA-4LT",  "name": "Promotor de Adherencia WOW - 4 LT", "cat": "Adhesivos", "desc": "Aditivo promotor de adherencia para revoques. Aumenta plasticidad y elasticidad. Ideal puentes de adherencia y reparaciones. Dale elasticidad a tus mezclas. Próximamente. Presentación: 4 LT.", "img": imgs["promotor_adherencia"] },
    # Masillas para placas
    { "id": "TELP-MASILLA-PREMIUM-YESO",     "name": "Masilla Premium Placa Yeso WOW",     "cat": "Masillas", "desc": "Masilla para placa de yeso. Interior. Excelente adherencia. Corrige imperfecciones y rellena. Lista para usar. Presentaciones: 1.7 KG, 7 KG, 15 KG, 32 KG.", "img": imgs["masilla_premium_yeso"] },
    { "id": "TELP-MASILLA-FRONT-EXTERIOR",   "name": "Masilla Front Placa Exterior WOW",   "cat": "Masillas", "desc": "Masilla para placa exterior. Excelente adherencia. Corrige imperfecciones y rellena. Lista para usar. Presentaciones: 1.5 KG, 5 KG, 15 KG, 30 KG.", "img": imgs["masilla_front_exterior"] },
    { "id": "TELP-MASILLA-DRY-ANTIHUMEDAD",  "name": "Masilla Dry Antihumedad WOW",        "cat": "Masillas", "desc": "Masilla antihumedad para todo tipo de placas. Ideal para placas verdes. Excelente adherencia. Lista para usar. Presentación: 15 KG.", "img": imgs["masilla_dry_antihumedad"] },
    # Enduidos
    { "id": "TELP-ENDUIDO-PLASTICO",         "name": "Enduido Plástico Interior/Exterior WOW", "cat": "Enduidos", "desc": "Enduido plástico para interior y exterior. Corrige imperfecciones y rellena. Excelente adherencia. Lista para usar. Presentaciones: 600 GR, 1 LT, 4 LT, 10 LT, 20 LT, 200 LT.", "img": imgs["enduido_plastico"] },
    { "id": "TELP-FIJADOR-SELLADOR",         "name": "Fijador Sellador WOW",               "cat": "Enduidos", "desc": "Fijador sellador. Interior y exterior. Presentaciones: 1 LT, 4 LT, 10 LT, 20 LT.", "img": imgs["fijador_sellador"] },
]

# Generar TypeScript
lines = []
for p in products:
    line = (
        f'  {{ id: "{p["id"]}", name: "{p["name"]}", brand: "TELPLAST", '
        f'category: "{p["cat"]}", sku: "", '
        f'description: "{p["desc"]}", '
        f'image: "{p["img"]}", imageColor: "#e85d04", imageIcon: "🔧", '
        f'price: 0, minQty: 1, stock: 100 }},'
    )
    lines.append(line)

ts_block = "\n".join(lines)

# Append to catalog-data.ts before the closing ];
catalog_file = PROJECT_DIR / "app" / "catalog-data.ts"
catalog_text = catalog_file.read_text(encoding='utf-8')

# Find the closing ]; of DEFAULT_PRODUCTS
insert_pos = catalog_text.rfind('];')
if insert_pos == -1:
    print("ERROR: no encontré ];" )
else:
    new_text = catalog_text[:insert_pos] + ts_block + "\n" + catalog_text[insert_pos:]
    catalog_file.write_text(new_text, encoding='utf-8')
    print(f"\nAgregados {len(products)} productos TELPLAST a catalog-data.ts")

print("\nListo!")
