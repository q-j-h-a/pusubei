import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.naive_bayes.model import load_dataset, clean_and_tokenize, vectorize_dataset, split_dataset, prepare_train, predict

def main():
    print("1. Loading dataset...")
    ds_res = load_dataset({"categories": ["sci.space", "rec.autos"], "max_samples": "100"})
    dataset_id = ds_res["dataset_id"]
    print(f"Loaded {ds_res['row_count']} samples.")
    
    print("\n2. Cleaning and tokenizing...")
    clean_res = clean_and_tokenize({"dataset_id": dataset_id})
    print(f"Cleaned vocab size: {clean_res['cleaned_vocab_size']}")
    
    print("\n3. Vectorizing...")
    vec_res = vectorize_dataset({"dataset_id": dataset_id, "vectorizer_type": "tfidf", "max_features": "500"})
    print(f"Model vocab size: {vec_res['model_vocab_size']}")
    
    print("\n4. Splitting...")
    split_res = split_dataset({"dataset_id": dataset_id, "test_size": 0.2})
    print(f"Train samples: {split_res['train_count']}, Test samples: {split_res['test_count']}")
    
    print("\n5. Training...")
    train_res = prepare_train({"dataset_id": dataset_id, "alpha": 1.0, "model_type": "MultinomialNB"})
    print(f"Train accuracy: {train_res['train_accuracy']:.4f}, Test accuracy: {train_res['test_accuracy']:.4f}")
    
    print("\n6. Checking misclassified samples...")
    mis = train_res["misclassified_samples"]
    print(f"Found {len(mis)} misclassified samples.")
    if len(mis) > 0:
        sample = mis[0]
        print(f"Sample index: {sample['index']}, raw_index: {sample['raw_index']}")
        print(f"True: {sample['true_label']}, Pred: {sample['predicted_label']}")
        print(f"Posterior: {sample['posterior_probs']}")
        print(f"Raw scores: {sample['raw_scores']}")
        print(f"Prior scores: {sample['prior_scores']}")
        print(f"Likelihood scores: {sample['likelihood_scores']}")
        print(f"Support True words (first 2): {sample['support_true_words'][:2]}")
        print(f"Support Pred words (first 2): {sample['support_pred_words'][:2]}")
        print(f"OOV words (first 5): {sample['oov_words'][:5]}")
        print(f"Highlighted tokens count: {len(sample['highlighted_tokens'])}")
    else:
        print("No misclassified samples in this small test run.")

    print("\n7. Predicting custom text...")
    custom_text = "The launch of the spacecraft went into orbit successfully. It was a beautiful rocket space mission."
    pred_res = predict({"dataset_id": dataset_id, "text": custom_text})
    print(f"Predicted class: {pred_res['predicted_label']}")
    print(f"Probabilities: {pred_res['probs']}")
    print(f"Support words by class keys: {list(pred_res['support_words_by_class'].keys())}")
    print(f"Highlighted tokens count: {len(pred_res['highlighted_tokens'])}")
    print("Success!")

if __name__ == "__main__":
    main()
