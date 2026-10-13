"""Validate the evidence map data and build every file the website reads.

Run from the repository root:  python scripts/build.py
The GitHub Actions workflow runs this before building the site, so a broken
spreadsheet stops the deploy instead of publishing a wrong map.

Inputs (edit these):
  data/cases.csv     one row per use case
  data/coding.csv    one row per use case x outcome (carries the evidence grade)
  data/codebook.csv  allowed values, display order and definitions

Outputs (generated, do not edit by hand):
  docs/map/map-data.json              data for the hover map
  docs/data/downloads/*.csv           public copies of the three tables
  docs/data/downloads/eppi-mapper.json  file to upload to EPPI-Mapper
"""
import csv, json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, DOCS = ROOT / "data", ROOT / "docs"
CASE_FIELDS = ["case_id", "lineage_id", "title", "portfolio", "blockchain_function", "deployment_status",
               "region", "country", "blockchain_added_value", "year_start", "case_url", "summary"]
CODING_FIELDS = ["case_id", "outcome_domain", "evidence_grade", "grade_rationale", "evidence_url"]
CODED_DIMS = ["evidence_grade", "outcome_domain", "blockchain_function", "deployment_status", "blockchain_added_value"]
MAX_SEGMENTS = 6  # EPPI-Mapper limit on bubble colours

errors = []

def read(name, fields):
    with open(DATA / name, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    missing = [c for c in fields if rows and c not in rows[0]]
    if missing:
        errors.append(f"{name}: missing columns {missing}")
    for n, r in enumerate(rows, start=2):
        if None in r:
            errors.append(f"{name} line {n}: too many commas; put text that contains commas in double quotes")
    return [{k: (v or "").strip() for k, v in r.items() if k is not None} for r in rows]

cases = read("cases.csv", CASE_FIELDS)
coding = read("coding.csv", CODING_FIELDS)
codebook_rows = read("codebook.csv", ["dimension", "value", "order", "definition"])

codebook = {}
for r in sorted(codebook_rows, key=lambda r: (r["dimension"], int(r["order"] or 0))):
    codebook.setdefault(r["dimension"], []).append({"value": r["value"], "definition": r["definition"]})
allowed = {d: {v["value"] for v in vals} for d, vals in codebook.items()}

# ---- validation -----------------------------------------------------------
ids = [c["case_id"] for c in cases]
dupes = {i for i in ids if ids.count(i) > 1}
if dupes:
    errors.append(f"cases.csv: duplicate case_id {sorted(dupes)}")
case_by_id = {c["case_id"]: c for c in cases}
for n, c in enumerate(cases, start=2):
    for d in ["blockchain_function", "deployment_status", "blockchain_added_value"]:
        if c[d] not in allowed.get(d, set()):
            errors.append(f"cases.csv line {n}: '{c[d]}' is not an allowed {d}")
    if not c["case_url"].startswith("http"):
        errors.append(f"cases.csv line {n}: case_url must be a full link")
seen_pairs = set()
for n, r in enumerate(coding, start=2):
    if r["case_id"] not in case_by_id:
        errors.append(f"coding.csv line {n}: case_id {r['case_id']} not in cases.csv")
    for d in ["outcome_domain", "evidence_grade"]:
        if r[d] not in allowed.get(d, set()):
            errors.append(f"coding.csv line {n}: '{r[d]}' is not an allowed {d}")
    pair = (r["case_id"], r["outcome_domain"])
    if pair in seen_pairs:
        errors.append(f"coding.csv line {n}: {pair} coded twice")
    seen_pairs.add(pair)
if len(codebook.get("evidence_grade", [])) > MAX_SEGMENTS:
    errors.append("codebook.csv: EPPI-Mapper allows at most 6 evidence grades")
uncoded = sorted(set(ids) - {r["case_id"] for r in coding})
if uncoded:
    print(f"note: cases with no outcome coding yet: {uncoded}")

if errors:
    print("BUILD STOPPED - fix these data problems:\n  " + "\n  ".join(errors))
    sys.exit(1)

# ---- hover map data -------------------------------------------------------
(DOCS / "map").mkdir(parents=True, exist_ok=True)
json.dump({"cases": cases, "records": coding, "codebook": codebook},
          open(DOCS / "map" / "map-data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- public downloads -----------------------------------------------------
dl = DOCS / "data" / "downloads"
dl.mkdir(parents=True, exist_ok=True)
for name in ["cases.csv", "coding.csv", "codebook.csv"]:
    shutil.copy(DATA / name, dl / name)

# ---- EPPI-Mapper JSON (one reference per use case x outcome) --------------
label = {"evidence_grade": "Evidence grade", "outcome_domain": "Outcome domain",
         "blockchain_function": "Blockchain function", "deployment_status": "Deployment status",
         "blockchain_added_value": "Blockchain added value", "portfolio": "Portfolio", "region": "Region"}
eppi_dims = CODED_DIMS + ["portfolio", "region"]
grade_names = {v["value"]: f"{v['value']} - {v['definition'].split(':')[0]}" for v in codebook["evidence_grade"]}
attr_id, code_sets = {}, []
for i, d in enumerate(eppi_dims, start=1):
    if d in codebook:
        values = [v["value"] for v in codebook[d]]
    else:
        values = sorted({c[d] for c in cases if c[d]})
    kids = []
    for v in values:
        aid = i * 1000 + len(kids) + 1
        attr_id[(d, v)] = aid
        kids.append({"AttributeId": aid, "AttributeName": grade_names.get(v, v) if d == "evidence_grade" else v,
                     "AttributeDescription": "", "AttributeType": "Selectable (show checkbox)"})
    code_sets.append({"AttributeId": i, "AttributeName": label[d], "AttributeDescription": "",
                      "AttributeType": "Not selectable (no checkbox)", "Attributes": {"AttributesList": kids}})
BLANK = ["ParentTitle", "DateCreated", "CreatedBy", "DateEdited", "EditedBy", "Year", "Month", "StandardNumber",
         "City", "Country", "Publisher", "Volume", "Pages", "Edition", "Issue", "Availability", "OldItemId",
         "Comments", "TypeName", "Authors", "ParentAuthors", "DOI", "ItemStatus", "ItemStatusTooltip", "QuickCitation"]
refs = []
for n, r in enumerate(coding, start=1):
    c = {**case_by_id[r["case_id"]], **r}
    ref = {k: "" for k in BLANK}
    ref.update({"Codes": [{"AttributeId": attr_id[(d, c[d])], "ItemAttributeFullTextDetails": []}
                          for d in eppi_dims if c.get(d)],
                "Outcomes": [], "ItemId": 100000 + n,
                "Title": f"{c['title']} [{c['outcome_domain']}]", "ShortTitle": c["case_id"],
                "URL": c["case_url"], "Abstract": f"{c['summary']} Evidence: {c['grade_rationale']}",
                "Institution": c["portfolio"], "Country": c["country"], "Year": c["year_start"],
                "Keywords": c["lineage_id"]})
    refs.append(ref)
json.dump({"CodeSets": [{"SetName": "Evidence map", "SetType": {"SetTypeName": "Standard"},
                         "Attributes": {"AttributesList": code_sets}}], "References": refs},
          open(dl / "eppi-mapper.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"OK: {len(cases)} use cases, {len(coding)} use case-outcome records. Site data and downloads rebuilt.")
