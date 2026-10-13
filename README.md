# Blockchain for Impact Funding Evidence Map

Website, data and analytical outputs for the evidence map. The site is built with [Zensical](https://zensical.org/) and published free on GitHub Pages.

**All data in this starter are invented (MOCK).** Replace the three files in `data/` before sharing.

## What is where

| Folder or file | What it is | Who edits it |
|---|---|---|
| `data/cases.csv` | One row per use case | You |
| `data/coding.csv` | One row per use case and outcome, with the evidence grade | You |
| `data/codebook.csv` | Allowed values, order and definitions | You, only at approved codebook changes |
| `docs/` | Website pages, written in Markdown | You |
| `docs/outputs/files/` | Reports, briefs and slide decks (PDF, PPTX) | You |
| `docs/map/eppi-mapper/index.html` | The map produced by EPPI-Mapper | Replace after each data release |
| `scripts/build.py` | Checks the data and builds the map files and downloads | Rarely |
| `docs/assets/` | Hover map code and site styling | Rarely |
| `.github/workflows/deploy.yml` | Publishes the site on every push | Rarely |
| `zensical.toml` | Site name, menu and settings | Occasionally |

## One-time setup

Follow `START-HERE.md`, which comes with the package. In short:
1. Upload these files to a new repository.
2. Set **Settings > Pages > Source** to **GitHub Actions**.
3. Create `.github/workflows/deploy.yml` by pasting `workflow-to-paste.txt` into GitHub's editor.

Optional: add `site_url` and `repo_url` to `zensical.toml` to enable canonical links and "edit this page" links. You can also add a custom domain under **Settings > Pages > Custom domain**.

## Updating the data

1. Edit `data/cases.csv` and `data/coding.csv`. Keep `case_id` values stable and never reuse them.
2. Commit the change. The workflow runs `scripts/build.py` first.
3. If a value is not in the codebook, an ID is missing or an outcome is coded twice, the build stops and the Actions log lists each problem with its line number. The live site is not changed until the data pass.
4. Add a line to `docs/changelog.md` for each release.

## Updating the EPPI-Mapper version

1. After a successful build, download `eppi-mapper.json` from the site's Data page.
2. Load it at the [EPPI-Mapper site](https://eppimapper.digitalsolutionfoundry.co.za/), with your saved template from `map-config/` if you have one.
3. Download the HTML, rename it `index.html` and replace `docs/map/eppi-mapper/index.html`.

## Adding an output

Put the file in `docs/outputs/files/` and add a row to the table in `docs/outputs/index.md`, for example:
`| [Pilot report (PDF)](files/pilot-report.pdf) | GSR Foundation | 2026-12-01 | Final |`

## Previewing on your own computer (optional)

```sh
pip install -r requirements.txt
python scripts/build.py
zensical serve
```
Then open the local address it prints.

## Things to know

- Everything in this repository is public, including the data folder. Keep restricted partner material elsewhere.
- Free GitHub Pages sites are public. Keep the restricted pilot map off this site until the GSR Foundation approves publication.
- Zensical is pinned to version 0.0.70 in `requirements.txt` so builds do not change unexpectedly. Its stable release line begins on November 5, 2026; update the pin after testing.
- Licences: the starter assumes CC BY 4.0 for text and data and MIT for code. Confirm with Metagov and the GSR Foundation, then add `LICENSE` files.
