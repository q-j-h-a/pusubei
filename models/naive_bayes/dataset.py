def get_dataset_profile() -> dict:
    return {
        "id": "twenty_newsgroups",
        "name": "20 Newsgroups",
        "default_variant": "train",
        "variants": [
            {
                "id": "train",
                "label": "Training subset",
                "kind": "text_train",
                "preprocessed": False,
            }
        ],
        "columns": [
            {
                "name": "text",
                "type": "text",
                "role": "feature",
                "description": "原始新闻邮件文本内容",
            },
            {
                "name": "category",
                "type": "category",
                "role": "target",
                "description": "新闻所属的分类版块标签",
            }
        ],
        "default_features": ["text"],
        "default_target": "category",
        "preview_policy": {
            "mode": "full",
            "preview_rows": 100,
            "chart_sample_rows": 1000,
            "full_data_to_frontend": False,
        },
    }
