PANEL = {
    "schema_version": 1,
    "page": "train_eval",
    "title": "模型训练与评估",
    "sections": [
        {
            "id": "dataset",
            "title": "数据集",
            "controls": [
                {"type": "stat", "name": "sample_count", "label": "样本总数", "value_id": "sampleCount"},
                {"type": "stat", "name": "feature_count", "label": "词典大小", "value_id": "featureCount"},
            ],
        },
        {
            "id": "params",
            "title": "训练参数",
            "controls": [
                {
                    "type": "select",
                    "name": "model_type",
                    "label": "算法类型",
                    "element_id": "modelType",
                    "default": "MultinomialNB",
                    "options": [
                        {"label": "多项式贝叶斯 (MultinomialNB)", "value": "MultinomialNB"},
                        {"label": "补集贝叶斯 (ComplementNB)", "value": "ComplementNB"},
                    ],
                },
                {
                    "type": "range",
                    "name": "alpha",
                    "label": "平滑系数 (α)",
                    "element_id": "alpha",
                    "value_id": "alphaText",
                    "min_label": "0.0",
                    "max_label": "10.0",
                    "min": 0.0,
                    "max": 10.0,
                    "step": 0.1,
                    "default": 1.0,
                    "format": "fixed1",
                },
            ],
        },
        {
            "id": "actions",
            "title": "操作",
            "controls": [
                {"type": "action_button", "name": "train", "label": "开始训练", "element_id": "trainBtn", "style": "primary"},
            ],
        },
    ],
}
