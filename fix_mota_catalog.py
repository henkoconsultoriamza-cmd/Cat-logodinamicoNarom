"""
fix_mota_catalog.py
Corrección exhaustiva del catálogo MOTA:
1. Elimina los 17 phantom SKUs (SKUs sin dígitos / nombres incorrectos)
2. Los reemplaza con los SKUs correctos con dígitos
3. Agrega los 548 productos faltantes del PDF
"""
import json, re, uuid, sys
from pathlib import Path
import pymupdf

PROJ = Path(__file__).parent
CATALOG   = PROJ / "app" / "catalog-data.ts"
MAP_FILE  = PROJ / "public" / "products" / "mota_sections" / "mota_sections_map.json"
AUDIT_JSON = Path(sys.argv[1]) if len(sys.argv) > 1 else (
    Path(r"C:\Users\usuario\AppData\Local\Temp\claude\c--Users-usuario-Documents-Claude-Projects-Henko-Consultor-a-Proyectos-CRM-Henko\95f939b1-e599-4b9c-a115-bbfd4fd62ff3\scratchpad\mota_audit.json")
)
PDF_PATH  = PROJ / "CATALOGO_MOTA_HERRAMIENTAS.pdf"

art_to_image = json.loads(MAP_FILE.read_text(encoding="utf-8"))["art_to_image"]
audit        = json.loads(AUDIT_JSON.read_text(encoding="utf-8"))

# ── CATEGORY + BRAND mapping by SKU prefix ───────────────────────────────────
def classify(sku: str) -> tuple[str, str]:
    """Returns (category, brand)"""
    s = sku.upper()
    # ArtMota aerosols
    if s.startswith(('LAG', 'LA0', 'LA1', 'LA2', 'LA3', 'LA4', 'LA5', 'LA6', 'LA7', 'LA8', 'LA9')):
        return "Aerosoles", "ArtMota"
    if s.startswith('LM'):
        return "Aerosoles", "ArtMota"
    # LubriMota
    if s.startswith('LB'):
        return "Lubricantes", "LubriMota"
    # GasMota
    if s.startswith('GS'):
        return "Cocinas y Sopletes de Gas", "GasMota"
    # MembraMota
    if s.startswith(('MEM', 'MB1', 'MB2', 'MB3')):
        return "Membranas", "MembraMota"
    # Lijas y abrasivos (AX family)
    if re.match(r'^AX[0-9]', s) or re.match(r'^AX1[0-9]', s):
        return "Lijas y Abrasivos", "MOTA"
    # Discos flap
    if s.startswith(('DF', 'AY', 'AV', 'AXE', 'AZ')):
        return "Discos Abrasivos", "MOTA"
    # Discos de diamante
    if s.startswith(('ST1', 'SW1', 'SL1', 'SM1', 'SV1')):
        return "Discos Abrasivos", "MOTA"
    # Llaves sockets E-series
    if re.match(r'^E[0-9]', s) or s.startswith(('EK', 'EW', 'EF', 'EP', 'EX', 'EZ')):
        return "Llaves", "MOTA"
    # Llaves allen T-handle
    if s.startswith(('LW', 'LX', 'LY', 'LZ', 'LU')):
        return "Llaves", "MOTA"
    # Brocas M-series (drills)
    if re.match(r'^M[0-9]', s):
        return "Brocas", "MOTA"
    # Bits y puntas
    if s.startswith(('BPH', 'BPZ', 'BT0', 'BT1', 'BT2', 'BVH', 'BTH', 'BP0',
                     'PH', 'PZ', 'T06', 'T07', 'T08', 'T09', 'T10', 'T15', 'T20',
                     'T25', 'T27', 'T30', 'T40', 'T45', 'T50', 'T55', 'T60')):
        return "Destornilladores", "MOTA"
    if re.match(r'^B[0-9]', s) or s.startswith(('BPJ', 'BLJ', 'BTJ', 'BPHT')):
        return "Destornilladores", "MOTA"
    # Bolsos
    if s.startswith('BZ'):
        return "Bolsos y Organizadores", "MOTA"
    # Alicates Q / TA / TC / BAB / QA
    if s.startswith(('Q', 'QA', 'TA1', 'TA2', 'TC', 'BAB', 'BAM')):
        return "Alicates", "MOTA"
    # Niveles HLD
    if s.startswith('HLD'):
        return "Medición", "MOTA"
    # Martillos MB/MC/MG
    if s.startswith(('MB0', 'MB1', 'MC1', 'MC2', 'MG0', 'MG2', 'MS')):
        return "Martillos", "MOTA"
    # Hachas MH
    if s.startswith('MH'):
        return "Martillos", "MOTA"
    # Limas F
    if re.match(r'^F[A-Z0-9]', s) and s.startswith(('FH', 'FHR', 'FAB', 'FAC', 'FT')):
        return "Sierras y Accesorios", "MOTA"
    if re.match(r'^F[0-9]', s):
        return "Sierras y Accesorios", "MOTA"
    # Spare parts pistolas de pintar P-series
    if re.match(r'^P[0-9]', s) or re.match(r'^P[0-9A-Z]+/', s):
        return "Pistolas de Pintar", "MOTA"
    # Cintas CB
    if s.startswith('CB'):
        return "Cintas Adhesivas", "MOTA"
    # Sierras SYCJ
    if s.startswith('SYCJ'):
        return "Sierras y Accesorios", "MOTA"
    # Pistola PHIN
    if s.startswith('PHIN'):
        return "Herramientas Neumáticas", "MOTA"
    # RM = remachadoras
    if s.startswith('RM'):
        return "Remachadoras y Accesorios", "MOTA"
    # TP repuestos pistola
    if s.startswith('TP'):
        return "Pistolas de Pintar", "MOTA"
    # HZ grapas
    if s.startswith('HZ'):
        return "Grapadoras y Pistolas", "MOTA"
    # Default
    return "Herramientas de Construcción", "MOTA"


