# CropNexus data sources: research notes

Researched 2026-10-17. Sandbox egress allows only GitHub and PyPI. `api.data.gov.in`, `huggingface.co`, `zenodo.org`, Kaggle, Mendeley and Roboflow all returned 403 from the proxy, so nothing below was verified by a live call to those hosts. Facts come from the dataset pages (fetched through a web tool) and from the source code of public GitHub projects that consume the API. Confidence is marked where it matters.

---

## A. (removed)

The Live Market feature (mandi prices via data.gov.in) was removed in v10, so its research notes were dropped.

---

## B. Soil image datasets (soil TYPE classifier from photos)

### What a photo can and cannot tell you
- **Can**: colour (Munsell-like, red/black/brown/yellow), surface texture and apparent grain size (sandy vs clayey vs loamy, with limits), moisture state, cracking and crusting, presence of gravel. These support a coarse **soil type** label such as alluvial, black (regur), red, laterite, clay or sandy.
- **Cannot**: N, P, K, pH, organic carbon, EC, salinity. These need a lab test, a sensor, or a soil health card. Colour correlates weakly with organic matter and iron, but not reliably enough to report numbers.
- **Caveats**: lighting, white balance, wetness, camera and scale change the look of the same soil. Texture class (sand/silt/clay percentages) from a photo is approximate. Most public sets are web-scraped, small and single-source, so reported accuracies (90 to 100%) are inflated by duplicate or near-duplicate images across train and test. Split by source image, and test on your own phone photos. Present results to farmers as "likely soil type" with a confidence, and prompt for a soil test for nutrients.

### Candidate datasets

| # | Dataset | Classes / images | Licence as stated | Size | Fit for CropNexus | Sandbox download |
|---|---|---|---|---|---|---|
| 1 | **Roboflow "SoilClassification" (soil-classification-v4m7p/soilclassification-vac3q)**, https://universe.roboflow.com/soil-classification-v4m7p/soilclassification-vac3q | Red, Clay, Alluvial, Black (page also lists dupes "soil"/"Soil"); 670 images | CC BY 4.0 | small (tens of MB) | Right Indian classes, open licence. Provenance of images unknown (uploader says they are public photos). Also mirrored at thesis-ylkzx/soilclassification-oe0tm (670 imgs, CC BY 4.0) | **No**. Roboflow blocked. Needs free Roboflow account and API key, or "Download dataset" in browser (Folder format) |
| 2 | **Roboflow "Soil Classification" (soil-project/soil-classification-9imo7)**, https://universe.roboflow.com/soil-project/soil-classification-9imo7 | Alluvial, Clay, Loamy; 566 images | CC BY 4.0 | small | Classification-ready, few classes | **No** (same) |
| 3 | **Zenodo 20404766, "A 92k Soil Texture Image Patch Dataset (Loam, Sand, Clay)"**, https://zenodo.org/records/20404766 , DOI 10.5281/zenodo.20404766, Boqun Li, Hainan Univ. | Loam 41,735; Sand 21,328; Clay 28,987 = 92,050 patches, 224x224, split by original photo; photos from 4 regions of China | CC BY 4.0 | 1.7 GB zip (`dataset_v3_patches.zip`, md5 4f64a3ed48015d37e5cd6946f9d2b61b) | Best clean and large open-licence set, but texture classes (not Indian soil orders), and many patches come from few original photos | **No**. zenodo.org blocked. Direct link: `https://zenodo.org/records/20404766/files/dataset_v3_patches.zip?download=1` (run on your machine) |
| 4 | **Phantom-fs/Soil-Classification-Dataset** (GitHub), https://github.com/Phantom-fs/Soil-Classification-Dataset , also Kaggle `ai4a-lab/comprehensive-soil-classification-datasets`; paper doi 10.1016/j.engappai.2025.111425 | 7 classes: Alluvial 52, Arid 284, Black 255, Laterite 219, Mountain 201, Red 109, Yellow 69 = **1,189 original** images. Plus CycleGAN-synthetic "CyAUG" set (about 5,097 images in the repo, 8,413 per paper) | **CC BY-NC 4.0** (LICENCE file and README). README adds: "not to be used for commercial purposes ... sourced from online sources and is not intended to infringe on any copyrights" | 779 MB repo (Original 230 MB, CyAUG 290 MB) | Best Indian-class coverage that is downloadable here. **NonCommercial and web-scraped: acceptable for research/prototyping only, not for a commercial CropNexus release.** Use CyAUG for training only if you accept synthetic images; never evaluate on it (leak risk) | **Yes**, `git clone --depth 1` works (done, see below) |
| 5 | **Pranay7ej/CNN-soil-image-classification** (GitHub) | Alluvial, Black, Clay, Red; only the **188-image test split** is in the repo (48/47/47/46); the training folders are empty | Repo is GPL-3.0 (covers code). README: images "come from google images", so **image copyright is not cleared** | 12 MB | Prototyping and smoke tests only. Do not ship models trained on it | **Yes** (done) |
| 6 | **Mendeley "SoilClass", doi 10.17632/6mx34nshm4.1**, https://data.mendeley.com/datasets/6mx34nshm4 (Dhal, Chakraborty, Pan; published 2026-06-11) | 5 unnamed types (Type 1 to 5): 109/96/137/107/103 = 552 phone photos, 224x224, 70/20/10 split | **Page shows licence blank**. Mendeley datasets are normally CC BY 4.0, but confirm on the page and contact the authors | not shown | Genuine phone photos, which is what we want. Labels are not mapped to Indian soil names | **No** |
| 7 | Mendeley "Soil Moisture Dataset for Image Based Soil Classification" (skcc44yvvg) | 3 moisture classes (Wet/Moderate/Dry), 1,177 raw phone photos, Bangladesh | Licence blank on page | n/a | Moisture, not soil type. Possibly useful as a secondary "wet/dry" head | **No** |
| 8 | Zenodo 13322242 "INSA soil image dataset" (LIRIS, Lyon) | Lab-prepared gravel, sand, kaolin, silt at various water contents; RGB 1.4 GB, IR 545 MB | CC BY 4.0 | 2.0 GB | Lab conditions, not field photos. Poor domain match | **No** |
| 9 | Zenodo 19662227 "close-range soil images + particle size distributions" (Soranzo, Data in Brief) | Record page shows only the paper PDF; images link not confirmed | CC BY 4.0 (record) | unknown | Geotechnical lab focus. Not suitable | **No** |
| 10 | IEEE DataPort IRSID (Indian Regions Soil Image Database) | 5 texture classes (sand, clay, sandy loam, loam, loamy sand); 16 samples | No licence named (author comment: use with citation); **subscription required** | 28 MB | Indian but tiny and gated. Skip | **No** |
| - | Kaggle `colabsss/multiclass-soil-image-dataset` | Not readable (JS page): licence, class list and counts unconfirmed | Unknown | unknown | Check by hand | **No** |

