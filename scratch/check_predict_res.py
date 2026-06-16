import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.naive_bayes.model import load_dataset, clean_and_tokenize, vectorize_dataset, split_dataset, prepare_train, predict

def main():
    ds_res = load_dataset({"categories": ["sci.space", "rec.autos"], "max_samples": "100"})
    dataset_id = ds_res["dataset_id"]
    clean_and_tokenize({"dataset_id": dataset_id})
    vectorize_dataset({"dataset_id": dataset_id, "vectorizer_type": "tfidf", "max_features": "500"})
    split_dataset({"dataset_id": dataset_id, "test_size": 0.2})
    prepare_train({"dataset_id": dataset_id, "alpha": 1.0, "model_type": "MultinomialNB"})
    
    # Preset text V8 swap
    text = "I am upgrading the cylinder heads on my Ford Mustang's V8 engine. Does anyone recommend high-flow manifolds? I also need to replace the tires and front brake pads to handle the extra horsepower."
    res = predict({"dataset_id": dataset_id, "text": text})
    print("KEYS:", list(res.keys()))
    print("valid_words:", res.get("valid_words"))
    print("oov_words:", res.get("oov_words"))
    print("filtered_words count:", len(res.get("filtered_words", [])))
    print("highlighted_tokens count:", len(res.get("highlighted_tokens", [])))

if __name__ == "__main__":
    main()