# ── Name generation from PDF heading ─────────────────────────────────────────
HEADING_TRANSLATIONS = {
    # Lijas
    "230 X 280 MM - SANDPAPER - ALUMINIUM OXIDE": "Lija papel óxido aluminio",
    "230 X 280 MM - CLOGGING SANDPAPER - ALUMINIUM": "Lija papel anti-colmatante",
    "230 X 280 MM - EMERY CLOTH - ALUMINIUM OXIDE": "Lija tela óxido aluminio",
    "230 X 280 MM - WATERPROOF SANDPAPER - SILICON CARBIDE": "Lija al agua carburo silicio",
    # Discos
    "CUT FOR IRON AND STAINLESS STEEL": "Disco de corte hierro e inox",
    "CUT FOR IRON": "Disco de corte hierro",
    "GRINDING FOR IRON": "Disco de desbaste hierro",
    "60 SHEET - ALUMINIUM OXIDE": "Disco multilámina óxido aluminio",
    "60 SHEET - SILICON CARBIDE": "Disco multilámina carburo silicio",
    "60 SHEET - ZIRCONIUM": "Disco multilámina circonio",
    "TURBO - DRY CUT": "Disco diamantado turbo seco",
    "PRO-TURBO SEGMENT - DRY CUT": "Disco diamantado pro-turbo seco",
    "CONTINUOS (SMOOTH-WET) - WET CUT": "Disco diamantado continuo húmedo",
    # Bits
    "PHILLIPS - DRIVE 1/4\"": "Punta atornilladora Phillips",
    "POZIDRIV - DRIVE 1/4\"": "Punta atornilladora Pozidriv",
    "TORX® TIP - DRIVE 1/4\" HEX": "Punta Torx Drive 1/4\"",
    "TORX® TIP - DRIVE 1/4\" HOLLOW HEX": "Punta Torx hueca Drive 1/4\"",
    "FLAT TIP - DRIVE 1/4\" HEX": "Punta plana Drive 1/4\"",
    "MAGNETICS CUPS - METRICS": "Copa magnética métrica",
    "IMPACT BITS PHILLIPS - DRIVE 1/4\"": "Punta impacto Phillips 1/4\"",
    # Llaves
    "COMBINATION WRENCHES - METRIC": "Llave combinada métrica",
    "COMBINATION WRENCHES - INCH - BLACK PHOSPHATED": "Llave combinada pulgada fosfatada",
    "COMBINATION RATCHET WRENCH - ARTICULATED HEAD - INCH": "Llave combinada trinquete articulada pulgada",
    "HEXAGONAL SOCKETS SHORT INCH SERIES - DRIVE 1/2\"": "Bocallave hexagonal corto pulgada 1/2\"",
    "HEX SOCKET SET + ACCESORIES": "Juego bocallaves hex + accesorios",
    "HEX SOCKET METRIC - BI INJECTED HANDLE": "Llave hex T mango biinyectado",
    "HEX SOCKET - T WRENCH - INCH - CR.V.": "Llave hex T pulgada Cr.V.",
    "LLAVES T CON MANGO /": "Llave T con mango",
    # Aerosoles
    "BOX OF 6 UNITS": "Aerosol",
    "BOX OF 12 UNITS": "Aerosol",
    # Brocas
    "HIGH SPEED STEEL TWIST DRILLS (METRIC)": "Broca acero rápido HSS métrica",
    # Alicates Q
    "COMBINATION PLIER": "Alicate combinado",
    "CABLE CUTTING PLIERS": "Alicate corte de cable",
    "CIRCLIP PLIER": "Alicate para arandelas de seguridad",
    "GRIP PLIERS - CURVED JAW": "Alicate de agarre quijada curva",
    "WATER PUMP PLIERS - BOX JOIN": "Alicate bomba de agua",
    "FORGED PLIERS": "Alicates forjados",
    # Pinzas
    "TOWER PINCER - HALF CUT": "Pinza torre medio corte",
    "TOWER PINCER - FULL CUT": "Pinza torre corte entero",
    # Hachas
    "SPLITTING AXE - FIBERGLASS HANDLE": "Hacha de partir cabo de fibra",
    # Pistola pintar spare
    "SPARE PARTS FOR P300": "Repuesto para pistola P300",
    # Sockets
    "380 MM": "Llave",
    "PROLONGATION": "Prolongación bocallave",
}

