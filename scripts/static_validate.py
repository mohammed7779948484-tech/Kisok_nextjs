#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / "supabase" / "migrations"

files = sorted(MIG.glob("*.sql"))
if len(files) != 13:
    raise SystemExit(f"FAIL: expected 13 migrations, found {len(files)}")

text = "\n".join(p.read_text(encoding="utf-8") for p in files)

def assert_balanced_parentheses(path: Path, body: str) -> None:
    depth = 0
    i = 0
    state = "code"
    while i < len(body):
        ch = body[i]
        nxt = body[i + 1] if i + 1 < len(body) else ""
        if state == "line_comment":
            if ch == "\n":
                state = "code"
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue
        if state == "single_quote":
            if ch == "'":
                if nxt == "'":
                    i += 2
                    continue
                state = "code"
            i += 1
            continue
        if state == "double_quote":
            if ch == '"':
                if nxt == '"':
                    i += 2
                    continue
                state = "code"
            i += 1
            continue
        if ch == "-" and nxt == "-":
            state = "line_comment"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            state = "block_comment"
            i += 2
            continue
        if ch == "'":
            state = "single_quote"
            i += 1
            continue
        if ch == '"':
            state = "double_quote"
            i += 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth < 0:
                raise SystemExit(f"FAIL: extra closing parenthesis in {path.name}")
        i += 1
    if depth != 0:
        raise SystemExit(f"FAIL: unbalanced parentheses in {path.name}: depth={depth}")

# Basic lexical safety.
for p in files:
    body = p.read_text(encoding="utf-8")
    if body.count("$$") % 2:
        raise SystemExit(f"FAIL: unbalanced $$ in {p.name}")
    assert_balanced_parentheses(p, body)

functions = re.findall(
    r"(?im)^\s*create\s+function\s+([a-z_][\w]*\.[a-z_][\w]*)\s*\(",
    text,
)
if len(functions) != len(set(functions)):
    dupes = sorted({f for f in functions if functions.count(f) > 1})
    raise SystemExit(f"FAIL: duplicate function definitions: {dupes}")

if len(functions) > 25:
    raise SystemExit(f"FAIL: lean function budget exceeded: {len(functions)}")

triggers = re.findall(r"(?im)^\s*create\s+trigger\s+([a-z_][\w]*)", text)
if len(triggers) > 20:
    raise SystemExit(f"FAIL: lean trigger budget exceeded: {len(triggers)}")

forbidden = [
    "reconcile_customer_cart",
    "search_customer_products",
    "get_customer_product_detail",
    "list_customer_products",
    "get_customer_catalog_home",
    "get_customer_catalog_availability",
    "get_admin_catalog_visibility",
    "save_product_catalog",
    "move_catalog_item",
    "create_flavor_with_initial_stock",
    "save_product_with_categories",
    "reorder_catalog_items",
    "realtime.send",
]
for token in forbidden:
    if token.lower() in text.lower():
        raise SystemExit(f"FAIL: forbidden legacy/over-complex token remains: {token}")

# Runtime legacy vocabulary should be absent. A comment may mention "Flavor"
# as an example Option Type, but table/column/function identifiers must not.
identifier_forbidden = [
    r"\bpublic\.flavors\b",
    r"\bflavor_id\b",
    r"\bflavor_name\b",
    r"\boption_signature\b",
]
for pattern in identifier_forbidden:
    if re.search(pattern, text, flags=re.I):
        raise SystemExit(f"FAIL: obsolete runtime identifier remains: {pattern}")

required_functions = {
    "public.current_active_profile",
    "public.get_customer_catalog",
    "public.create_order",
    "public.update_order_status",
    "public.apply_inventory_adjustment",
    "public.set_inventory_quantity",
    "public.admin_update_profile",
    "public.search_admin_profiles",
    "public.get_media_asset_usage",
    "public.reorder_items",
}
missing = sorted(required_functions - set(functions))
if missing:
    raise SystemExit(f"FAIL: required functions missing: {missing}")


# Security-definer functions must pin an empty search_path.
for match in re.finditer(
    r"(?is)create\s+function\s+([a-z_][\w]*\.[a-z_][\w]*)\s*\([^;]*?\)"
    r".*?security\s+definer.*?as\s+\$\$(.*?)\$\$;",
    text,
):
    header = match.group(0).split("as $$", 1)[0].lower()
    if "set search_path = ''" not in header:
        raise SystemExit(
            f"FAIL: SECURITY DEFINER function lacks empty search_path: {match.group(1)}"
        )

if "auth.role()" in text.lower():
    raise SystemExit("FAIL: deprecated auth.role() authorization remains")

# Supabase public-schema objects can inherit broad Data API grants. The final
# migration must reset existing grants before rebuilding the intended surface.
normalized = re.sub(r"\s+", " ", text.lower())
required_lockdown = [
    "revoke all privileges on all tables in schema public from anon, authenticated, service_role;",
    "revoke all privileges on all sequences in schema public from anon, authenticated, service_role;",
    "revoke execute on all functions in schema public from public, anon, authenticated, service_role;",
    "revoke execute on all functions in schema private from public, anon, authenticated, service_role;",
]
for statement in required_lockdown:
    if statement not in normalized:
        raise SystemExit(f"FAIL: final privilege reset missing: {statement}")

