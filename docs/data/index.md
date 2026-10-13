# Data

All files are rebuilt from the `data/` folder each time the site is published.

| File | What it contains |
|---|---|
| [cases.csv](downloads/cases.csv) | One row per use case: portfolio, blockchain function, deployment status, region, blockchain added value, link to case material. |
| [coding.csv](downloads/coding.csv) | One row per use case and outcome: evidence grade, short rationale, link to the evidence source. |
| [codebook.csv](downloads/codebook.csv) | Allowed values, display order and definitions for every coded field. |
| [eppi-mapper.json](downloads/eppi-mapper.json) | The same data formatted for upload to EPPI-Mapper. |

## Data dictionary

| Field | Table | Meaning |
|---|---|---|
| case_id | both | Stable ID for the use case. Never reuse or renumber. |
| lineage_id | cases | ID linking the case to its source inventory record. |
| blockchain_function | cases | What the blockchain component does. Values in the codebook. |
| deployment_status | cases | Pilot, scaled or stalled pilot. |
| blockchain_added_value | cases | Whether evidence shows the blockchain component itself caused the gain. |
| case_url | cases | Public link to the main case material. |
| outcome_domain | coding | Outcome the evidence relates to. |
| evidence_grade | coding | 1 claims only to 5 experimental. Definitions in the codebook. |
| grade_rationale | coding | One-sentence reason for the grade. |
| evidence_url | coding | Link to the document that supports the grade. |

## Licence and reuse

Data are shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Please cite the map using the details on the [About and citation](../about.md) page.

!!! danger "Public files only"
    Everything in `data/` is published. Keep restricted partner material in a separate private location, never in this repository.
