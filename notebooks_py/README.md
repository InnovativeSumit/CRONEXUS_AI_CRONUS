# CropNexus — Notebooks as Plain Python Scripts (.py)

This folder contains the exact same 4-step ML pipeline as the Jupyter
notebooks in `notebooks/`, converted to plain `.py` scripts for people who
prefer running things from the terminal or an IDE instead of Jupyter.

| Script | Same content as notebook | Covers |
|---|---|---|
| `01_data_understanding_eda.py` | `01_data_understanding_eda.ipynb` | Installing packages, imports, load dataset, understand dataset, EDA, data cleaning |
| `02_feature_engineering_preprocessing.py` | `02_feature_engineering_preprocessing.ipynb` | Feature engineering, preprocessing, feature selection, train-test split |
| `03_model_training_comparison_tuning.py` | `03_model_training_comparison_tuning.ipynb` | Model training (9 models), model comparison, hyperparameter tuning |
| `04_final_model_evaluation_conclusion.py` | `04_final_model_evaluation_conclusion.ipynb` | Final model selection, evaluation, save model (.joblib), conclusion |
| `05_leaf_disease_cnn_training.py` | `05_leaf_disease_cnn_training.ipynb` | Leaf disease CNN: load images, augment, build model, quick demo training, evaluate the shipped model, training curves, conclusion |

## How to run

Place this folder inside the CropNexus project root (next to `notebooks/`,
`data/`, `models/`) so the relative paths (`../data/...`, `../models/...`)
resolve correctly, then run them **in order**:

```bash
cd notebooks_py
python 01_data_understanding_eda.py
python 02_feature_engineering_preprocessing.py
python 03_model_training_comparison_tuning.py
python 04_final_model_evaluation_conclusion.py
python 05_leaf_disease_cnn_training.py
```

Each script prints its results to the terminal and saves any charts/CSVs to
`../data/processed/`, exactly like the notebook versions.

> Note: these scripts still contain the `# In[ ]:` markers from the
> notebook-to-script conversion — that's normal and doesn't affect how they run.

## About script 5 (leaf disease)

Script 5 trains for just 2 quick demo epochs live (so it stays fast to run),
then loads and evaluates the **actual shipped model** used by the Flask app
(`app/model/leaf_disease/leaf_disease_model.weights.h5`) to report its real,
final ~92% test accuracy. The full training loop that produced that shipped
model (~25-30 epochs, ~20 minutes on CPU) lives at the project root as
`train_leaf_disease_model.py` (resumable/checkpointed) and
`finalize_leaf_disease_model.py` (evaluates + saves the final model) —
run those two if you want to retrain the leaf disease model from scratch.
