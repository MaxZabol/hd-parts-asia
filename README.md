# HD Parts Asia

Thai/English dealer catalog for Harley-Davidson parts sourced from the USA and international markets.

## Architecture

- **Airtable** — master inventory database
- **GitHub repository** — public website source
- **data/products.json** — safe public catalog export used by the website
- **GitHub Pages** — static website hosting

The website intentionally does **not** expose Airtable API credentials in browser code. Inventory can be synchronized into `data/products.json` by a controlled automation later.

## Product JSON shape

```json
{
  "sku": "HD20-001",
  "sourceType": "OWNED",
  "sourceUrl": "",
  "title": "English title",
  "thaiTitle": "ชื่อภาษาไทย",
  "oem": "00000000",
  "fitment": "2020 FLTRK Road Glide Limited",
  "condition": "Used",
  "category": "Electrical",
  "shortDescription": "Short English description",
  "thaiDescription": "คำอธิบายสั้นภาษาไทย",
  "thaiPriceTHB": 5900,
  "ebayPriceUSD": 179.99,
  "shippingEstimate": "Est. ฿1,200–1,800 / 5–10 days",
  "status": "Available",
  "photos": ["assets/products/HD20-001/01.jpg"]
}
```

Supported public statuses:
- `Available`
- `Source Available`
- `Coming Soon`

## Next steps

1. Add the first real parts to Airtable.
2. Export approved/public records into `data/products.json`.
3. Add product photos under `assets/products/<SKU>/`.
4. Enable GitHub Pages for the repository.
5. Add automated Airtable → catalog sync.
6. Add source monitoring for eBay/Copart/Russia opportunities.