# Grano para lijas: extraer de SKU
def lija_name(sku: str) -> str:
    # AX01=G40, AX02=G50 etc
    GRAIN_MAP = {
        'AX01': 'Lija papel Gr.40', 'AX02': 'Gr.50', 'AX025': 'Gr.60', 'AX03': 'Gr.80',
        'AX031': 'Gr.100', 'AX04': 'Gr.120', 'AX046': 'Gr.150', 'AX05': 'Gr.180', 'AX06': 'Gr.220',
    }
    if sku in GRAIN_MAP:
        return f"{GRAIN_MAP[sku]} {sku}"
    # AX1080=anti-colmatante G80; try to extract grain from last digits
    m = re.search(r'(\d+)$', sku)
    if m:
        grain = m.group(1)
        if sku.startswith('AX1'):
            return f"Lija papel anti-colm. Gr.{grain} {sku}"
        elif sku.startswith('AX2'):
            return f"Lija tela Gr.{grain} {sku}"
        elif sku.startswith('AX3'):
            return f"Lija al agua Gr.{grain} {sku}"
        elif sku.startswith('AX4') or sku.startswith('AX5'):
            g = int(grain) * 4 if int(grain) < 100 else grain
            return f"Lija al agua Gr.{g} {sku}"
    return f"Lija {sku}"


