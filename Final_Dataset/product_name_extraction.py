# %%
import re
import pandas as pd
# %%
df = pd.read_excel(r"C:\Projects\Target_ML\Final_Dataset\sentiment_results.xlsx")
# %%
df.head()
# %%
df = df.drop(columns=["product_clean"])
# %%
df = df.drop(columns=["didPurchase"])
df = df[df["reviews"].notnull()]
# %%
df["doRecommend"] = df["doRecommend"].fillna(0).astype(int)
df["rating"]      = df["rating"].astype(int)
# %%
df["date"] = df["date"].fillna("1900-01-01")
df["date"] = df["date"].str.replace("20220", "2022-0", regex=False)
df["date"] = pd.to_datetime(df["date"], format="mixed", utc=True)
# %%
_BRAND_PREFIX_RE = re.compile(
    r"^("
    r"New\s+retail\s+brand\s+brand\s+name"    # longest compound first
    r"|New\s+retail\s+brand"
    r"|retail\s+brand\s+-\s+brand\s+name"
    r"|retail\s+brand\s+brand\s+name"
    r"|retail\s+brand\s*-"
    r"|retail\s+brand"
    r"|Brand\s+New\s+electronics\s+brand"
    r"|electronics\s+brand\s+product\s+name"
    r"|electronics\s+brand"
    r"|electonics\s+brand"                    # typo variant in source data
    r"|brand\s+name"
    r")\s*",
    flags=re.IGNORECASE,
)
_RENAME_MAP = {
    # -- Category A: mid-string "brand name" placeholder ------------------
    "5W USB Official OEM Charger and Power Adapter for XYZ brand Tablets and brand name eReaders":
        "5W USB OEM Charger for XYZ brand Tablets and Kindle eReaders",
 
    "9W PowerFast Official OEM USB Charger and Power Adapter for XYZ brand Tablets and brand name eReaders":
        "9W PowerFast OEM Charger for XYZ brand Tablets and Kindle eReaders",
 
    # This raw entry also has a leading "XYZ brand" prefix that survived
    # because it is NOT a brand placeholder - it is the product brand.
    # After rename it deduplicates with the 9W entry above.
    "XYZ brand 9W PowerFast Official OEM USB Charger and Power Adapter for XYZ brand Tablets and brand name eReaders":
        "9W PowerFast OEM Charger for XYZ brand Tablets and Kindle eReaders",
 
    "Dx Leather Cover, Black (fits 9.7 Display, Latest and 2nd Generation brand name Dxs)":
        "Kindle Dx Leather Cover, Black (fits 9.7 Display, 2nd Generation)",
 
    # -- Category B: mid-string "electronics brand" = Amazon Fire TV ------
    "Certified Refurbished electronics brand TV (Previous Generation - 1st)":
        "Certified Refurbished Amazon Fire TV (Previous Generation - 1st)",
 
    "Certified Refurbished electronics brand TV Stick (Previous Generation - 1st)":
        "Certified Refurbished Amazon Fire TV Stick (Previous Generation - 1st)",
 
    "Certified Refurbished electronics brand TV with Alexa Voice Remote":
        "Certified Refurbished Amazon Fire TV with Alexa Voice Remote",
}
 
