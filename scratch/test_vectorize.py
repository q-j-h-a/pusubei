import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.naive_bayes.model import load_dataset, clean_and_tokenize, vectorize_dataset

print("1. Loading dataset...")
load_res = load_dataset({
    "source": "twenty_newsgroups",
    "categories": ["sci.space", "rec.autos"],
    "max_samples": "500"
})
print("Dataset loaded rows:", load_res.get("row_count"))

print("\n2. Cleaning and tokenizing...")
clean_res = clean_and_tokenize({
    "dataset_id": "twenty_newsgroups",
    "remove_headers": True,
    "remove_quotes": True,
    "remove_footers": True,
    "lowercase": True,
    "filter_stopwords": True
})
print("Cleaning completed, vocab size:", clean_res.get("vocab_size"))

print("\n3. Vectorizing...")
vec_res = vectorize_dataset({
    "dataset_id": "twenty_newsgroups",
    "vectorizer_type": "tfidf",
    "max_features": "1000",
    "ngram_min": 1,
    "ngram_max": 1,
    "min_df": 2
})

print("Vectorization completed keys:", list(vec_res.keys()))
print("matrix_sparse_points length:", len(vec_res.get("matrix_sparse_points", [])))
if len(vec_res.get("matrix_sparse_points", [])) > 0:
    print("First sparse point:", vec_res.get("matrix_sparse_points")[0])

print("preview length:", len(vec_res.get("preview", [])))
if len(vec_res.get("preview", [])) > 0:
    first_item = vec_res.get("preview")[0]
    print("First preview item keys:", list(first_item.keys()))
    print("First preview item features (Top 8) length:", len(first_item.get("features", [])))
    if len(first_item.get("features", [])) > 0:
        print("First preview item first feature:", first_item.get("features")[0])
