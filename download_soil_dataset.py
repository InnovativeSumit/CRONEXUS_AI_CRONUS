"""
Downloads the soil-photo dataset used to train the CropNexus soil classifier into data/soil_images/.

Dataset : Phantom-fs / Soil-Classification-Dataset ("Original Dataset", 1,189 photos, 7 Indian soil classes)
URL     : https://github.com/Phantom-fs/Soil-Classification-Dataset
Licence : CC BY-NC 4.0 (NON-COMMERCIAL). The authors state the photos were collected from online sources.
          => fine for research / learning / prototyping, NOT for a commercial product.
          Please cite: Sheth, Mathur, Gupta, Chaurasia, Engineering Applications of Artificial Intelligence (2025), doi:10.1016/j.engappai.2025.111425

For anything commercial, replace this with your own labelled photos or a CC-BY dataset (see docs/DATA_SOURCES.md)
- any folder of  <ClassName>/*.jpg  images works with train_soil_model.py.

Usage:  python download_soil_dataset.py        (needs git)
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = "https://github.com/Phantom-fs/Soil-Classification-Dataset"
OUT = Path(__file__).resolve().parent / "data" / "soil_images"


def main() -> int:
    if OUT.exists() and any(OUT.iterdir()):
        print(f"{OUT} already has data - delete it first to download again.")
        return 0
    tmp = Path(tempfile.mkdtemp())
    print("Cloning (about 780 MB; only the Original folder is kept)...")
    try:
        subprocess.run(["git", "clone", "--depth", "1", REPO, str(tmp / "repo")], check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print("git clone failed:", e, "\nDownload the repository ZIP from GitHub manually and copy the 'Original Dataset' class folders into", OUT)
        return 1
    repo = tmp / "repo"
    src = next((p for p in repo.rglob("*") if p.is_dir() and "original" in p.name.lower() and "cyaug" not in p.name.lower()), None)
    if src is None:
        print("Could not find the Original dataset folder in the clone; copy class folders into", OUT, "manually.")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for cls in sorted(p for p in src.iterdir() if p.is_dir()):
        shutil.copytree(cls, OUT / cls.name, dirs_exist_ok=True)
        print(f"  {cls.name}: {len(list((OUT / cls.name).glob('*')))} images")
    for lic in repo.glob("LICEN*"):
        shutil.copy(lic, OUT / "LICENCE_CC-BY-NC-4.0.txt")
    shutil.rmtree(tmp, ignore_errors=True)
    print("Done. Next:  python train_soil_model.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
