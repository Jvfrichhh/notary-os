#!/usr/bin/env python3
"""
Turunkan DDL PostgreSQL dari prisma/schema.prisma mengikuti konvensi penamaan
Prisma Migrate (nama constraint/index/FK, tipe kolom, default).

Dipakai HANYA untuk membentuk database PENGUJIAN kosong ketika Prisma CLI
tidak tersedia. Hasilnya harus diverifikasi dengan
  prisma migrate diff --from-url <DB> --to-schema-datamodel prisma/schema.prisma --exit-code
begitu Prisma CLI tersedia. Bukan pengganti `prisma db push` untuk produksi.

  python3 scripts/prisma-to-ddl.py prisma/schema.prisma > out.sql
"""
import re
import sys

SCALARS = {"String": "TEXT", "Int": "INTEGER", "Boolean": "BOOLEAN", "DateTime": "TIMESTAMP(3)",
           "Json": "JSONB", "Float": "DOUBLE PRECISION", "BigInt": "BIGINT", "Decimal": "DECIMAL(65,30)", "Bytes": "BYTEA"}


def parse(src: str):
    src = re.sub(r"//.*", "", src)
    enums, models = {}, {}
    for m in re.finditer(r"enum\s+(\w+)\s*\{([^}]*)\}", src):
        enums[m.group(1)] = [v.strip() for v in m.group(2).split() if v.strip()]
    for m in re.finditer(r"model\s+(\w+)\s*\{([^}]*)\}", src):
        name, body = m.group(1), m.group(2)
        fields, block = [], []
        for raw in body.splitlines():
            line = raw.strip()
            if not line:
                continue
            if line.startswith("@@"):
                block.append(line)
                continue
            parts = line.split(None, 2)
            fname, ftype = parts[0], parts[1]
            attrs = parts[2] if len(parts) > 2 else ""
            fields.append({"name": fname, "type": ftype, "attrs": attrs})
        models[name] = {"fields": fields, "block": block}
    return enums, models


def table_name(model, mdef):
    for b in mdef["block"]:
        mm = re.match(r'@@map\("([^"]+)"\)', b)
        if mm:
            return mm.group(1)
    return model


def col_sql(f, enums):
    t = f["type"]
    nullable = t.endswith("?")
    base = t.rstrip("?")
    attrs = f["attrs"]
    if base in enums:
        sql_type = f'"{base}"'
    else:
        sql_type = SCALARS[base]
    mdb = re.search(r"@db\.Decimal\((\d+),\s*(\d+)\)", attrs)
    if mdb:
        sql_type = f"DECIMAL({mdb.group(1)},{mdb.group(2)})"
    if "@default(autoincrement())" in attrs:
        sql_type = "SERIAL"
    col = f'"{f["name"]}" {sql_type}'
    if not nullable:
        col += " NOT NULL"
    md = re.search(r"@default\((.+?)\)(?=\s|$)", attrs)
    if md:
        d = md.group(1).strip()
        if d in ("cuid()", "uuid()", "autoincrement()"):
            pass
        elif d == "now()":
            col += " DEFAULT CURRENT_TIMESTAMP"
        elif base in enums:
            col += f" DEFAULT '{d}'"
        elif d in ("true", "false"):
            col += f" DEFAULT {d}"
        elif re.match(r"^-?\d+(\.\d+)?$", d):
            col += f" DEFAULT {d}"
        elif d.startswith('"'):
            col += f" DEFAULT '{d.strip(chr(34))}'"
        else:
            raise SystemExit(f"default tidak dikenal: {d} pada {f['name']}")
    return col


def main(path):
    enums, models = parse(open(path).read())
    tables = {m: table_name(m, d) for m, d in models.items()}
    out = []
    for e, vals in enums.items():
        out.append(f'CREATE TYPE "{e}" AS ENUM ({", ".join(chr(39)+v+chr(39) for v in vals)});')
    out.append("")
    indexes, fks = [], []
    for model, d in models.items():
        tbl = tables[model]
        cols, pk = [], None
        for f in d["fields"]:
            base = f["type"].rstrip("?").rstrip("[]")
            is_list = f["type"].endswith("[]")
            if base in models:  # relation field
                mr = re.search(r"@relation\(([^)]*)\)", f["attrs"])
                if mr and "fields:" in mr.group(1):
                    spec = mr.group(1)
                    fld = re.search(r"fields:\s*\[([^\]]+)\]", spec).group(1).strip()
                    ref = re.search(r"references:\s*\[([^\]]+)\]", spec).group(1).strip()
                    ond = re.search(r"onDelete:\s*(\w+)", spec)
                    optional = f["type"].endswith("?")
                    if ond:
                        on_delete = {"Cascade": "CASCADE", "SetNull": "SET NULL", "Restrict": "RESTRICT", "NoAction": "NO ACTION"}[ond.group(1)]
                    else:
                        on_delete = "SET NULL" if optional else "RESTRICT"
                    fks.append(
                        f'ALTER TABLE "{tbl}" ADD CONSTRAINT "{tbl}_{fld}_fkey" FOREIGN KEY ("{fld}") '
                        f'REFERENCES "{tables[base]}"("{ref}") ON DELETE {on_delete} ON UPDATE CASCADE;'
                    )
                continue
            if is_list:
                raise SystemExit(f"scalar list tidak didukung: {model}.{f['name']}")
            cols.append(col_sql(f, enums))
            if "@id" in f["attrs"]:
                pk = [f["name"]]
            if re.search(r"@unique(?!\()", f["attrs"]):
                indexes.append(f'CREATE UNIQUE INDEX "{tbl}_{f["name"]}_key" ON "{tbl}"("{f["name"]}");')
        for b in d["block"]:
            mm = re.match(r"@@(id|unique|index)\(\[([^\]]+)\]", b)
            if not mm:
                continue
            kind = mm.group(1)
            fl = [x.strip() for x in mm.group(2).split(",")]
            q = ", ".join(f'"{x}"' for x in fl)
            if kind == "id":
                pk = fl
            elif kind == "unique":
                indexes.append(f'CREATE UNIQUE INDEX "{tbl}_{"_".join(fl)}_key" ON "{tbl}"({q});')
            else:
                indexes.append(f'CREATE INDEX "{tbl}_{"_".join(fl)}_idx" ON "{tbl}"({q});')
        if not pk:
            raise SystemExit(f"model tanpa primary key: {model}")
        pkq = ", ".join(f'"{x}"' for x in pk)
        out.append(f'CREATE TABLE "{tbl}" (\n    ' + ",\n    ".join(cols) + f',\n\n    CONSTRAINT "{tbl}_pkey" PRIMARY KEY ({pkq})\n);\n')
    out.extend(indexes)
    out.append("")
    out.extend(fks)
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "prisma/schema.prisma")