def make_name(sku: str, heading: str) -> str:
    """Generate a clean Spanish product name."""
    s = sku.upper()
    h = (heading or "").upper().strip()

    # Aerosoles LAG/LA
    if s.startswith('LAG'):
        col = s[3:]
        return f"Aerosol LAG colores RAL {col} x6 unid. {sku}"
    if re.match(r'^LA\d', s):
        col = s[2:]
        return f"Aerosol LA colores RAL {col} x12 unid. {sku}"
    if s.startswith('LM'):
        return f"Aerosol LubriMota {sku}"

    # Lijas AX
    if re.match(r'^AX[0-9]', s):
        return lija_name(sku)

    # Discos flap
    if s.startswith('DF'):
        grit = re.search(r'(\d{2,4})$', sku)
        size = '4"' if '10' in sku else '7"' if '18' in sku else ''
        g = grit.group(1) if grit else ''
        if s.startswith('DFC'):
            return f"Disco multilámina carburo silicio {size} Gr.{g} {sku}"
        if s.startswith('DFZ'):
            return f"Disco multilámina circonio {size} Gr.{g} {sku}"
        return f"Disco multilámina {size} Gr.{g} {sku}"

    # Discos abrasivos AY/AV
    if s.startswith('AY'):
        grit = re.search(r'(\d{2,4})$', sku)
        g = grit.group(1) if grit else ''
        return f"Disco fibra 180mm Gr.{g} {sku}"
    if s.startswith('AV'):
        grit = re.search(r'(\d{2,4})$', sku)
        g = grit.group(1) if grit else ''
        diam = '125mm' if '12' in sku else '180mm' if '18' in sku else ''
        return f"Disco velcro {diam} Gr.{g} {sku}"
    if s.startswith('AXE'):
        grit = re.search(r'(\d{2,4})$', sku)
        g = grit.group(1) if grit else ''
        return f"Esponja lijadora multiuso Gr.{g} {sku}"
    if s.startswith('AZ') and not s.startswith('AZJ'):
        # Flap wheel with shank
        m = re.match(r'AZ(\d)(\d+)(\d{2,3})', s)
        if m:
            series, diam, grit = m.groups()
            return f"Lija montada espiga 6mm Ø{diam}mm Gr.{grit} {sku}"
        return f"Lija montada espiga {sku}"
    if s.startswith('AZJ'):
        grit = re.search(r'(\d{2,3})$', sku)
        g = grit.group(1) if grit else ''
        return f"Juego 3 lijas montadas espiga 6mm Gr.{g} {sku}"

    # Discos diamantados
    if s.startswith('ST'):
        size = re.search(r'(\d{3})', sku)
        sz = size.group(1) if size else ''
        return f"Disco diamantado turbo Ø{sz}mm {sku}"
    if s.startswith('SW'):
        size = re.search(r'(\d{3})', sku)
        sz = size.group(1) if size else ''
        return f"Disco diamantado continuo húmedo Ø{sz}mm {sku}"
    if s.startswith('SL'):
        size = re.search(r'(\d{3})', sku)
        sz = size.group(1) if size else ''
        return f"Disco diamantado pro-turbo Ø{sz}mm {sku}"

    # Llaves E-series (sockets)
    if re.match(r'^E\d', s):
        m = re.match(r'^E(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Bocallave hexagonal {sz}mm {sku}"
    if s.startswith('EK'):
        return f"Juego bocallaves hexagonales {sku}"
    if s.startswith('EW'):
        m = re.match(r'^EW(\d)(\d{2,3})', s)
        if m:
            return f"Llave combinada trinquete articulada {m.group(2)}/'{sku}"
        return f"Llave combinada trinquete articulada {sku}"
    if s.startswith('EF'):
        return f"Llave tubular {sku}"
    if s.startswith('EP'):
        return f"Prolongación bocallave {sku}"
    if s.startswith('EZ'):
        m = re.match(r'^EZ\d(\d{2,3})', s)
        sz = m.group(1) if m else ''
        return f"Llave combinada pulgada fosfatada {sz}/\" {sku}"
    if s.startswith('EX'):
        return f"Expositor lijas {sku}"

    # Llaves Allen/hex T
    if s.startswith('LW'):
        m = re.match(r'^LW(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Llave Allen T Ø{sz}mm {sku}"
    if s.startswith('LX'):
        m = re.match(r'^LX(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Llave Allen T pulgada {sz}\" {sku}"
    if s.startswith('LY'):
        m = re.match(r'^LY(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Llave hex T mango biinyectado {sz}mm {sku}"
    if s.startswith('LZ'):
        m = re.match(r'^LZ(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Llave Allen T {sz}mm {sku}"
    if s.startswith('LU'):
        m = re.match(r'^LU(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Llave hex T pulgada {sz}\" {sku}"

    # Brocas M
    if re.match(r'^M\d', s):
        m = re.match(r'^M(\d+)', s)
        sz = m.group(1) if m else ''
        mm = int(sz) / 10 if len(sz) == 3 else int(sz)
        return f"Broca HSS Ø{mm}mm {sku}"

    # Bits Phillips BPH
    if s.startswith('BPH') and re.match(r'BPH\d', s):
        m = re.match(r'BPH(\d+)', s)
        sz = int(m.group(1)) if m else 0
        tip = 'PH1' if sz < 140 else 'PH2' if sz < 200 else 'PH3'
        return f"Punta Phillips impacto {tip} {sz}mm {sku}"
    # Bits Pozidriv BPZ
    if s.startswith('BPZ') and re.match(r'BPZ\d', s):
        m = re.match(r'BPZ(\d+)', s)
        sz = int(m.group(1)) if m else 0
        tip = 'PZ1' if sz < 140 else 'PZ2' if sz < 200 else 'PZ3'
        return f"Punta Pozidriv impacto {tip} {sz}mm {sku}"
    # Bits Torx BT
    if s.startswith('BT') and re.match(r'BT\d', s):
        m = re.match(r'BT(\d{2})(\d{2,3})', s)
        if m:
            tx = int(m.group(1))
            sz = int(m.group(2))
            return f"Punta Torx T{tx} {sz}mm {sku}"
        return f"Punta Torx {sku}"
    # Bits Torx huecos BTH
    if s.startswith('BTH'):
        m = re.match(r'BTH(\d{2})(\d{2,3})', s)
        if m:
            tx = int(m.group(1))
            sz = int(m.group(2))
            return f"Punta Torx hueca T{tx} {sz}mm {sku}"
        return f"Punta Torx hueca {sku}"
    # Copas magnéticas BVH
    if s.startswith('BVH'):
        m = re.match(r'BVH(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Copa magnética {sz}mm {sku}"
    # Punta plana BP
    if s.startswith('BP') and re.match(r'BP\d', s):
        m = re.match(r'BP(\d{2})(\d{2})(\d{2})', s)
        if m:
            w, l, _ = m.groups()
            return f"Punta plana {w}x{l}mm {sku}"
        return f"Punta plana {sku}"
    # BPHT
    if s.startswith('BPHT'):
        sz = re.search(r'(\d+)', sku)
        return f"Punta impacto Phillips BPHT {sz.group(1)}mm" if sz else f"Punta impacto Phillips {sku}"
    # BPJ, BLJ, BTJ sets
    if s.startswith('BPJ'):
        n = re.search(r'(\d)', sku)
        sz = "25mm" if n and n.group(1) == "1" else "50mm"
        return f"Juego puntas Phillips+Pozidriv {sz} {sku}"
    if s.startswith('BLJ'):
        n = re.search(r'(\d)', sku)
        sz = "25mm" if n and n.group(1) == "1" else "50mm"
        return f"Juego puntas hexagonal {sz} {sku}"
    if s.startswith('BTJ'):
        n = re.search(r'(\d)', sku)
        sz = "25mm" if n and n.group(1) == "1" else "50mm"
        return f"Juego puntas Torx {sz} {sku}"
    # PH bits
    if re.match(r'^PH\d', s):
        n = re.search(r'(\d)', sku)
        return f"Punta Phillips PH{n.group(1)} {sku}" if n else f"Punta Phillips {sku}"
    # PZ bits
    if re.match(r'^PZ\d', s):
        n = re.search(r'(\d)', sku)
        return f"Punta Pozidriv PZ{n.group(1)} {sku}" if n else f"Punta Pozidriv {sku}"
    # T bits (Torx tips)
    if re.match(r'^T\d{2,3}$', s):
        return f"Punta Torx T{s[1:]} {sku}"
    # B bits sets
    if re.match(r'^B\d', s):
        return f"Juego puntas {sku}"
    # Bolsos BZ
    if s.startswith('BZ'):
        m = re.match(r'BZ(\d+)', s)
        n = m.group(1) if m else ''
        return f"Bolso herramientas BZ{n}" if n else f"Bolso herramientas {sku}"
    # Alicates Q
    if re.match(r'^Q\d', s):
        return f"Alicate {sku}"
    if s.startswith('QA'):
        return f"Alicate aislado 1000V {sku}"
    if s.startswith('QP'):
        return f"Pelacable automático {sku}"
    # BAB alicate puntas
    if s.startswith('BAB'):
        m = re.match(r'BAB(\d+)', s)
        size_code = m.group(1) if m else ''
        size = f"{int(size_code[:2])}\"" if len(size_code) >= 2 else ''
        return f"Alicate de puntas {size} {sku}"
    # BAM alicate
    if s.startswith('BAM'):
        return f"Alicate multipropósito {sku}"
    # TA Torre pincer
    if re.match(r'^TA\d', s):
        sizes = {'TA123': '7"', 'TA130': '8"', 'TA135': '9"', 'TA230': '12"', 'TA235': '14"'}
        sz = sizes.get(sku, '')
        return f"Pinza torre medio corte {sz} {sku}"
    # TC Torre pincer full cut
    if re.match(r'^TC\d', s):
        sizes = {'TC07': '7"', 'TC08': '8"'}
        sz = sizes.get(sku, '')
        return f"Pinza torre corte entero {sz} {sku}"
    # HLD niveles
    if s.startswith('HLD'):
        m = re.match(r'HLD(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Nivel de burbuja {sz}mm {sku}"
    # Martillos MB/MC/MG/MS
    if re.match(r'^MB\d', s):
        sizes = {'MB02': '200g', 'MB03': '335g', 'MB04': '450g', 'MB06': '600g', 'MB08': '800g'}
        w = sizes.get(sku, '')
        return f"Martillo bola cabo fibra {w} {sku}"
    if re.match(r'^MC\d', s):
        m = re.match(r'MC(\d+)', s)
        sz = m.group(1) if m else ''
        return f"Martillo carpintero cabo fibra {sz}mm {sku}"
    if re.match(r'^MG\d', s) or re.match(r'^MG[A-Z]', s):
        sizes_mg = {'MG05': '500g', 'MG07': '700g', 'MG21P': 'plástico 21mm', 'MG27F': 'fibra 27mm'}
        w = sizes_mg.get(sku, '')
        return f"Mazo de goma {w} {sku}"
    if re.match(r'^MS\d', s):
        return f"Maza de acero {sku}"
    # Hachas MH
    if s == 'MHP':
        return "Hacha de partir cabo de fibra MHP"
    if s == 'MHT':
        return "Hacha tumba cabo de fibra MHT"
    if s == 'MHF':
        return "Hacha MHF"
    if s.startswith('MH'):
        return f"Hacha {sku}"
    # Pistola inflar PHIN
    if s == 'PHIN':
        return "Pistola de inflar y medir PHIN"
    # GasMota GS
    if s.startswith('GS'):
        names_gs = {
            'GS01': 'Cartucho butano 130g GS01',
            'GS20': 'Soplete a gas para GS01 cartucho GS20',
            'GS21': 'Cocina portátil norma europea GS21',
            'GS30': 'Soplete a gas piezoeléctrico GS30',
            'GS30A': 'Soplete a gas GS30A',
        }
        return names_gs.get(sku, f"GasMota {sku}")
    # LubriMota LB
    if s.startswith('LB'):
        sizes = {'LB125': '125ml', 'LB216': '216ml', 'LB450': '450ml'}
        sz = sizes.get(sku, '')
        return f"Lubricante multiuso antioxidante LubriMota {sz} {sku}"
    # Sierras F/FH/FAB/FAC
    if s.startswith('FAB'):
        sz = re.search(r'(\d+)', sku)
        return f"Cepillo circular con espiga Ø{sz.group(1)}mm {sku}" if sz else f"Cepillo circular {sku}"
    if s.startswith('FAC'):
        sz = re.search(r'(\d+)', sku)
        return f"Cepillo circular espiga 6mm Ø{sz.group(1)}mm {sku}" if sz else f"Cepillo circular {sku}"
    if s.startswith('FHR'):
        sz = re.search(r'(\d+)', sku)
        diam = sz.group(1) if sz else ''
        return f"Llave de sierra con rosca M14 Ø{diam}mm {sku}"
    if s.startswith('FH'):
        sizes_fh = {'FH0100': 'Ø100mm', 'FH0115': 'Ø115mm', 'FH060': 'Ø60mm', 'FH075': 'Ø75mm'}
        sz = sizes_fh.get(sku, '')
        return f"Llave de sierra {sz} {sku}"
    if re.match(r'^F[0-9]', s):
        return f"Lima {sku}"
    # CB cintas
    if s.startswith('CB'):
        m = re.match(r'CB(\d{2})(\d{2})(\d{2})', s)
        if m:
            w, l, _ = m.groups()
            return f"Cinta métrica {l}m x {w}mm {sku}"
        return f"Cinta métrica {sku}"
    # Spare parts pistola P
    if re.match(r'^P\d', s) or '/' in sku:
        parent = sku.split('/')[0]
        part = sku.split('/')[1] if '/' in sku else ''
        if part:
            return f"Repuesto {part} para pistola {parent}"
        return f"Pistola de pintar {sku}"
    # TP repuestos
    if s.startswith('TP'):
        return f"Repuesto pistola {sku}"
    # SYCJ sierras corona
    if s.startswith('SYCJ'):
        nums = re.search(r'(\d+)', sku)
        n = nums.group(1) if nums else ''
        return f"Juego {n} sierras corona carburo {sku}"
    # HZ grapas
    if s.startswith('HZ'):
        return f"Grapas {sku}"
    # Remachadoras RM
    if s.startswith('RM'):
        rm_names = {
            'RM1P': 'Remachadora manual 10" cuerpo aluminio RM1P',
            'RM1C': 'Remachadora manual 10" cuerpo chapa RM1C',
            'RM1R': 'Remachadora manual con resorte RM1R',
            'RM2R': 'Remachadora manual 21" dos manos RM2R',
            'RM2C': 'Remachadora manual 21" dos manos RM2C',
        }
        return rm_names.get(sku, f"Remachadora {sku}")
    # Fallback: use heading if useful
    for k, v in HEADING_TRANSLATIONS.items():
        if k in h:
            return f"{v} {sku}"
    # Last resort
    return f"MOTA {sku}"


# ── Build replacement product entries ─────────────────────────────────────────

def make_entry(sku: str, heading: str = "") -> str:
    cat, brand = classify(sku)
    name  = safe_name(make_name(sku, heading))
    img   = art_to_image.get(sku, "")
    uid   = str(uuid.uuid4())
    img_str = f'"{img}"' if img else '""'
    return f'''  {{
    id: "{uid}",
    sku: "{sku}",
    name: "{name}",
    brand: "{brand}",
    category: "{cat}",
    price: 0,
    description: "",
    image: {img_str},
    specs: {{}},
  }},'''


# ── Read current catalog ──────────────────────────────────────────────────────
catalog = CATALOG.read_text(encoding="utf-8")

# ── Step 1: Remove phantom entries and build fix replacements ─────────────────

PHANTOM_SKUS = {
    'PHIN', 'BPJ', 'BLJ', 'BTJ', 'BPHT', 'BAB', 'BPZ', 'BPH',
    'HLD', 'TA', 'TC', 'MHP', 'MHT', 'MHF', 'MB', 'MC', 'MG'
}

# Replacement mapping: phantom SKU → list of correct SKUs with names
REPLACEMENTS = {
    'PHIN':  [('PHIN', 'Pistola de inflar y medir PHIN')],
    'BPHT':  [('BPHT225', 'Punta impacto Phillips 25mm BPHT225'),
              ('BPHT250', 'Punta impacto Phillips 50mm BPHT250')],
    'BAB':   [('BAB061', 'Alicate de puntas 6" BAB061'),
              ('BAB062', 'Alicate de puntas 6" curvo BAB062')],
    'BPJ':   [('BPJ1', 'Juego puntas Phillips+Pozidriv 25mm BPJ1'),
              ('BPJ2', 'Juego puntas Phillips+Pozidriv 50mm BPJ2')],
    'BLJ':   [('BLJ1', 'Juego puntas hexagonal 25mm BLJ1'),
              ('BLJ2', 'Juego puntas hexagonal 50mm BLJ2')],
    'BTJ':   [('BTJ1', 'Juego puntas Torx 25mm BTJ1'),
              ('BTJ2', 'Juego puntas Torx 50mm BTJ2')],
    'BPZ':   [('BPZ', None)],  # keep sku, fix name via name override
    'BPH':   [('BPH', None)],
    'HLD':   [('HLD06', 'Nivel de burbuja 6mm HLD06'),
              ('HLD08', 'Nivel de burbuja 8mm HLD08'),
              ('HLD10', 'Nivel de burbuja 10mm HLD10'),
              ('HLD12', 'Nivel de burbuja 12mm HLD12')],
    'TA':    [('TA123', 'Pinza torre medio corte 7" TA123'),
              ('TA130', 'Pinza torre medio corte 8" TA130'),
              ('TA135', 'Pinza torre medio corte 9" TA135'),
              ('TA230', 'Pinza torre corte entero 12" TA230'),
              ('TA235', 'Pinza torre corte entero 14" TA235')],
    'TC':    [('TC07', 'Pinza torre corte entero 7" TC07'),
              ('TC08', 'Pinza torre corte entero 8" TC08')],
    'MHP':   [('MHP', 'Hacha de partir cabo de fibra MHP')],
    'MHT':   [('MHT', 'Hacha tumba cabo de fibra MHT')],
    'MHF':   [('MHF', 'Hacha MHF')],
    'MB':    [('MB02', 'Martillo bola cabo fibra 200g MB02'),
              ('MB03', 'Martillo bola cabo fibra 335g MB03'),
              ('MB04', 'Martillo bola cabo fibra 450g MB04'),
              ('MB06', 'Martillo bola cabo fibra 600g MB06'),
              ('MB08', 'Martillo bola cabo fibra 800g MB08')],
    'MC':    [('MC18', 'Martillo carpintero cabo fibra 18mm MC18'),
              ('MC20', 'Martillo carpintero cabo fibra 20mm MC20'),
              ('MC22', 'Martillo carpintero cabo fibra 22mm MC22'),
              ('MC25', 'Martillo carpintero cabo fibra 25mm MC25')],
    'MG':    [('MG05', 'Mazo de goma 500g MG05'),
              ('MG07', 'Mazo de goma 700g MG07'),
              ('MG21P', 'Mazo de goma plástico 21mm MG21P'),
              ('MG27F', 'Mazo de goma fibra 27mm MG27F')],
}

# Build the replacement blocks
def safe_name(name: str) -> str:
    """Escape or replace characters that break TypeScript string literals."""
    # Replace inch symbol " with in. to avoid breaking the string
    name = name.replace('"', 'in.')
    # Escape any remaining backslashes and single quotes
    name = name.replace('\\', '\\\\')
    return name


def make_entry_explicit(sku, name, heading=""):
    cat, brand = classify(sku)
    if name is None:
        name = make_name(sku, heading)
    name = safe_name(name)
    img = art_to_image.get(sku, "")
    uid = str(uuid.uuid4())
    img_str = f'"{img}"' if img else '""'
    cat_fix = {
        'BPHT225': 'Destornilladores', 'BPHT250': 'Destornilladores',
        'BPZ': 'Destornilladores', 'BPH': 'Destornilladores',
        'BPJ1': 'Destornilladores', 'BPJ2': 'Destornilladores',
        'BLJ1': 'Destornilladores', 'BLJ2': 'Destornilladores',
        'BTJ1': 'Destornilladores', 'BTJ2': 'Destornilladores',
        'MHP': 'Martillos', 'MHT': 'Martillos', 'MHF': 'Martillos',
        'PHIN': 'Herramientas Neumáticas',
        'HLD06': 'Medición', 'HLD08': 'Medición', 'HLD10': 'Medición', 'HLD12': 'Medición',
        'TA123': 'Alicates', 'TA130': 'Alicates', 'TA135': 'Alicates',
        'TA230': 'Alicates', 'TA235': 'Alicates',
        'TC07': 'Alicates', 'TC08': 'Alicates',
        'BAB061': 'Alicates', 'BAB062': 'Alicates',
    }
    if sku in cat_fix:
        cat = cat_fix[sku]
    return f'''  {{
    id: "{uid}",
    sku: "{sku}",
    name: "{name}",
    brand: "{brand}",
    category: "{cat}",
    price: 0,
    description: "",
    image: {img_str},
    specs: {{}},
  }},'''


# ── Parse MOTA blocks and replace phantom ones ────────────────────────────────
block_re = re.compile(
    r'\{(?:[^{}]|\{[^{}]*\})*brand:\s*"(?:MOTA|ArtMota|LubriMota|GasMota|MembraMota)"(?:[^{}]|\{[^{}]*\})*\},',
    re.DOTALL
)

replacements_done = set()
phantom_removed   = 0
fixed_entries     = {}  # phantom_sku → new block text

for phantom, subs in REPLACEMENTS.items():
    blocks = []
    for (new_sku, new_name) in subs:
        blocks.append(make_entry_explicit(new_sku, new_name))
    fixed_entries[phantom] = '\n'.join(blocks)

def replace_phantom(m):
    global phantom_removed
    blk = m.group(0)
    sku_m = re.search(r'sku:\s*"([^"]*)"', blk)
    if not sku_m:
        return blk
    sku = sku_m.group(1)
    if sku in fixed_entries and sku not in replacements_done:
        replacements_done.add(sku)
        phantom_removed += 1
        return fixed_entries[sku]
    return blk

new_catalog = block_re.sub(replace_phantom, catalog)
print(f"Phantoms replaced: {phantom_removed} / {len(REPLACEMENTS)}")

# ── Step 2: Collect existing SKUs ─────────────────────────────────────────────
existing_skus = set(re.findall(r'sku:\s*"([^"]*)"', new_catalog))
print(f"Existing SKUs after step 1: {len(existing_skus)}")

# ── Step 3: Add missing products from audit ───────────────────────────────────
missing = audit["in_pdf_not_in_catalog"]
to_add = [x for x in missing if x["sku"] not in existing_skus]
print(f"Missing to add: {len(to_add)} (out of {len(missing)} in audit)")

new_entries = []
for x in to_add:
    new_entries.append(make_entry(x["sku"], x.get("heading", "")))

# Insert before closing of DEFAULT_PRODUCTS array
# Find the last MOTA product block and insert after it
insert_block = '\n'.join(new_entries)

# Find a good insertion point: before the first non-MOTA product after MOTA products
# Strategy: find the closing "] as Product[];" and insert before
insert_marker = '] as Product[];'
idx = new_catalog.rfind(insert_marker)
if idx == -1:
    print("ERROR: Could not find insertion point")
    sys.exit(1)

new_catalog = new_catalog[:idx] + insert_block + '\n' + new_catalog[idx:]
print(f"Added {len(new_entries)} new entries")

# ── Write result ───────────────────────────────────────────────────────────────
CATALOG.write_text(new_catalog, encoding="utf-8")
print(f"\nDone. Total new catalog size: {len(new_catalog):,} chars")
print(f"New total MOTA-ish entries approx: {len(existing_skus) + len(new_entries)}")
