# DecFlowEdit: Self-Localized Flow-based Image Editing via Guidance Decoupling

**Zheyuan Zhan¹ · Can Wang¹ · Jiawei Chen¹ · Chun Chen¹ · Siwei Lyu² · Zeyu Zheng³ · Defang Chen³†**

¹ Zhejiang University · ² University at Buffalo · ³ University of California, Berkeley<br>
† Corresponding author

[Paper](https://arxiv.org/abs/2609.34237) · [Code](https://github.com/zju-pi/DecFlowEdit-Official) · [Project page source](docs/)

DecFlowEdit uses velocity differences without classifier-free guidance (CFG) to identify where to edit, then uses the resulting spatial prior to constrain editing under default CFG. The method is training-free and inversion-free, and requires neither external spatial masks nor attention manipulation.

This repository provides end-to-end, single-image demonstrations of DecFlowEdit with FLUX.1-dev, SD3-Medium, and SD3.5-Medium. Both the full prior-extraction schedule and the quarter-length **Ours-short** schedule are supported.

## Method

DecFlowEdit separates spatial localization from semantic editing:

1. **Prior-extraction stage (w/o CFG).** Use source/target guidance `(1, 1)` to collect velocity differences along an auxiliary FlowEdit trajectory. Sum the velocity-difference vectors across selected intermediate steps, then take the channel-wise L2 norm. Apply a `5 x 5` mean filter, percentile normalization (`q10`, `q90`), and a sigmoid to obtain the spatial prior, with threshold `tau = 0.55` and softness `s = 0.08`.
2. **Prior-guided editing stage (default CFG).** Initialize a separate editing trajectory from the source image. Multiply each default-CFG velocity difference by the fixed soft spatial prior before integration.

For SD3/SD3.5, prior extraction at guidance `(1, 1)` evaluates only the source and target conditional predictions in one batch (2 NFEs per step). Default-CFG editing evaluates the source and target conditional and unconditional predictions in one batch (4 NFEs per step).

The short option changes the prior-extraction schedule only. The final editing schedule and its guidance strengths remain unchanged.

## Contents

```text
DecFlowEdit-Official/
  README.md
  LICENSE
  NOTICE
  THIRD_PARTY_NOTICES.md
  CITATION.cff
  requirements.txt
  common.py
  assets/sample.jpg
  flux/demo.py
  flux/utils.py
  sd3/demo.py
  sd3/utils.py
  docs/                 # GitHub Pages project website
```

The SD3 entry point also supports SD3.5 by selecting its checkpoint. `assets/sample.jpg` is PIE-Bench example `000000000000`, with the edit from "a slanted mountain bicycle on the road in front of a building" to "a slanted rusty mountain bicycle on the road in front of a building".

## Sampling presets

Each pair below is `schedule steps / n_max`, where `n_max` is the active sampling-step limit. A full schedule and its active update count are distinct.

| Backbone | Full prior | Short prior | Final editing | Editing CFG (source, target) |
|---|---:|---:|---:|---|
| FLUX.1-dev | 28 / 24 | 7 / 6 | 28 / 24 | (1.5, 5.5) |
| SD3-Medium | 50 / 33 | 13 / 9 | 50 / 33 | (3.5, 13.5) |
| SD3.5-Medium | 50 / 33 | 13 / 9 | 50 / 33 | (3.5, 13.5) |

For short extraction, the selected zero-based indices satisfy `ceil(0.25 * prior_steps) <= k <= floor(0.75 * prior_steps)` and must also be active sampling steps: FLUX selects `2–5`, and SD3/SD3.5 select `4–9`. The full mode retains the full-run implementation's endpoint rounding. Each run records the selected indices and resolved sampling configuration.

Soft priors are saved as 8-bit grayscale PNGs and read back with values scaled by `1/255` for editing, matching the mask handoff in the batch experiments. `M_hard.png` is a visualization; editing uses `M_soft.png`. The FLUX implementation retains the executed sampling convention, including the zero-length final integration interval. These demonstrations do not by themselves reproduce aggregate benchmark scores: that also requires the corresponding task lists, per-task settings, and evaluation pipeline.

## Setup

Clone the repository, use an isolated Python environment, then install the dependencies:

```bash
git clone https://github.com/zju-pi/DecFlowEdit-Official.git
cd DecFlowEdit-Official
python -m pip install -r requirements.txt
```

A CUDA-capable GPU is recommended for these full-size checkpoints. Pretrained weights are downloaded separately. Obtain access to each official checkpoint and authenticate with Hugging Face using its tooling if needed; no credentials should be inserted into these scripts.

Reference environments for these backbones:

| Backbone | Python | PyTorch | Diffusers | Transformers |
|---|---|---|---|---|
| FLUX.1-dev, SD3 | 3.8.20 | 2.4.1 | 0.30.1 | 4.46.3 |
| SD3.5 | 3.10.20 | 2.5.1+cu121 | 0.37.1 | 5.5.4 |

## Run

Run the following commands from the repository root. The default sample and output locations are resolved relative to the package, so they do not depend on the current working directory.

```bash
# FLUX.1-dev: full and quarter-length prior extraction
python flux/demo.py --prior_schedule full
python flux/demo.py --prior_schedule short

# SD3: full and quarter-length prior extraction
python sd3/demo.py --prior_schedule full
python sd3/demo.py --prior_schedule short

# SD3.5: full and quarter-length prior extraction
python sd3/demo.py --model stabilityai/stable-diffusion-3.5-medium --prior_schedule full
python sd3/demo.py --model stabilityai/stable-diffusion-3.5-medium --prior_schedule short
```

Use `--image`, `--src_prompt`, and `--tar_prompt` for your own edit, or `--model` for a downloaded checkpoint directory. User-supplied relative paths are interpreted relative to the working directory. `--output_dir` overrides the output location. The default outputs separate models and full/short modes under `outputs/`.

The two schedules can also be configured explicitly:

```bash
python flux/demo.py --prior_schedule short --prior_steps 7 --prior_n_max 6 --edit_steps 28 --edit_n_max 24
```

`--T_steps` and `--n_max` are compatibility aliases for the editing settings. Use the `--prior_*` options to change prior extraction independently. Additional options are listed by `python flux/demo.py --help` or `python sd3/demo.py --help`; displaying help does not load model weights.

## Outputs

Each run saves the edited image, the energy-map visualization, soft and hard prior visualizations, and a configuration record with the resolved schedules. The soft prior shown in the output is the same saved prior used for editing.

## Project website

The static project page is maintained in `docs/`. To preview it locally from the repository root:

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8000` in a browser on the same machine. When working on a remote server, forward port 8000 through your SSH client or editor.

To publish, configure GitHub Pages to deploy from the `main` branch and `/docs` folder. After Pages is enabled, the expected project URL is `https://zju-pi.github.io/DecFlowEdit-Official/`. Website content and result figures are stored alongside the code for versioned updates.

The page also works by opening `docs/index.html` directly. Main maintenance files:

- `docs/index.html`: authors, page text, paper links, quantitative results, and citation.
- `docs/style.css`: layout, colors, and mobile styling.
- `docs/script.js`: example selection, backbone selection, image enlargement, and citation copying.
- `docs/assets/images/examples.json`: original image paths and source/target prompts for the gallery. After changing it, run `python tools/sync_site_data.py` to refresh the browser data.

All gallery images are existing paper examples. The gallery currently shows FLUX.1-dev and SD3; the quantitative table additionally reports SD3.5. Local provenance and verification records are kept in the ignored `_internal/` directory.

## Citation

```bibtex
@article{zhan2026decflowedit,
  title   = {DecFlowEdit: Self-Localized Flow-based Image Editing via Guidance Decoupling},
  author  = {Zhan, Zheyuan and Wang, Can and Chen, Jiawei and Chen, Chun and Lyu, Siwei and Zheng, Zeyu and Chen, Defang},
  journal = {arXiv preprint arXiv:2609.34237},
  year    = {2026},
  url     = {https://arxiv.org/abs/2609.34237}
}
```

## License

DecFlowEdit additions are licensed under the [Apache License 2.0](LICENSE). FlowEdit-derived portions retain their original MIT license; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [NOTICE](NOTICE). Third-party model weights, datasets, and images remain subject to their respective terms and are not relicensed under the code license.

## Acknowledgments

The paired-state sampling routines build on [FlowEdit](https://github.com/fallenshock/FlowEdit). Pretrained weights and the complete benchmark dataset are not included. The website shows selected examples used in the paper, with its layout inspired by the FlowEdit project page.
