#!/usr/bin/env python3
"""Parse ikariam.xlsx building sheets and emit normalized JSON to stdout."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

BUILDING_REGISTRY = {
    "camaramunicipal": {"buildingId": 0, "name": "Câmara Municipal"},
    "porto": {"buildingId": 3, "name": "Porto"},
    "academia": {"buildingId": 4, "name": "Academia"},
    "estaleiro": {"buildingId": 5, "name": "Estaleiro"},
    "quartel": {"buildingId": 6, "name": "Quartel"},
    "armazem": {"buildingId": 7, "name": "Armazém"},
    "muralha": {"buildingId": 8, "name": "Muralha"},
    "taverna": {"buildingId": 9, "name": "Taverna"},
    "museu": {"buildingId": 10, "name": "Museu"},
    "palacio": {"buildingId": 11, "name": "Palácio"},
    "embaixada": {"buildingId": 12, "name": "Embaixada"},
    "mercado": {"buildingId": 13, "name": "Mercado"},
    "oficina": {"buildingId": 15, "name": "Oficina"},
    "espionagem": {"buildingId": 16, "name": "Esconderijo"},
    "residenciadogovernador": {"buildingId": 17, "name": "Residência do Governador"},
    "guardaflorestal": {"buildingId": 18, "name": "Guarda Florestal"},
    "pedreiro": {"buildingId": 19, "name": "Pedreiro"},
    "fabricadevidro": {"buildingId": 20, "name": "Fábrica de Vidro"},
    "viticultor": {"buildingId": 21, "name": "Viticultor"},
    "torrealquimista": {"buildingId": 22, "name": "Torre do Alquimista"},
    "carpintaria": {"buildingId": 23, "name": "Carpintaria"},
    "atelierdearquitetura": {"buildingId": 24, "name": "Atelier de Arquitetura"},
    "oculista": {"buildingId": 25, "name": "Oculista"},
    "cavesdevinho": {"buildingId": 26, "name": "Caves de Vinho"},
    "fabricadepirotecnia": {"buildingId": 27, "name": "Fábrica de Pirotecnia"},
    "templo": {"buildingId": 28, "name": "Templo"},
    "deposito": {"buildingId": 29, "name": "Depósito"},
    "fortalezadospiratas": {"buildingId": 30, "name": "Fortaleza dos Piratas"},
    "mercadonegro": {"buildingId": 31, "name": "Mercado Negro"},
    "arquivosdecartasnauticas": {"buildingId": 32, "name": "Arquivos de Cartas Náuticas"},
    "estaleirocomercial": {"buildingId": 33, "name": "Estaleiro Comercial"},
    "santuariodosdeuses": {"buildingId": 34, "name": "Santuário dos Deuses"},
    "forjadecronos": {"buildingId": 35, "name": "Forja de Cronos"},
}

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# XLSX values are stored as-is (include Pulley + Geometry 6% discount).
# Runtime code applies ×100/94 via src/data/resourceCosts.ts


def col_row(ref):
    match = re.match(r"([A-Z]+)(\d+)", ref)
    return match.group(1), int(match.group(2))


def cell_val(cell, shared_strings):
    cell_type = cell.get("t")
    value_el = cell.find("m:v", NS)
    if value_el is None:
        return None
    if cell_type == "s":
        return shared_strings[int(value_el.text)]
    text = value_el.text or "0"
    return float(text) if "." in text else int(text)


def parse_sheet(z, path):
    root = ET.fromstring(z.read(path))
    rows = {}
    for row in root.findall(".//m:row", NS):
        rnum = int(row.get("r"))
        for cell in row.findall("m:c", NS):
            col, _ = col_row(cell.get("r"))
            rows.setdefault(rnum, {})[col] = cell.get("r")  # placeholder

    # Re-parse with shared strings
    return rows


def main():
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else "/home/fnk/Downloads/ikariam.xlsx"

    with zipfile.ZipFile(xlsx_path) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in ss_root.findall(".//m:si", NS):
                texts = [t.text or "" for t in si.findall(".//m:t", NS)]
                shared_strings.append("".join(texts))

        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = [
            (s.get("name"), s.get(f"{{{REL_NS}}}id"))
            for s in wb.findall(".//m:sheet", NS)
        ]

        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_path = {rel.get("Id"): "xl/" + rel.get("Target") for rel in rels}

        sheet_data = {}
        for name, rid in sheets:
            path = rid_to_path.get(rid)
            root = ET.fromstring(z.read(path))
            rows = {}
            for row in root.findall(".//m:row", NS):
                rnum = int(row.get("r"))
                for cell in row.findall("m:c", NS):
                    col, _ = col_row(cell.get("r"))
                    rows.setdefault(rnum, {})[col] = cell_val(cell, shared_strings)

            headers = {col: str(val).lower() for col, val in rows.get(1, {}).items()}
            levels = []
            for rnum in sorted(k for k in rows if k > 1):
                row = rows[rnum]
                level_val = row.get("A")
                if level_val is None:
                    continue
                level = int(float(level_val))
                entry = {"level": level}
                bonus = {}
                for col, header in headers.items():
                    if col == "A" or header == "level":
                        continue
                    val = row.get(col)
                    if val is None or val == 0 or val == "NULL":
                        continue
                    try:
                        num = int(float(val)) if float(val) == int(float(val)) else float(val)
                    except (TypeError, ValueError):
                        continue
                    if header == "time_sec":
                        entry["timeSec"] = num
                    elif header in ("wood", "wine", "marble", "sulfur"):
                        entry[header] = num
                    elif header == "cristal":
                        entry["crystal"] = num
                    else:
                        bonus[header] = num
                if bonus:
                    entry["bonus"] = bonus
                if "timeSec" not in entry:
                    continue
                levels.append(entry)
            sheet_data[name] = levels

    buildings = []
    for key, levels in sheet_data.items():
        meta = BUILDING_REGISTRY.get(key)
        if not meta:
            print(f"Warning: no registry entry for sheet '{key}'", file=sys.stderr)
            continue
        buildings.append({
            "key": key,
            "buildingId": meta["buildingId"],
            "name": meta["name"],
            "levels": levels,
        })

    buildings.sort(key=lambda b: b["buildingId"])
    json.dump(buildings, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
