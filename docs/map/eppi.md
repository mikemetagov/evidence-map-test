---
hide:
  - toc
---

# EPPI-Mapper version

This is the same data in the standard Campbell and 3ie style map format, built with [EPPI-Mapper](https://eppi.ioe.ac.uk/cms/er4/EPPI-Mapper). Click a bubble to list its records, then open a record for its details and link.

<iframe class="eppi-frame" src="eppi-mapper/index.html" title="EPPI-Mapper evidence gap map"></iframe>

[Open the EPPI-Mapper version in a full window](eppi-mapper/index.html){ target="_blank" }

??? info "How to update this map"
    1. Push your data changes. The site build writes a fresh `eppi-mapper.json` to the Data downloads.
    2. Download that file and load it at the [EPPI-Mapper site](https://eppimapper.digitalsolutionfoundry.co.za/). Add the saved map template from `map-config/` so your settings are reused.
    3. Download the generated HTML, rename it `index.html`, and replace `docs/map/eppi-mapper/index.html`.