Excluded (no usable licence or not a soil-type image set): Zenodo 23008781 "SoilLens" (record contains only a PDF), assorted other Roboflow projects that were not opened.

### Recommendation
1. **Commercial-safe path**: use the Roboflow CC BY 4.0 sets (#1, #2), plus Zenodo #3 for a sand/silt/clay-style texture head, and **collect CropNexus's own labelled phone photos** (aim for 300+ per class across lighting and moisture). Keep per-image provenance and attribution in the repo. Ask the uploaders about image origin, since CC BY on Roboflow applies to the uploader's annotations and cannot clean up scraped photos.
2. **Prototype path (done in this sandbox)**: Phantom-fs Original set (7 Indian classes) for building and testing the TF pipeline now. NonCommercial only.
3. Train with transfer learning (MobileNetV3 or EfficientNet-B0), heavy colour and brightness augmentation, split by source, report per-class recall, and export TFLite for on-device use.

### Downloaded in this sandbox (`/home/claude/work/soil_data/`)
- `phantom_fs_original_resized/`: the **Original** 1,189 images from Phantom-fs, resized so the longest side is 512 px (JPEG q88, 66 MB; the full-resolution originals total 230 MB, slightly above the 200 MB target). Class folders and counts: Alluvial_Soil 52, Arid_Soil 284, Black_Soil 255, Laterite_Soil 219, Mountain_Soil 201, Red_Soil 109, Yellow_Soil 69. Contains `LICENCE_CC-BY-NC-4.0.txt` and `UPSTREAM_README.md`. **Non-commercial, research/prototyping only.** The set is class-imbalanced (Alluvial 52 vs Arid 284), so use class weights.
- `pranay7ej_testset/`: 188 images, 4 classes: Alluvial_Soil 48, Black_Soil 47, Clay_Soil 47, Red_Soil 46 (5.3 MB). Image copyright unclear (Google Images). Use for smoke tests only. Code licence file saved as `LICENSE_code_GPL3.txt`.
- Not downloaded (blocked hosts): Roboflow sets, Zenodo 20404766, Mendeley sets, Kaggle sets, any Hugging Face set. I found no Hugging Face soil-type image dataset with a clear open licence via search.