# Products that survived cleaning but clearly don't belong in this dataset
_KNOWN_BAD = {"Coconut Water Red Tea 16.5 Oz (pack of 12)"}
def clean_product(raw: str) -> str:
    """
    Return a clean product name from the raw `product` field.
 
    Pipeline
    --------
    1. Normalise _x000D_ (Excel CR artifact) -> \\r, split on any line-break,
       take the first non-empty segment. Must happen BEFORE prefix stripping
       so we never accidentally strip a prefix that only appears on line 2.
    2. Strip stray leading/trailing quote characters from CSV parsing.
    3. Remove the brand placeholder PREFIX in one atomic regex pass.
       The regex is anchored at ^ so it never fires mid-string.
    4. Strip trailing commas / quotes / whitespace.
    5. Collapse consecutive internal spaces left after prefix removal.
    6. Apply the post-clean rename map (handles mid-string placeholders
       and product deduplication that the regex cannot reach).
    7. Return 'Unknown Product' for anything empty or clearly wrong-category.
    """
    if pd.isna(raw):
        return "Unknown Product"
 
    # 1. Split on line breaks, take first real segment
    text    = str(raw).replace("_x000D_", "\r")
    segment = next(
        (s.strip() for s in re.split(r"[\r\n]+", text) if s.strip()),
        "",
    )
    if not segment:
        return "Unknown Product"
 
    # 2. Strip CSV-artifact quotes
    segment = segment.strip("\"'")
 
    # 3. Remove leading brand prefix (single compiled-regex pass)
    segment = _BRAND_PREFIX_RE.sub("", segment).strip()
 
    # 4. Strip trailing punctuation/whitespace leftovers
    segment = segment.rstrip(",\"'").strip()
 
    # 5. Collapse double spaces
    segment = re.sub(r" {2,}", " ", segment)
 
    if not segment or segment in _KNOWN_BAD:
        return "Unknown Product"
 
    # 6. Apply canonical rename map
    return _RENAME_MAP.get(segment, segment)
# %%
df["product_clean"] = df["product"].apply(clean_product)
# %%
print("Unique product_clean values:")
for name in sorted(df["product_clean"].unique()):
    print(" ", repr(name))
# %%
df[['product_clean']].to_excel('product_column.xlsx', index=False)
# %%
# %% =========================
# Product Structuring Logic
# =========================

# --- Known brand keywords (expandable) ---
_BRAND_KEYWORDS = [
    "XYZ brand",
    "Amazon",
    "Kindle",
    "Fire",
]

def extract_company(name: str) -> str:
    name_lower = name.lower()

    # Direct detection
    if "xyz brand" in name_lower:
        return "XYZ brand"

    # Amazon ecosystem inference
    if any(k in name_lower for k in ["kindle", "fire tv", "fire", "alexa"]):
        return "Amazon"

    # Explicit Amazon mention
    if "amazon" in name_lower:
        return "Amazon"

    return "Unknown"


def split_title_specs(name: str):
    if name == "Unknown Product":
        return ("Unknown Product", "")

    # Extract parentheses content as specs
    paren_specs = re.findall(r"\((.*?)\)", name)

    # Remove parentheses from main string
    base = re.sub(r"\(.*?\)", "", name).strip()

    # Split by first comma
    parts = [p.strip() for p in base.split(",") if p.strip()]

    if not parts:
        return (name, "")

    title = parts[0]

    # Everything else becomes specs
    specs_parts = parts[1:]

    # Include parentheses content
    if paren_specs:
        specs_parts.extend(paren_specs)

    specs = ", ".join(specs_parts)

    return (title, specs)


def remove_brand_from_title(title: str, company: str) -> str:
    if company == "Unknown":
        return title

    # Remove brand words from title for cleaner UI
    title = re.sub(re.escape(company), "", title, flags=re.IGNORECASE).strip()

    # Cleanup double spaces
    title = re.sub(r"\s{2,}", " ", title)

    return title


# --- Apply transformations ---
df["Product_Company"] = df["product_clean"].apply(extract_company)

title_specs = df["product_clean"].apply(split_title_specs)

df["Product_title"] = title_specs.apply(lambda x: x[0])
df["Specs"] = title_specs.apply(lambda x: x[1])

# Remove brand from title (clean card UI)
df["Product_title"] = df.apply(
    lambda row: remove_brand_from_title(row["Product_title"], row["Product_Company"]),
    axis=1
)

# Final cleanup
df["Product_title"] = df["Product_title"].str.strip()
df["Specs"] = df["Specs"].str.strip()

#%%
df.head()

#%%
df["date"] = df["date"].dt.tz_localize(None)
df.to_excel(
    r"C:\Projects\Target_ML\Final_Dataset\sentiment_results_clean.xlsx",
    index=False
)
print(f"Saved {len(df):,} rows → sentiment_results_clean.xlsx")
print(f"Columns: {df.columns.tolist()}")
# %%
df = pd.read_excel("sentiment_results_clean.xlsx")
df.to_json("sentiment_results.json", orient="records", indent=2)