# Authenticated browsers must never receive direct write grants on operational
# state or Profiles. Those writes are RPC/service-role boundaries.
for table in ["profiles", "inventory", "inventory_adjustments", "orders", "order_items"]:
    pattern = (
        rf"grant\s+[^;]*(?:insert|update|delete|truncate)[^;]*"
        rf"on\s+(?:table\s+)?public\.{table}[^;]*to\s+authenticated\s*;"
    )
    if re.search(pattern, text, flags=re.I | re.S):
        raise SystemExit(f"FAIL: authenticated direct write grant remains on {table}")

# DB-owned ordering/SKU fields must not be writable through direct Admin column grants.
for forbidden_column in ["display_order", "sku"]:
    for grant in re.findall(r"(?is)grant\s+(?:insert|update)\s*\([^;]+?\)\s+on\s+public\.[^;]+?to\s+authenticated\s*;", text):
        if re.search(rf"\b{forbidden_column}\b", grant, flags=re.I):
            raise SystemExit(
                f"FAIL: DB-owned column {forbidden_column} is directly writable by authenticated"
            )

# pgTAP declarations should match the number of assertion calls.
for test_file in sorted((ROOT / "supabase" / "tests").glob("*.sql")):
    body = test_file.read_text(encoding="utf-8")
    declared_match = re.search(r"select\s+plan\((\d+)\)", body, flags=re.I)
    if not declared_match:
        raise SystemExit(f"FAIL: pgTAP plan missing in {test_file.name}")
    declared = int(declared_match.group(1))
    actual = len(re.findall(
        r"(?im)^\s*select\s+(?:ok|is|isnt|throws_ok|lives_ok|results_eq)\s*\(",
        body,
    ))
    if declared != actual:
        raise SystemExit(
            f"FAIL: pgTAP plan mismatch in {test_file.name}: declared {declared}, found {actual}"
        )

# Function EXECUTE grants are centralized in the final grants migration.
final_grants_file = files[-1]
for migration in files[:-1]:
    if re.search(r"(?im)^\s*grant\s+execute\s+on\s+function", migration.read_text(encoding="utf-8")):
        raise SystemExit(
            f"FAIL: function EXECUTE grant appears before final grants migration: {migration.name}"
        )

final_grants = final_grants_file.read_text(encoding="utf-8")
expected_authenticated_rpcs = {
    "public.current_active_profile",
    "public.get_customer_catalog",
    "public.create_order",
    "public.update_order_status",
    "public.apply_inventory_adjustment",
    "public.set_inventory_quantity",
    "public.get_media_asset_usage",
    "public.reorder_items",
}
expected_service_rpcs = {
    "public.admin_update_profile",
    "public.search_admin_profiles",
}

def grant_functions_for(role: str) -> set[str]:
    found: set[str] = set()
    pattern = rf"(?is)grant\s+execute\s+on\s+function\s+([^;]*?)\s+to\s+{role}\s*;"
    for m in re.finditer(pattern, final_grants):
        function_list = m.group(1)
        for name in re.findall(
            r"(?:^|,)\s*(public\.[a-z_][\w]*)\s*\(",
            function_list,
            flags=re.I | re.M,
        ):
            found.add(name.lower())
    return found

auth_surface = grant_functions_for("authenticated")
service_surface = grant_functions_for("service_role")
if auth_surface != expected_authenticated_rpcs:
    raise SystemExit(
        f"FAIL: authenticated RPC surface mismatch: {sorted(auth_surface)}"
    )
if service_surface != expected_service_rpcs:
    raise SystemExit(
        f"FAIL: service_role RPC surface mismatch: {sorted(service_surface)}"
    )

# All app tables must enable RLS.
tables = [
    "profiles","media_assets","store_settings","brands","categories",
    "option_types","option_values","products","product_categories",
    "product_variants","variant_option_values","product_variant_media",
    "inventory","inventory_adjustments","orders","order_items",
]
for table in tables:
    needle = f"alter table public.{table} enable row level security;"
    if needle.lower() not in text.lower():
        raise SystemExit(f"FAIL: RLS enable missing for {table}")

# Critical security boundary: Admin profile mutation is service_role-only.
if re.search(
    r"grant\s+execute\s+on\s+function\s+public\.admin_update_profile"
    r"\([^;]+?\)\s*(?:,|\s)+[^;]*\bto\s+authenticated\b",
    text,
    flags=re.I | re.S,
):
    raise SystemExit("FAIL: admin_update_profile is granted to authenticated")

if "to service_role;" not in text.lower():
    raise SystemExit("FAIL: service_role grants not found")

# Only orders should be explicitly added to Supabase Realtime.
pub_adds = re.findall(
    r"alter\s+publication\s+supabase_realtime\s+add\s+table\s+public\.([a-z_][\w]*)",
    text,
    flags=re.I,
)
if [x.lower() for x in pub_adds] != ["orders"]:
    raise SystemExit(f"FAIL: unexpected Realtime publication additions: {pub_adds}")

print("PASS: static Lean V2 validation")
print(f"  migrations : {len(files)}")
print(f"  functions  : {len(functions)}")
print(f"  triggers   : {len(triggers)}")
print(f"  SQL lines  : {sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)}")
print("  realtime   : orders only")
print("  customer   : snapshot + checkout RPC only")
print("  admin user : service_role mutation boundary")
