import random
import numpy as np
from sklearn.datasets import fetch_20newsgroups
from core.context_store import create_context

# 全局内存缓存，保存当前加载的文本数据集及其元信息
_LOADED_DATASETS = {}

# 高质量本地 Mock 邮件模板，保证在网络不通时能瞬时加载并呈现极具教学意义的文本特征。
MOCK_TEMPLATES = {
    "sci.space": [
        {
            "headers": "From: flight_control@nasa.gov\nSubject: Hubble orbit correction details\nOrganization: NASA Goddard Space Center\n\n",
            "body": "The flight dynamics team completed a small thruster burn to raise the orbit of the space telescope. The new orbital parameters are stable. We expect the satellite to remain in space for another decade.",
            "quotes": "\nIn article <1002@space.org> orbit_watcher wrote:\n> Did the burn use hydrazine fuel or cold gas?",
            "footers": "\n---\nFlight Operations Command\nNASA Goddard Space Flight Center"
        },
        {
            "headers": "From: astronomer@exoplanet.edu\nSubject: New planet orbiting Kepler-186\nOrganization: Dept of Astronomy, University of Science\n\n",
            "body": "We analyzed the transit light curve from Kepler telescope and confirmed a rocky planet orbiting in the habitable zone. The planetary orbit is 130 days. This discovery is a huge step for space search.",
            "quotes": "\n> Is there any spectroscopic data about its atmosphere?",
            "footers": "\n---\nKeep looking at the stars!"
        },
        {
            "headers": "From: rover_driver@jpl.nasa.gov\nSubject: Mars rover solar panel dust storm\nOrganization: NASA Jet Propulsion Laboratory\n\n",
            "body": "A local dust storm on Mars has partially covered the solar array of the rover. Power levels are low but stable. We are waiting for a wind gust to clear the solar cells so we can resume driving on Martian soil.",
            "quotes": "\n> Hopefully the storm doesn't spread globally.",
            "footers": "\n---\nJPL Mars Exploration Team"
        }
    ],
    "rec.autos": [
        {
            "headers": "From: gearhead@performance.com\nSubject: V8 engine swap on Ford Mustang\nOrganization: Muscle Car Enthusiasts\n\n",
            "body": "I am upgrading the cylinder heads on my Ford Mustang's V8 engine. Does anyone recommend high-flow manifolds? I also need to replace the tires and front brake pads to handle the extra horsepower.",
            "quotes": "\nIn article <car98@autos.org> pony_rider wrote:\n> Check the torque specs on the head bolts carefully.",
            "footers": "\n---\n1995 Mustang GT Owner\nSpeed is life."
        },
        {
            "headers": "From: commuter@honda.org\nSubject: Review of new Honda Civic manual transmission\nOrganization: Civic Drivers Association\n\n",
            "body": "I just took delivery of my new Honda Civic hatchback. The manual gearbox feels crisp, the steering is sharp, and the fuel economy is superb. The alloy wheels look great too, right out of the dealership.",
            "quotes": "\n> Did you choose the sport trim or the base model?",
            "footers": "\n---\nCommuter Life"
        },
        {
            "headers": "From: garage_guy@repair.net\nSubject: Replacing brake rotors and warning signs\nOrganization: Local DIY Mechanic\n\n",
            "body": "If you hear squealing when slowing down, inspect your brake pads. Worn pads will score the rotors, making replacements much more expensive. Don't risk driving with bad brakes.",
            "quotes": "\n> Is it easy to replace them at home without a car lift?",
            "footers": "\n---\nGrease Monkey DIY"
        }
    ],
    "rec.sport.baseball": [
        {
            "headers": "From: coach@littleleague.org\nSubject: Pitcher throwing mechanics and speed\nOrganization: Little League Coaches\n\n",
            "body": "We need to focus on leg drive for our starting pitcher. A stable landing foot helps control the fastball and increases velocity. Ensure the glove hand is tucked close to the chest.",
            "quotes": "\nIn article <base20@sport.org> player_parent wrote:\n> How can we improve his curveball spin rate?",
            "footers": "\n---\nBuilding champions one pitch at a time"
        },
        {
            "headers": "From: stat_guru@mlb.net\nSubject: Batting averages and statistics analysis\nOrganization: Sports Stats Group\n\n",
            "body": "The home run leader has maintained a .315 batting average this season. His statistics show a high success rate against left-handed pitchers, driving in over 80 runs so far.",
            "quotes": "\n> Is he likely to win the MVP award this year?",
            "footers": "\n---\nNumbers Don't Lie"
        },
        {
            "headers": "From: glove_maker@leather.com\nSubject: Breaking in a new baseball glove\nOrganization: Pro Glove Craftsmen\n\n",
            "body": "To break in your new baseball glove, apply a small amount of glove oil and play catch daily. Avoid baking it in the oven as it dries out the leather and weakens the stitching.",
            "quotes": "\n> I heard wrapping a ball inside it helps form the pocket.",
            "footers": "\n---\nPro Leather Gear"
        }
    ],
    "sci.med": [
        {
            "headers": "From: neurologist@hospital.org\nSubject: Migraine headache clinical trial updates\nOrganization: Clinical Research Dept\n\n",
            "body": "We completed phase 2 trials of the new peptide inhibitor. Results show a 50 percent reduction in migraine headache frequency compared to placebo, with no major side effects in patients.",
            "quotes": "\nIn article <med90@health.gov> researcher wrote:\n> What was the sample size of the patient cohort?",
            "footers": "\n---\nMedical Center Neurology Team"
        },
        {
            "headers": "From: nutritionist@wellness.edu\nSubject: Vitamin D and calcium absorption study\nOrganization: Nutritional Sciences\n\n",
            "body": "Our research confirms that Vitamin D plays a crucial role in regulating calcium absorption. Patients suffering from bone density loss should monitor their serum Vitamin D levels regularly.",
            "quotes": "\n> Does sunlight exposure provide sufficient dosage?",
            "footers": "\n---\nHealthy Living Alliance"
        },
        {
            "headers": "From: therapist@rehab.com\nSubject: Post-surgery knee rehabilitation exercise\nOrganization: Physical Therapy Clinic\n\n",
            "body": "For patients recovering from knee surgery, early mobility exercises are vital. Quadriceps strengthening helps restore joint stability and allows patients to walk comfortably within weeks.",
            "quotes": "\n> Is a knee brace necessary during these exercises?",
            "footers": "\n---\nRecover & Rebuild Clinic"
        }
    ]
}


def get_mock_newsgroups(categories, remove_opts):
    """
    根据选定的类别和移除降噪配置，生成高质量的 Mock 邮件对象，模拟 fetch_20newsgroups 返回结构
    """
    random.seed(42)  # 保持生成的可重复性
    
    mock_data = []
    mock_target = []
    
    # 每个版块类别模拟生成 150 篇帖子，共计样本数可支持 200, 500, 1000 各种限制
    samples_per_cat = 150
    
    for cat_idx, cat in enumerate(categories):
        templates = MOCK_TEMPLATES.get(cat, [])
        if not templates:
            continue
            
        for i in range(samples_per_cat):
            tmpl = templates[i % len(templates)]
            
            # 根据 remove 选项，决定拼接哪几个部分
            text_parts = []
            if "headers" not in remove_opts:
                text_parts.append(tmpl["headers"])
            if "body" not in remove_opts:
                text_parts.append(tmpl["body"])
            if "quotes" not in remove_opts:
                text_parts.append(tmpl["quotes"])
            if "footers" not in remove_opts:
                text_parts.append(tmpl["footers"])
                
            raw_text = "".join(text_parts)
            
            # 添加少量细微编号差异，使文本看起来像独立真实的文档
            raw_text += f"\n\n[Doc-Ref: NB-{cat.replace('.', '-')}-{i+1:03d}]"
            
            mock_data.append(raw_text)
            mock_target.append(cat_idx)
            
    class MockNewsgroupsObj:
        def __init__(self, data, target, target_names):
            self.data = data
            self.target = np.array(target)
            self.target_names = target_names
            
    return MockNewsgroupsObj(mock_data, mock_target, categories)


def load_dataset(payload: dict) -> dict:
    source = payload.get("source", "twenty_newsgroups")
    categories = payload.get("categories") or ["sci.space", "rec.autos"]
    if len(categories) != 2:
        raise ValueError("当前朴素贝叶斯教学实验仅支持两个类别，请选择两个类别。")
    max_samples = payload.get("max_samples")

    # 样本数量限制转换
    if max_samples == "All" or max_samples is None:
        limit = None
    else:
        try:
            limit = int(max_samples)
        except ValueError:
            limit = 500

    try:
        # 加载完全原始的邮件文本 (不移除任何部分，让学生在第一步预览真实的非结构化数据)
        newsgroups = fetch_20newsgroups(
            subset="train",
            categories=categories,
            remove=(),
            download_if_missing=False
        )
    except Exception:
        # 如果本地没有缓存，使用高质量的 Mock 数据做后备，且不剥离噪声
        newsgroups = get_mock_newsgroups(categories, [])

    texts = newsgroups.data
    labels = newsgroups.target.tolist()
    target_names = newsgroups.target_names

    # 随机选择样本至限制上限
    if limit is not None and len(texts) > limit:
        np.random.seed(42)
        indices = np.random.choice(len(texts), limit, replace=False).tolist()
        texts = [texts[i] for i in indices]
        labels = [labels[i] for i in indices]

    # 计算类别样本分布 (给 ECharts 使用)
    class_counts = {}
    for label in labels:
        name = target_names[label]
        class_counts[name] = class_counts.get(name, 0) + 1

    # 生成展示预览列表 (取前10条进行详情查看)
    preview_items = []
    for idx, (text, label) in enumerate(zip(texts[:10], labels[:10])):
        clean_text = text.replace("\n", " ").strip()
        preview_text = clean_text[:120] + "..." if len(clean_text) > 120 else clean_text
        preview_items.append({
            "id": idx + 1,
            "category": target_names[label],
            "text_preview": preview_text or "(空文本)",
            "full_text": text
        })

    dataset_id = "twenty_newsgroups"

    # 全局缓存
    _LOADED_DATASETS[dataset_id] = {
        "texts": texts,
        "labels": labels,
        "target_names": target_names,
        "categories": categories,
        "preview_items": preview_items,
        "class_counts": class_counts
    }

    # 组装返回给前端的数据包
    return {
        "dataset_id": dataset_id,
        "dataset_kind": "builtin",
        "label": "20 Newsgroups 新闻文本数据集",
        "source_type": "text",
        "row_count": len(texts),
        "columns": ["text", "category"],
        "target": "category",
        "features": ["text"],
        "class_counts": class_counts,
        "preview_columns": ["id", "category", "text_preview"],
        "preview": preview_items,
        "target_names": target_names,
    }


# 内置 Scikit-Learn 的标准英文停用词表，用于离线/免配置的快速过滤教学
ENGLISH_STOP_WORDS = {
    "a", "about", "above", "across", "after", "afterwards", "again", "against", "all", "almost", 
    "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "amoungst", 
    "amount", "an", "and", "another", "any", "anyhow", "anyone", "anything", "anyway", "anywhere", 
    "are", "around", "as", "at", "back", "be", "became", "because", "become", "becomes", 
    "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", 
    "between", "beyond", "bill", "both", "bottom", "but", "by", "call", "can", "cannot", 
    "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", 
    "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven", "else", 
    "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", 
    "everywhere", "except", "few", "fifteen", "fifty", "fill", "find", "fire", "first", 
    "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", 
    "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", 
    "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", 
    "himself", "his", "how", "however", "hundred", "i", "ie", "if", "in", "inc", 
    "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", 
    "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", 
    "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", 
    "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", 
    "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", 
    "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", 
    "otherwise", "our", "ours", "ourselves", "out", "over", "own", "part", "per", "perhaps", 
    "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", 
    "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", 
    "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", 
    "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", 
    "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", 
    "therein", "thereupon", "these", "they", "thick", "thin", "third", "this", "those", 
    "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", 
    "towards", "un", "under", "until", "up", "upon", "us", "very", "via", "was", 
    "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", 
    "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", 
    "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", 
    "will", "with", "within", "without", "would", "yet", "you", "your", "yours", 
    "yourself", "yourselves"
}


def clean_and_tokenize(payload: dict) -> dict:
    import re
    from collections import Counter
    from sklearn.datasets._twenty_newsgroups import (
        strip_newsgroup_header,
        strip_newsgroup_footer,
        strip_newsgroup_quoting
    )

    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")

    ds = _LOADED_DATASETS[dataset_id]
    raw_texts = ds["texts"]
    labels = ds["labels"]
    target_names = ds["target_names"]

    # 读取前端配置的清洗和降噪参数
    remove_headers = payload.get("remove_headers", True)
    remove_footers = payload.get("remove_footers", True)
    remove_quotes = payload.get("remove_quotes", True)
    lowercase = payload.get("lowercase", True)
    remove_stopwords = payload.get("remove_stopwords", True)
    remove_numbers = payload.get("remove_numbers", True)

    cleaned_texts = []
    cleaned_tokens_list = []

    total_raw_word_count = 0
    total_cleaned_word_count = 0
    all_tokens = []

    for raw_text in raw_texts:
        # 使用正则表达式粗估清洗前单词数
        raw_words = re.findall(r'\b\w+\b', raw_text)
        total_raw_word_count += len(raw_words)

        text = raw_text
        # 依次过滤信头、引用、签名
        if remove_headers:
            text = strip_newsgroup_header(text)
        if remove_quotes:
            text = strip_newsgroup_quoting(text)
        if remove_footers:
            text = strip_newsgroup_footer(text)

        # 匹配分词
        if remove_numbers:
            tokens = re.findall(r'\b[a-zA-Z]{2,}\b', text)
        else:
            tokens = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text)

        # 大小写转换
        if lowercase:
            tokens = [t.lower() for t in tokens]

        # 停用词过滤
        if remove_stopwords:
            tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]

        cleaned_texts.append(text)
        cleaned_tokens_list.append(tokens)
        total_cleaned_word_count += len(tokens)
        all_tokens.extend(tokens)

    # 计算清洗指标
    row_count = len(raw_texts)
    avg_raw_words = round(total_raw_word_count / row_count, 1) if row_count > 0 else 0
    avg_cleaned_words = round(total_cleaned_word_count / row_count, 1) if row_count > 0 else 0
    
    vocab = set(all_tokens)
    vocab_size = len(vocab)
    
    # 统计词频 Top 15
    token_counts = Counter(all_tokens)
    top_tokens = [{"word": w, "count": c} for w, c in token_counts.most_common(15)]

    # 制作前10条样本的展示预览，携带管道详细步骤数据，支持前端交互式探针
    preview_items = []
    for idx, (raw_text, label) in enumerate(zip(raw_texts[:10], labels[:10])):
        stages = {
            "0_raw": raw_text
        }
        
        # 逐步去噪声以供探针显示 diff
        headers_removed = strip_newsgroup_header(raw_text)
        stages["1_headers_removed"] = headers_removed
        # 计算 headers_text (信头前缀)
        if raw_text != headers_removed and raw_text.startswith(raw_text[:max(0, len(raw_text)-len(headers_removed))]):
            stages["header_text"] = raw_text[:len(raw_text)-len(headers_removed)]
        else:
            parts = raw_text.split('\n\n', 1)
            stages["header_text"] = parts[0] + '\n\n' if len(parts) > 1 else ""

        # 引用部分
        quotes_removed = strip_newsgroup_quoting(headers_removed)
        stages["2_quotes_removed"] = quotes_removed
        # 记录被删除的引用行
        raw_lines = headers_removed.split('\n')
        quote_lines_set = set(quotes_removed.split('\n'))
        stages["quote_lines"] = [line for line in raw_lines if line not in quote_lines_set]

        # 签名部分
        footers_removed = strip_newsgroup_footer(quotes_removed)
        stages["3_footers_removed"] = footers_removed
        # 计算 footers_text (签名后缀)
        if quotes_removed != footers_removed and quotes_removed.endswith(footers_removed):
            stages["footer_text"] = quotes_removed[len(footers_removed):]
        else:
            stages["footer_text"] = ""

        # 分词与数字过滤 (根据 remove_numbers 配置)
        clean_body = raw_text
        if remove_headers:
            clean_body = strip_newsgroup_header(clean_body)
        if remove_quotes:
            clean_body = strip_newsgroup_quoting(clean_body)
        if remove_footers:
            clean_body = strip_newsgroup_footer(clean_body)

        if remove_numbers:
            tokens_raw = re.findall(r'\b[a-zA-Z]{2,}\b', clean_body)
        else:
            tokens_raw = re.findall(r'\b[a-zA-Z0-9]{2,}\b', clean_body)
        stages["4_tokens_raw"] = tokens_raw

        # 英文小写化
        tokens_lowercase = [t.lower() for t in tokens_raw]
        stages["5_tokens_lowercase"] = tokens_lowercase
        stages["lowercase_diff"] = [t_orig != t_new for t_orig, t_new in zip(tokens_raw, tokens_lowercase)]

        # 过滤停用词
        tokens_no_stopwords = [t for t in tokens_lowercase if t not in ENGLISH_STOP_WORDS]
        stages["6_tokens_no_stopwords"] = tokens_no_stopwords
        stages["stopword_flags"] = [t in ENGLISH_STOP_WORDS for t in tokens_lowercase]

        clean_raw = raw_text.replace("\n", " ").strip()
        raw_preview = clean_raw[:80] + "..." if len(clean_raw) > 80 else clean_raw
        
        # 最终所得 Token
        final_tokens = tokens_no_stopwords if remove_stopwords else tokens_lowercase
        tokens_preview = " ".join(final_tokens[:20]) + ("..." if len(final_tokens) > 20 else "")

        preview_items.append({
            "id": idx + 1,
            "category": target_names[label],
            "raw_text_preview": raw_preview,
            "tokens_preview": tokens_preview or "(清洗后无有效词)",
            "full_raw_text": raw_text,
            "full_cleaned_tokens": " ".join(final_tokens),
            "stages": stages
        })

    # 全局缓存清洗后的结果，供后续的 TF-IDF 向量化步骤读取
    ds["cleaned_texts"] = cleaned_texts
    ds["cleaned_tokens_list"] = cleaned_tokens_list
    ds["vocab"] = list(vocab)
    ds["vocab_size"] = vocab_size
    ds["cleaned_vocab"] = list(vocab)
    ds["cleaned_vocab_size"] = vocab_size
    ds["avg_raw_words"] = avg_raw_words
    ds["avg_cleaned_words"] = avg_cleaned_words
    ds["top_tokens"] = top_tokens
    ds["tokenization_options"] = {
        "remove_headers": remove_headers,
        "remove_footers": remove_footers,
        "remove_quotes": remove_quotes,
        "lowercase": lowercase,
        "remove_stopwords": remove_stopwords,
        "remove_numbers": remove_numbers
    }

    response = {
        "dataset_id": dataset_id,
        "row_count": row_count,
        "vocab_size": vocab_size,
        "cleaned_vocab_size": vocab_size,
        "avg_raw_words": avg_raw_words,
        "avg_cleaned_words": avg_cleaned_words,
        "compression_ratio": round((1 - total_cleaned_word_count / max(total_raw_word_count, 1)) * 100, 1),
        "top_tokens": top_tokens,
        "cleaned_top_tokens": top_tokens,
        "preview": preview_items
    }

    # 创建页面的上下文环境，以便 AI 助手了解实验的进度和数据状态
    context_id = create_context({
        "model": "naive_bayes",
        "page": "preprocess",
        "preprocessStep": "tokenize",
        **response
    })

    return {
        "context_id": context_id,
        **response
    }



def vectorize_dataset(payload: dict) -> dict:
    from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
    import numpy as np

    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")

    ds = _LOADED_DATASETS[dataset_id]
    if "cleaned_texts" not in ds or "cleaned_tokens_list" not in ds:
        raise ValueError("请先完成 [分词清洗] 步骤，再进行 [特征向量化]！")

    vectorizer_type = payload.get("vectorizer_type") or "tfidf"
    max_features = payload.get("max_features")
    if max_features == "All" or max_features is None:
        max_features = None
    else:
        try:
            max_features = int(max_features)
        except ValueError:
            max_features = None

    ngram_min = int(payload.get("ngram_min", 1))
    ngram_max = int(payload.get("ngram_max", 1))
    ngram_range = (ngram_min, ngram_max)
    min_df = int(payload.get("min_df", 2))

    # 用分词清洗后保留的 token 序列重建语料，保证其符合分词清洗阶段的选择
    corpus = [" ".join(tokens) for tokens in ds["cleaned_tokens_list"]]

    # 实例化向量化工具
    if vectorizer_type == "tfidf":
        vectorizer = TfidfVectorizer(
            tokenizer=lambda x: x.split(),
            lowercase=False,
            ngram_range=ngram_range,
            max_features=max_features,
            min_df=min_df,
            token_pattern=None
        )
    else:
        vectorizer = CountVectorizer(
            tokenizer=lambda x: x.split(),
            lowercase=False,
            ngram_range=ngram_range,
            max_features=max_features,
            min_df=min_df,
            token_pattern=None
        )

    # 训练并转化
    X = vectorizer.fit_transform(corpus)

    # 缓存结果
    # 提取特征名
    feature_names = vectorizer.get_feature_names_out().tolist()

    # 缓存结果
    ds["X"] = X
    ds["vectorizer"] = vectorizer
    ds["vectorizer_type"] = vectorizer_type
    ds["model_vocab"] = feature_names
    ds["model_vocab_size"] = len(feature_names)
    ds["vectorize_options"] = {
        "vectorizer_type": vectorizer_type,
        "max_features": max_features,
        "ngram_min": ngram_min,
        "ngram_max": ngram_max,
        "min_df": min_df
    }

    # 统计指标
    rows, cols = X.shape
    nnz = X.nnz
    total_elements = rows * cols
    sparsity = round(100 * (1 - nnz / total_elements), 2) if total_elements > 0 else 0.0
    density = round(100 * (nnz / total_elements), 2) if total_elements > 0 else 0.0

    # 1. 计算每个词的全局文档频率 DF (在多少封邮件里出现过)
    dfs = np.bincount(X.indices, minlength=cols).tolist()

    # 2. 截取前 100 样本 x 前 200 特征 of 子矩阵非零坐标格点，用于稀疏网格散点图
    sub_rows = min(100, rows)
    sub_cols = min(200, cols)
    X_sub = X[:sub_rows, :sub_cols].tocoo()
    matrix_sparse_points = []
    for r, c, val in zip(X_sub.row, X_sub.col, X_sub.data):
        matrix_sparse_points.append([int(r), int(c), round(float(val), 4)])

    # 3. 样本 Top 8 权重词及其推导元数据提取 (针对前10个预览样本)
    preview_features = []
    cleaned_tokens_list = ds["cleaned_tokens_list"]
    from collections import Counter

    for i in range(min(10, rows)):
        row = X[i]
        row_coo = row.tocoo()
        word_weights = []
        
        tokens_in_doc = cleaned_tokens_list[i]
        doc_word_count = len(tokens_in_doc)
        word_counts_in_doc = Counter(tokens_in_doc)
        
        for col_idx, val in zip(row_coo.col, row_coo.data):
            word = feature_names[col_idx]
            tf_in_doc = word_counts_in_doc.get(word, 0)
            df_global = dfs[col_idx]
            
            idf_val = float(vectorizer.idf_[col_idx]) if vectorizer_type == "tfidf" and hasattr(vectorizer, "idf_") else 0.0
            
            if vectorizer_type == "tfidf":
                raw_tf = tf_in_doc / max(1, doc_word_count)
                unnormalized_val = raw_tf * idf_val
            else:
                unnormalized_val = float(tf_in_doc)
                
            word_weights.append({
                "word": word,
                "weight": round(float(val), 4),
                "tf_in_doc": int(tf_in_doc),
                "df_global": int(df_global),
                "idf": round(idf_val, 4),
                "doc_word_count": int(doc_word_count),
                "unnormalized_val": round(unnormalized_val, 4)
            })
            
        word_weights.sort(key=lambda x: x["weight"], reverse=True)
        preview_features.append(word_weights[:8])

    # 提取前15个 IDF (对于 TF-IDF) 或前15个全局词频最高的特征 (对于 Count)
    if vectorizer_type == "tfidf" and hasattr(vectorizer, "idf_"):
        idf_values = vectorizer.idf_.tolist()
        feature_idf = list(zip(feature_names, idf_values))
        feature_idf.sort(key=lambda x: x[1], reverse=True)
        top_15_features = [{"word": w, "value": round(val, 4)} for w, val in feature_idf[:15]]
    else:
        global_counts = np.asarray(X.sum(axis=0)).flatten().tolist()
        feature_counts = list(zip(feature_names, global_counts))
        feature_counts.sort(key=lambda x: x[1], reverse=True)
        top_15_features = [{"word": w, "value": int(val)} for w, val in feature_counts[:15]]

    # 组合预览行的返回结构
    preview_items = []
    target_names = ds["target_names"]
    labels = ds["labels"]
    texts = ds["texts"]
    for idx in range(min(10, len(texts))):
        clean_raw = texts[idx].replace("\n", " ").strip()
        raw_preview = clean_raw[:80] + "..." if len(clean_raw) > 80 else clean_raw
        
        final_tokens = cleaned_tokens_list[idx]
        tokens_preview = " ".join(final_tokens[:20]) + ("..." if len(final_tokens) > 20 else "")
        
        preview_items.append({
            "id": idx + 1,
            "category": target_names[labels[idx]],
            "raw_text_preview": raw_preview,
            "tokens_preview": tokens_preview or "(清洗后无有效词)",
            "features": preview_features[idx] if idx < len(preview_features) else []
        })

    vectorizer_params = {
        "vectorizer_type": vectorizer_type,
        "max_features": max_features if max_features is not None else "无限制",
        "min_df": min_df,
        "max_df": float(payload.get("max_df", 1.0)),
        "ngram_range": [ngram_min, ngram_max]
    }

    response = {
        "dataset_id": dataset_id,
        "rows": rows,
        "cols": cols,
        "nnz": nnz,
        "sparsity": sparsity,
        "density": density,
        "top_15_features": top_15_features,
        "matrix_sparse_points": matrix_sparse_points,  # 星空稀疏点阵数据
        "sub_feature_names": feature_names[:sub_cols],  # 前200列特征对应的具体单词列表
        "preview": preview_items,
        "model_vocab_size": len(feature_names),
        "model_feature_names": feature_names,
        "vectorizer_params": vectorizer_params,
        "cleaned_vocab_size": ds.get("cleaned_vocab_size", 0)
    }

    # 创建会话上下文
    context_id = create_context({
        "model": "naive_bayes",
        "page": "preprocess",
        "preprocessStep": "vectorize",
        **response
    })

    return {
        "context_id": context_id,
        **response
    }



def prepare_data_view(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")

    ds = _LOADED_DATASETS[dataset_id]

    response = {
        "dataset_id": dataset_id,
        "row_count": len(ds["texts"]),
        "class_counts": ds["class_counts"],
        "target_names": ds["target_names"],
        "preview": ds["preview_items"][:10],
    }

    # 创建会话上下文，以便后续页面或 AI 助手查询
    context_id = create_context({
        "model": "naive_bayes",
        "page": "preprocess",
        **response
    })

    return {
        "context_id": context_id,
        **response
    }


def get_word_freq_analysis(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "cleaned_tokens_list" not in ds:
        raise ValueError("请先完成 [分词清洗] 步骤！")
    if "vectorizer" not in ds:
        raise ValueError("请先完成 [特征向量化] 步骤！")

    # 获取参与分析对比的类别 (默认为已载入类别的前两个)
    target_names = ds["target_names"]
    categories = payload.get("categories")
    if not categories or len(categories) < 2:
        categories = target_names[:2]

    # 验证分类名是否存在
    for cat in categories:
        if cat not in target_names:
            raise ValueError(f"类别 {cat} 不存在于数据集中。")

    label_1 = target_names.index(categories[0])
    label_2 = target_names.index(categories[1])

    labels = ds["labels"]
    N1 = labels.count(label_1)
    N2 = labels.count(label_2)
    N = N1 + N2

    # 获取特征词表（对应向量化后保留的所有特征列）
    vocab = ds["vectorizer"].get_feature_names_out().tolist()
    vocab_set = set(vocab)

    from collections import defaultdict
    # 文档频数 (DF) 计数：包含某词的文档数 word -> [count_in_c1, count_in_c2]
    word_doc_counts = defaultdict(lambda: [0, 0])
    # 词频 (TF) 计数：某词在类中出现的总次数 word -> [tf_in_c1, tf_in_c2]
    word_term_freqs = defaultdict(lambda: [0, 0])

    cleaned_tokens_list = ds["cleaned_tokens_list"]
    for i, tokens in enumerate(cleaned_tokens_list):
        lbl = labels[i]
        if lbl == label_1:
            c_idx = 0
        elif lbl == label_2:
            c_idx = 1
        else:
            continue

        for token in tokens:
            word_term_freqs[token][c_idx] += 1
            
        unique_tokens = set(tokens)
        for token in unique_tokens:
            word_doc_counts[token][c_idx] += 1

    # 过滤汇总两类中各自的 Top 15 词频（限制在当前特征词表内）
    c1_words = []
    c2_words = []
    for word in vocab:
        c1_count = word_term_freqs.get(word, [0, 0])[0]
        c1_doc = word_doc_counts.get(word, [0, 0])[0]
        if c1_count > 0:
            c1_words.append({"word": word, "count": c1_count, "doc_count": c1_doc})

        c2_count = word_term_freqs.get(word, [0, 0])[1]
        c2_doc = word_doc_counts.get(word, [0, 0])[1]
        if c2_count > 0:
            c2_words.append({"word": word, "count": c2_count, "doc_count": c2_doc})

    c1_words.sort(key=lambda x: x["count"], reverse=True)
    c2_words.sort(key=lambda x: x["count"], reverse=True)
    top_words_c1 = c1_words[:15]
    top_words_c2 = c2_words[:15]

    # 全局评估：计算词表中所有词的卡方检验值以挑选出黄金区分特征词
    chi_list = []
    for word in vocab:
        A = word_doc_counts.get(word, [0, 0])[0]
        B = word_doc_counts.get(word, [0, 0])[1]
        C = N1 - A
        D = N2 - B
        
        denom = (A + C) * (B + D) * (A + B) * (C + D)
        if denom == 0:
            chi = 0.0
        else:
            chi = N * ((A * D - B * C) ** 2) / denom
            
        chi_list.append({
            "word": word,
            "chi_square": round(chi, 4),
            "A": A,
            "B": B,
            "C": C,
            "D": D
        })
        
    chi_list.sort(key=lambda x: x["chi_square"], reverse=True)
    top_chi_words = chi_list[:15]

    # 目标词卡方信息提取
    target_word = payload.get("target_word")
    if target_word:
        target_word = target_word.strip().lower()
    
    found = False
    if target_word:
        # 尝试从预计算的词表中查出
        for item in chi_list:
            if item["word"] == target_word:
                target_metrics = item
                found = True
                break
        if not found:
            # 不在特征词表中的词，动态在清洗文本中直接计算
            A = 0
            B = 0
            for i, tokens in enumerate(cleaned_tokens_list):
                lbl = labels[i]
                if lbl == label_1:
                    if target_word in tokens:
                        A += 1
                elif lbl == label_2:
                    if target_word in tokens:
                        B += 1
            C = N1 - A
            D = N2 - B
            denom = (A + C) * (B + D) * (A + B) * (C + D)
            chi = 0.0 if denom == 0 else N * ((A * D - B * C) ** 2) / denom
            target_metrics = {
                "word": target_word,
                "chi_square": round(chi, 4),
                "A": A,
                "B": B,
                "C": C,
                "D": D
            }
            found = True
            
    if not found:
        # 默认取卡方排名第一的黄金词
        if top_chi_words:
            target_metrics = top_chi_words[0]
            target_word = target_metrics["word"]
        else:
            target_word = "space"
            target_metrics = {
                "word": target_word,
                "chi_square": 0.0,
                "A": 0, "B": 0, "C": N1, "D": N2
            }

    A = target_metrics["A"]
    B = target_metrics["B"]
    C = target_metrics["C"]
    D = target_metrics["D"]
    chi_val = target_metrics["chi_square"]

    numerator_val = N * ((A * D - B * C) ** 2)
    denom_val = (A + C) * (B + D) * (A + B) * (C + D)

    # 卡方独立性判定结论
    if chi_val >= 6.635:
        significance = "极显著差异（具有极强类别区分度，建议保留为核心特征，p < 0.01）"
        sig_code = "highly_significant"
    elif chi_val >= 3.841:
        significance = "显著差异（具有较强类别区分度，建议保留，p < 0.05）"
        sig_code = "significant"
    else:
        significance = "无显著差异（类别独立无关，区分度微弱，特征过滤中通常会被筛除）"
        sig_code = "not_significant"

    response = {
        "dataset_id": dataset_id,
        "categories": categories,
        "c1_name": categories[0],
        "c2_name": categories[1],
        "c1_doc_total": N1,
        "c2_doc_total": N2,
        "doc_total": N,
        "top_words_c1": top_words_c1,
        "top_words_c2": top_words_c2,
        "top_chi_words": [{"word": x["word"], "chi_square": x["chi_square"]} for x in top_chi_words],
        "target_word": target_word,
        "contingency_table": {
            "A": A,
            "B": B,
            "C": C,
            "D": D,
            "N": N
        },
        "chi_square": chi_val,
        "numerator": int(numerator_val),
        "denominator": int(denom_val),
        "significance": significance,
        "sig_code": sig_code
    }

    context_id = create_context({
        "model": "naive_bayes",
        "page": "preprocess",
        "preprocessStep": "word_freq",
        **response
    })
    
    response["context_id"] = context_id
    return response


def split_dataset(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "X" not in ds:
        raise ValueError("请先完成 [特征向量化] 步骤！")

    test_size = float(payload.get("test_size", 0.2))
    random_state = int(payload.get("random_state", 42))
    stratify = bool(payload.get("stratify", True))

    X = ds["X"]
    labels = ds["labels"]
    
    from sklearn.model_selection import train_test_split
    import numpy as np

    labels_arr = np.array(labels)
    indices = np.arange(X.shape[0])

    train_idx, test_idx = train_test_split(
        indices,
        test_size=test_size,
        random_state=random_state,
        stratify=labels_arr if stratify else None
    )

    # 在全局缓存中保存划分后的矩阵和对应标签列表，供后续训练模块直接读取
    ds["X_train"] = X[train_idx]
    ds["X_test"] = X[test_idx]
    ds["y_train"] = labels_arr[train_idx].tolist()
    ds["y_test"] = labels_arr[test_idx].tolist()
    ds["train_idx"] = train_idx.tolist()
    ds["test_idx"] = test_idx.tolist()

    target_names = ds["target_names"]

    # 统计每个类别在训练集与测试集中的分配分布，用以验证分层比例平衡
    class_distribution = {}
    for i, name in enumerate(target_names):
        train_count = ds["y_train"].count(i)
        test_count = ds["y_test"].count(i)
        class_distribution[name] = {
            "train": train_count,
            "test": test_count,
            "total": labels.count(i)
        }

    # 抽取前 10 个样本的分配指派结果作为直观列表预览
    preview_items = []
    texts = ds["texts"]
    train_idx_set = set(train_idx)
    for idx in range(min(10, len(texts))):
        assignment = "train" if idx in train_idx_set else "test"
        clean_text = texts[idx].replace("\n", " ").strip()
        preview_text = clean_text[:60] + "..." if len(clean_text) > 60 else clean_text
        preview_items.append({
            "id": idx + 1,
            "category": target_names[labels[idx]],
            "assignment": assignment,
            "text_preview": preview_text or "(空文本)"
        })

    response = {
        "dataset_id": dataset_id,
        "train_count": len(train_idx),
        "test_count": len(test_idx),
        "total_count": X.shape[0],
        "train_ratio": round((len(train_idx) / X.shape[0]) * 100, 1),
        "test_ratio": round((len(test_idx) / X.shape[0]) * 100, 1),
        "class_distribution": class_distribution,
        "preview": preview_items,
        "target_names": target_names,
        "random_state": random_state,
        "stratify": stratify
    }

    context_id = create_context({
        "model": "naive_bayes",
        "page": "preprocess",
        "preprocessStep": "split",
        **response
    })

    response["context_id"] = context_id
    return response


# 训练/预测及单词探针接口实现
def prepare_train(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "X_train" not in ds or "X_test" not in ds:
        raise ValueError("请先完成数据预处理的 [划分训练/测试集] 步骤！")
        
    alpha = float(payload.get("alpha", 1.0))
    model_type = payload.get("model_type", "MultinomialNB")
    
    from sklearn.naive_bayes import MultinomialNB, ComplementNB
    from sklearn.metrics import classification_report, accuracy_score
    import numpy as np

    X_train = ds["X_train"]
    X_test = ds["X_test"]
    y_train = np.array(ds["y_train"])
    y_test = np.array(ds["y_test"])
    target_names = ds["target_names"]

    if model_type == "MultinomialNB":
        clf = MultinomialNB(alpha=alpha)
    elif model_type == "ComplementNB":
        clf = ComplementNB(alpha=alpha)
    else:
        raise ValueError(f"不支持的模型类型: {model_type}")

    clf.fit(X_train, y_train)

    y_pred_train = clf.predict(X_train)
    y_pred_test = clf.predict(X_test)

    train_accuracy = float(accuracy_score(y_train, y_pred_train))
    test_accuracy = float(accuracy_score(y_test, y_pred_test))

    report = classification_report(y_test, y_pred_test, target_names=target_names, output_dict=True)

    # 先验概率
    total_samples = float(np.sum(clf.class_count_))
    prior_probs = {}
    for i, name in enumerate(target_names):
        prior_probs[name] = float(clf.class_count_[i] / total_samples)

    # 提取词云图权重
    vectorizer = ds["vectorizer"]
    feature_names = vectorizer.get_feature_names_out().tolist()
    
    negative_idx = 0
    positive_idx = 1
    negative_class = target_names[0]
    positive_class = target_names[1]

    # Mode 1: Class Probability Word Cloud
    class_prob_data = {negative_class: [], positive_class: []}
    for class_idx, class_name in enumerate(target_names):
        log_probs = clf.feature_log_prob_[class_idx]
        if model_type == "ComplementNB":
            weights = np.exp(-log_probs)
        else:
            weights = np.exp(log_probs)
            
        sorted_indices = np.argsort(weights)[::-1]
        max_w = float(weights[sorted_indices[0]]) if len(sorted_indices) > 0 else 1.0
        
        for idx in sorted_indices[:50]:
            raw_w = float(weights[idx])
            score = 12 + 60 * (raw_w / max_w) if max_w > 0 else 12
            score = max(12, min(72, score))
            class_prob_data[class_name].append({
                "word": feature_names[idx],
                "prob": float(np.exp(clf.feature_log_prob_[class_idx][idx])),
                "log_prob": float(clf.feature_log_prob_[class_idx][idx]),
                "score": int(score)
            })

    # Mode 2: Discriminative Feature Word Cloud
    all_deltas = []
    for word_idx in range(len(feature_names)):
        d = float(clf.feature_log_prob_[positive_idx, word_idx] - clf.feature_log_prob_[negative_idx, word_idx])
        all_deltas.append(d)
        
    max_abs_delta = max(abs(d) for d in all_deltas) if len(all_deltas) > 0 else 1.0
    if max_abs_delta == 0:
        max_abs_delta = 1.0
        
    discriminative_pos = []
    discriminative_neg = []
    for word_idx, d in enumerate(all_deltas):
        abs_d = abs(d)
        score = int(12 + 60 * (abs_d / max_abs_delta))
        score = max(12, min(72, score))
        
        prob_neg = float(np.exp(clf.feature_log_prob_[negative_idx, word_idx]))
        prob_pos = float(np.exp(clf.feature_log_prob_[positive_idx, word_idx]))
        log_prob_neg = float(clf.feature_log_prob_[negative_idx, word_idx])
        log_prob_pos = float(clf.feature_log_prob_[positive_idx, word_idx])
        
        item = {
            "word": feature_names[word_idx],
            "delta": d,
            "abs_delta": abs_d,
            "prob_negative": prob_neg,
            "prob_positive": prob_pos,
            "log_prob_negative": log_prob_neg,
            "log_prob_positive": log_prob_pos,
            "support_class": positive_class if d > 0 else negative_class,
            "score": score
        }
        if d > 0:
            discriminative_pos.append(item)
        else:
            discriminative_neg.append(item)
            
    # Sort positive class by delta descending, negative class by delta ascending
    discriminative_pos.sort(key=lambda x: x["delta"], reverse=True)
    discriminative_neg.sort(key=lambda x: x["delta"])
    
    word_cloud_modes = {
        "class_probability": class_prob_data,
        "discriminative": {
            negative_class: discriminative_neg[:50],
            positive_class: discriminative_pos[:50]
        }
    }

    # Compatibility with older top_words_per_class
    top_words_per_class = {}
    for class_name in target_names:
        top_words_per_class[class_name] = [
            {
                "word": item["word"],
                "prob": item["prob"],
                "score": item["score"]
            }
            for item in class_prob_data[class_name]
        ]

    # 缓存模型和词云数据
    ds["nb_model"] = clf
    ds["top_words_per_class"] = top_words_per_class
    ds["word_cloud_modes"] = word_cloud_modes
    ds["model_type"] = model_type
    ds["alpha"] = alpha

    # 包装 class_report
    class_report_clean = {}
    for name in target_names:
        if name in report:
            class_report_clean[name] = {
                "precision": float(report[name]["precision"]),
                "recall": float(report[name]["recall"]),
                "f1": float(report[name]["f1-score"]),
                "support": int(report[name]["support"])
            }

    # 计算混淆矩阵与搜集错题样本
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y_test, y_pred_test)
    confusion_matrix_list = cm.tolist()

    misclassified_indices = np.where(y_pred_test != y_test)[0]
    misclassified_samples = []
    for idx in misclassified_indices[:5]:
        raw_idx = ds["test_idx"][idx]
        raw_text = ds["texts"][raw_idx]
        x_sample = X_test[idx]
        true_class_idx = int(y_test[idx])
        
        explanation = explain_sample(ds, x_sample, raw_text, true_class=true_class_idx)
        
        body_text = explanation.get("clean_body", raw_text)
        if not body_text.strip():
            body_text = raw_text
        clean_text = body_text.replace("\n", " ").strip()
        text_preview = clean_text[:120] + "..." if len(clean_text) > 120 else clean_text
        misclassified_samples.append({
            "index": int(idx),
            "raw_index": int(raw_idx),
            "true_label": target_names[true_class_idx],
            "predicted_label": explanation["predicted_label"],
            "preview": text_preview,
            "full_text": raw_text,
            "posterior_probs": explanation["posterior_probs"],
            "raw_scores": explanation["raw_scores"],
            "prior_scores": explanation["prior_scores"],
            "likelihood_scores": explanation["likelihood_scores"],
            "support_true_words": explanation["support_words_by_class"].get(target_names[true_class_idx], []),
            "support_pred_words": explanation["support_words_by_class"].get(explanation["predicted_label"], []),
            "oov_words": explanation["oov_words"],
            "highlighted_tokens": explanation["highlighted_tokens"]
        })

    # 计算测试集概率，用于模型评估页面在前端调整阈值并绘制 ROC/PR 曲线
    try:
        y_prob_test = clf.predict_proba(X_test)[:, 1].tolist()
    except Exception:
        y_prob_test = [0.5] * len(y_test)
        
    eval_samples = []
    for y_t, p_val, y_pred in zip(y_test.tolist(), y_prob_test, y_pred_test.tolist()):
        eval_samples.append({
            "true_label": int(y_t),
            "true_class": target_names[int(y_t)],
            "prob_positive": float(p_val),
            "predicted_label": int(y_pred),
            "predicted_class": target_names[int(y_pred)]
        })

    response = {
        "dataset_id": dataset_id,
        "train_accuracy": train_accuracy,
        "test_accuracy": test_accuracy,
        "train_count": int(X_train.shape[0]),
        "test_count": int(X_test.shape[0]),
        "n_features": int(X_train.shape[1]),
        "n_classes": len(target_names),
        "model_type": model_type,
        "alpha": alpha,
        "prior_probs": prior_probs,
        "class_report": class_report_clean,
        "confusion_matrix": confusion_matrix_list,
        "misclassified_samples": misclassified_samples,
        "top_words_per_class": top_words_per_class,
        "word_cloud_modes": word_cloud_modes,
        "target_names": target_names,
        "positive_class": positive_class,
        "negative_class": negative_class,
        "positive_label_index": 1,
        "positive_label_name": positive_class,
        "eval_samples": eval_samples
    }

    # 创建会话上下文
    context_id = create_context({
        "model": "naive_bayes",
        "page": "train_eval",
        "trainStep": "nb_train",
        **response
    })
    
    response["context_id"] = context_id
    return response


def infer_oov_reason(raw_word, normalized_word, ds, vectorizer):
    if not raw_word or not normalized_word:
        return "empty", "请输入需要查询的单词。"
    if normalized_word in ENGLISH_STOP_WORDS:
        return "stopword", "该词属于停用词，已在预处理阶段被过滤，模型推理时会忽略该词。"
    if len(normalized_word) < 2:
        return "too_short", "该词长度过短，已被 token 规则过滤，模型推理时会忽略该词。"
    cleaned_vocab = set(ds.get("cleaned_vocab", []))
    model_vocab = set(ds.get("model_vocab", []))
    if normalized_word not in model_vocab:
        if normalized_word in cleaned_vocab:
            return "filtered_by_vectorizer", "该词出现在清洗后词表中，但经过 min_df、max_df 或 max_features 筛选后未进入模型词表。模型推理时会忽略该词。"
        else:
            return "not_seen_in_training", "该词未出现在训练语料的清洗后词表中，模型无法为它计算条件概率。"
    return "unknown", "该词未进入模型词表，模型推理时会忽略该词。"


def get_word_prob(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "nb_model" not in ds:
        raise ValueError("模型尚未训练完成，请先进行模型训练。")
        
    clf = ds["nb_model"]
    vectorizer = ds["vectorizer"]
    target_names = ds["target_names"]
    
    raw_word = payload.get("word", "").strip()
    normalized_word = raw_word.lower()
    
    vocab = vectorizer.vocabulary_
    
    # OOV 防护与停用词防护
    if not normalized_word or normalized_word not in vocab:
        oov_reason, message = infer_oov_reason(raw_word, normalized_word, ds, vectorizer)
        return {
            "word": raw_word,
            "normalized_word": normalized_word,
            "in_vocabulary": False,
            "is_unseen": True,
            "oov_reason": oov_reason,
            "message": message,
            "probs": {},
            "log_probs": {},
            "model_log_probs": {},
            "discriminative_score": 0.0,
            "supported_class": "无",
            "negative_class": target_names[0],
            "positive_class": target_names[1] if len(target_names) > 1 else target_names[0],
        }
        
    idx = vocab[normalized_word]
    probs = {}
    log_probs = {}
    model_log_probs = {}
    
    import numpy as np
    n_features = clf.feature_count_.shape[1]
    alpha_val = float(clf.alpha)
    
    for class_idx, name in enumerate(target_names):
        # 实际训练集中的词频条件概率
        count_c_w = clf.feature_count_[class_idx, idx]
        count_c = clf.feature_count_[class_idx].sum()
        p_w_c = (count_c_w + alpha_val) / (count_c + alpha_val * n_features)
        
        probs[name] = float(p_w_c)
        log_probs[name] = float(np.log(p_w_c))
        # 模型的参数
        model_log_probs[name] = float(clf.feature_log_prob_[class_idx, idx])
        
    negative_class = target_names[0]
    positive_class = target_names[1]
    delta = log_probs[positive_class] - log_probs[negative_class]
    
    if abs(delta) < 0.1:
        supported_class = "区分能力较弱"
    elif delta > 0:
        supported_class = positive_class
    else:
        supported_class = negative_class
        
    return {
        "word": raw_word,
        "normalized_word": normalized_word,
        "in_vocabulary": True,
        "is_unseen": False,
        "oov_reason": None,
        "message": "该词已进入模型词表，可参与朴素贝叶斯分类计算。",
        "probs": probs,
        "log_probs": log_probs,
        "model_log_probs": model_log_probs,
        "discriminative_score": delta,
        "supported_class": supported_class,
        "negative_class": negative_class,
        "positive_class": positive_class
    }


def analyze_words_in_text(raw_text, ds):
    import re
    from sklearn.datasets._twenty_newsgroups import (
        strip_newsgroup_header,
        strip_newsgroup_footer,
        strip_newsgroup_quoting
    )
    
    opts = ds.get("tokenization_options", {})
    remove_headers = opts.get("remove_headers", True)
    remove_quotes = opts.get("remove_quotes", True)
    remove_footers = opts.get("remove_footers", True)
    remove_numbers = opts.get("remove_numbers", True)
    lowercase = opts.get("lowercase", True)
    remove_stopwords = opts.get("remove_stopwords", True)
    
    def _safe_strip_text(value, strip_func):
        stripped = strip_func(value)
        return stripped if stripped.strip() else value

    text = raw_text
    if remove_headers:
        text = _safe_strip_text(text, strip_newsgroup_header)
    if remove_quotes:
        text = _safe_strip_text(text, strip_newsgroup_quoting)
    if remove_footers:
        text = _safe_strip_text(text, strip_newsgroup_footer)
        
    # We find all alphanumeric tokens
    raw_tokens = re.findall(r'\b\w+\b', text)
    
    valid_words = set()
    oov_words = set()
    filtered_words = []
    
    vectorizer = ds.get("vectorizer")
    model_vocab = set(ds.get("model_vocab", []))
    if vectorizer and hasattr(vectorizer, "vocabulary_"):
        model_vocab = set(vectorizer.vocabulary_.keys())
        
    cleaned_vocab = set(ds.get("cleaned_vocab", []))
    
    processed_words = set()
    
    for token in raw_tokens:
        if not token:
            continue
        orig_token = token
        norm_token = token.lower() if lowercase else token
        
        if orig_token in processed_words:
            continue
        processed_words.add(orig_token)
        
        # 1. Check if it is filtered as a number
        if remove_numbers:
            if not orig_token.isalpha():
                filtered_words.append({"word": orig_token, "reason": "number"})
                continue
        else:
            if not orig_token.isalnum():
                filtered_words.append({"word": orig_token, "reason": "special_character"})
                continue
                
        # 2. Check if too short
        if len(norm_token) < 2:
            filtered_words.append({"word": orig_token, "reason": "too_short"})
            continue
            
        # 3. Check if stopword
        if remove_stopwords and norm_token.lower() in ENGLISH_STOP_WORDS:
            filtered_words.append({"word": orig_token, "reason": "stopword"})
            continue
            
        # 4. It is a cleaned word. Now check if it's in the model vocab.
        if norm_token.lower() in model_vocab:
            valid_words.add(norm_token.lower())
        else:
            oov_words.add(norm_token.lower())
            
    return list(valid_words), list(oov_words), filtered_words


def explain_sample(ds, x_sample, raw_text, true_class=None):
    clf = ds["nb_model"]
    vectorizer = ds["vectorizer"]
    target_names = ds["target_names"]
    model_type = ds["model_type"]
    vecOptions = ds.get("vectorize_options", {})
    opts = ds.get("tokenization_options", {})
    
    import numpy as np
    import re
    from collections import Counter
    
    # Get true_label as string
    true_label = None
    if true_class is not None:
        if isinstance(true_class, int):
            true_label = target_names[true_class]
        else:
            true_label = str(true_class)
            
    # Algorithm prediction
    pred_class = int(clf.predict(x_sample)[0])
    predicted_label = target_names[pred_class]
    
    # Get joint log likelihood
    if hasattr(clf, "_joint_log_likelihood"):
        jll = clf._joint_log_likelihood(x_sample)[0]
    else:
        if model_type == "MultinomialNB":
            jll = (x_sample * clf.feature_log_prob_.T).toarray()[0] + clf.class_log_prior_
        else:
            jll = -(x_sample * clf.feature_log_prob_.T).toarray()[0]
            
    prior_scores = {}
    likelihood_scores = {}
    raw_scores = {}
    total_samples = float(np.sum(clf.class_count_))
    
    for class_idx, name in enumerate(target_names):
        log_prior = float(np.log(clf.class_count_[class_idx] / total_samples))
        prior_scores[name] = log_prior
        
        if model_type == "MultinomialNB":
            log_like = float(x_sample.dot(clf.feature_log_prob_[class_idx])[0])
        else:
            log_like = float(-x_sample.dot(clf.feature_log_prob_[class_idx])[0])
            
        likelihood_scores[name] = log_like
        raw_scores[name] = float(jll[class_idx])
        
    cleaned_scores = []
    for name in target_names:
        s = raw_scores[name]
        if np.isnan(s) or np.isneginf(s):
            cleaned_scores.append(-9999.0)
        else:
            cleaned_scores.append(s)
            
    max_score = max(cleaned_scores)
    exp_scores = [np.exp(s - max_score) for s in cleaned_scores]
    sum_exp = sum(exp_scores)
    
    posterior_probs = {}
    for class_idx, name in enumerate(target_names):
        posterior_probs[name] = float(exp_scores[class_idx] / sum_exp) if sum_exp > 0 else 1.0 / len(target_names)
        
    # Analyze word breakdown
    valid_words, oov_words_list, filtered_words = analyze_words_in_text(raw_text, ds)
    
    # Count frequency of each word in preprocessed text
    remove_headers = opts.get("remove_headers", True)
    remove_quotes = opts.get("remove_quotes", True)
    remove_footers = opts.get("remove_footers", True)
    remove_numbers = opts.get("remove_numbers", True)
    lowercase = opts.get("lowercase", True)
    remove_stopwords = opts.get("remove_stopwords", True)
    
    from sklearn.datasets._twenty_newsgroups import (
        strip_newsgroup_header,
        strip_newsgroup_footer,
        strip_newsgroup_quoting
    )
    
    def _safe_strip_text(value, strip_func):
        stripped = strip_func(value)
        return stripped if stripped.strip() else value

    clean_body = raw_text
    if remove_headers:
        clean_body = _safe_strip_text(clean_body, strip_newsgroup_header)
    if remove_quotes:
        clean_body = _safe_strip_text(clean_body, strip_newsgroup_quoting)
    if remove_footers:
        clean_body = _safe_strip_text(clean_body, strip_newsgroup_footer)

    if remove_numbers:
        tokens_raw = re.findall(r'\b[a-zA-Z]{2,}\b', clean_body)
    else:
        tokens_raw = re.findall(r'\b[a-zA-Z0-9]{2,}\b', clean_body)

    if lowercase:
        tokens_lowercase = [t.lower() for t in tokens_raw]
    else:
        tokens_lowercase = tokens_raw

    if remove_stopwords:
        tokens_final = [t for t in tokens_lowercase if t not in ENGLISH_STOP_WORDS]
    else:
        tokens_final = tokens_lowercase
        
    word_counts_in_doc = Counter(tokens_final)
    
    x_coo = x_sample.tocoo()
    feature_names = vectorizer.get_feature_names_out().tolist()
    word_contributions = []
    
    negative_class = target_names[0]
    positive_class = target_names[1]
    
    for col_idx, val in zip(x_coo.col, x_coo.data):
        word = feature_names[col_idx]
        tf_in_doc = word_counts_in_doc.get(word, 0)
        
        log_prob_neg = float(clf.feature_log_prob_[0, col_idx])
        log_prob_pos = float(clf.feature_log_prob_[1, col_idx])
        delta = log_prob_pos - log_prob_neg
        abs_delta = abs(delta)
        
        contribs = {}
        w_probs = {}
        for class_idx, name in enumerate(target_names):
            if model_type == "MultinomialNB":
                contribs[name] = float(val * clf.feature_log_prob_[class_idx, col_idx])
            else:
                contribs[name] = float(-val * clf.feature_log_prob_[class_idx, col_idx])
            w_probs[name] = float(np.exp(clf.feature_log_prob_[class_idx, col_idx]))
            
        contrib_item = {
            "word": word,
            "tf": int(tf_in_doc),
            "feature_value": float(val),
            "log_prob_negative": log_prob_neg,
            "log_prob_positive": log_prob_pos,
            "delta": delta,
            "abs_delta": abs_delta,
            "support_class": positive_class if delta >= 0.1 else (negative_class if delta <= -0.1 else "区分能力较弱"),
            "contributions": contribs,
            "probs": w_probs
        }
        word_contributions.append(contrib_item)
        
    # Sort contributions by the difference between predicted class and other
    for item in word_contributions:
        contribs = item["contributions"]
        other_contribs = [contribs[n] for n in target_names if n != predicted_label]
        max_other = max(other_contribs) if other_contribs else 0.0
        item["diff"] = contribs[predicted_label] - max_other
        
    word_contributions.sort(key=lambda x: x["diff"], reverse=True)
    
    # Group by class
    pos_list = []
    neg_list = []
    for item in word_contributions:
        delta = item["delta"]
        # Simplified representation for support_words_by_class
        simplified = {
            "word": item["word"],
            "tf": item["tf"],
            "feature_value": item["feature_value"],
            "log_prob_negative": item["log_prob_negative"],
            "log_prob_positive": item["log_prob_positive"],
            "delta": delta,
            "abs_delta": item["abs_delta"],
            "support_class": item["support_class"]
        }
        if delta > 0:
            pos_list.append(simplified)
        elif delta < 0:
            neg_list.append(simplified)
        else:
            neg_list.append(simplified)
            
    pos_list.sort(key=lambda x: x["abs_delta"], reverse=True)
    neg_list.sort(key=lambda x: x["abs_delta"], reverse=True)
    
    support_words_by_class = {
        positive_class: pos_list[:10],
        negative_class: neg_list[:10]
    }
    
    # Build highlighted_tokens
    highlighted_tokens = []
    participated_words = {feature_names[col_idx]: col_idx for col_idx in x_coo.col}
    word_contrib_lookup = {w["word"]: w for w in word_contributions}
    
    for m in re.finditer(r'\b[a-zA-Z0-9]+\b', raw_text):
        word = m.group()
        norm = word.lower()
        start = m.start()
        end = m.end()
        
        if norm in participated_words:
            contrib_info = word_contrib_lookup[norm]
            highlighted_tokens.append({
                "token": word,
                "start": start,
                "end": end,
                "status": "valid",
                "support_class": contrib_info["support_class"],
                "delta": contrib_info["delta"],
                "abs_delta": contrib_info["abs_delta"],
                "log_prob_negative": contrib_info["log_prob_negative"],
                "log_prob_positive": contrib_info["log_prob_positive"]
            })
        else:
            if norm in ENGLISH_STOP_WORDS:
                continue
            if len(norm) < 2:
                continue
            if opts.get("remove_numbers", True) and not word.isalpha():
                continue
                
            if norm in vectorizer.vocabulary_:
                continue
            else:
                oov_reason, oov_msg = infer_oov_reason(word, norm, ds, vectorizer)
                highlighted_tokens.append({
                    "token": word,
                    "start": start,
                    "end": end,
                    "status": "oov",
                    "reason": oov_reason,
                    "message": oov_msg
                })
                
    return {
        "predicted_label": predicted_label,
        "posterior_probs": posterior_probs,
        "raw_scores": raw_scores,
        "prior_scores": prior_scores,
        "likelihood_scores": likelihood_scores,
        "word_contributions": word_contributions,
        "support_words_by_class": support_words_by_class,
        "highlighted_tokens": highlighted_tokens,
        "oov_words": oov_words_list,
        "valid_words": valid_words,
        "filtered_words": filtered_words,
        "true_label": true_label,
        "clean_body": clean_body
    }


def predict(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("数据集尚未加载，请先加载数据集。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "nb_model" not in ds:
        raise ValueError("模型尚未训练完成，请先在模型训练页面训练模型。")
        
    clf = ds["nb_model"]
    vectorizer = ds["vectorizer"]
    X_test = ds.get("X_test")
    y_test = ds.get("y_test")
    target_names = ds["target_names"]
    
    import random
    import numpy as np

    test_count = len(y_test) if y_test is not None else 0
    custom_text = payload.get("text")
    is_custom = custom_text is not None

    if is_custom:
        import re
        from sklearn.datasets._twenty_newsgroups import (
            strip_newsgroup_header,
            strip_newsgroup_footer,
            strip_newsgroup_quoting
        )
        opts = ds.get("tokenization_options", {})
        
        def _safe_strip_text(value, strip_func):
            stripped = strip_func(value)
            return stripped if stripped.strip() else value

        text = custom_text
        if opts.get("remove_headers", True):
            text = _safe_strip_text(text, strip_newsgroup_header)
        if opts.get("remove_quotes", True):
            text = _safe_strip_text(text, strip_newsgroup_quoting)
        if opts.get("remove_footers", True):
            text = _safe_strip_text(text, strip_newsgroup_footer)

        if opts.get("remove_numbers", True):
            tokens = re.findall(r'\b[a-zA-Z]{2,}\b', text)
        else:
            tokens = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text)

        if opts.get("lowercase", True):
            tokens = [t.lower() for t in tokens]

        if opts.get("remove_stopwords", True):
            tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]
            
        clean_text_joined = " ".join(tokens)
        x_sample = vectorizer.transform([clean_text_joined])[0]
        raw_text = custom_text
        true_class = None
        idx_in_test = None
    else:
        if test_count == 0:
            raise ValueError("测试集为空，无法进行预测。")
            
        # 获取样本索引
        sample_index = payload.get("sample_index")
        if sample_index is None:
            idx_in_test = random.randint(0, test_count - 1)
        else:
            try:
                idx_in_test = int(sample_index) % test_count
            except ValueError:
                idx_in_test = random.randint(0, test_count - 1)
                
        # 查找原始文本
        raw_idx = ds["test_idx"][idx_in_test]
        raw_text = ds["texts"][raw_idx]
        true_class = y_test[idx_in_test]
        
        x_sample = X_test[idx_in_test]
        
    explanation = explain_sample(ds, x_sample, raw_text, true_class=true_class)
    
    top_words_clean = []
    for w in explanation["word_contributions"]:
        top_words_clean.append({
            "word": w["word"],
            "tf": int(w["tf"]),
            "val": float(w["feature_value"]),
            "contributions": w["contributions"],
            "probs": w["probs"],
            "diff": float(w["diff"])
        })
        
    body_text = explanation.get("clean_body", raw_text)
    if not body_text.strip():
        body_text = raw_text
    clean_text = body_text.replace("\n", " ").strip()
    text_preview = clean_text[:400] + "..." if len(clean_text) > 400 else clean_text
    
    return {
        "sample_index": idx_in_test,
        "total_samples": test_count,
        "text_preview": text_preview,
        "full_text": raw_text,
        "true_label": explanation.get("true_label"),
        "predicted_label": explanation["predicted_label"],
        "correct": bool(explanation.get("true_label") == explanation["predicted_label"]) if explanation.get("true_label") is not None else None,
        "raw_scores": explanation["raw_scores"],
        "probs": explanation["posterior_probs"],
        "prior_scores": explanation["prior_scores"],
        "likelihood_scores": explanation["likelihood_scores"],
        "top_words": top_words_clean,
        "support_words_by_class": explanation["support_words_by_class"],
        "highlighted_tokens": explanation["highlighted_tokens"],
        "is_custom": is_custom,
        "oov_words": explanation["oov_words"],
        "valid_words": explanation["valid_words"],
        "filtered_words": explanation["filtered_words"]
    }


def predict_without_word(payload: dict) -> dict:
    dataset_id = payload.get("dataset_id") or "twenty_newsgroups"
    if dataset_id not in _LOADED_DATASETS:
        raise ValueError("模型尚未训练，请先完成模型训练。")
        
    ds = _LOADED_DATASETS[dataset_id]
    if "nb_model" not in ds:
        raise ValueError("模型尚未训练，请先完成模型训练。")
        
    clf = ds["nb_model"]
    vectorizer = ds["vectorizer"]
    X_test = ds.get("X_test")
    y_test = ds.get("y_test")
    target_names = ds["target_names"]

    custom_text = payload.get("text")
    sample_index = payload.get("sample_index")
    is_custom = custom_text is not None
    
    if is_custom:
        raw_text = custom_text
        true_class = None
    else:
        if sample_index is None:
            raise ValueError("请先选择或输入一个文本样本。")
        test_count = len(y_test) if y_test is not None else 0
        if test_count == 0:
            raise ValueError("测试集为空，无法进行预测。")
        try:
            idx_in_test = int(sample_index) % test_count
        except ValueError:
            raise ValueError("请先选择或输入一个文本样本。")
            
        raw_idx = ds["test_idx"][idx_in_test]
        raw_text = ds["texts"][raw_idx]
        true_class = y_test[idx_in_test]

    removed_word = payload.get("removed_word", "").strip().lower()
    if not removed_word:
        raise ValueError("请选择需要移除的关键词。")

    opts = ds.get("tokenization_options", {})
    remove_headers = opts.get("remove_headers", True)
    remove_quotes = opts.get("remove_quotes", True)
    remove_footers = opts.get("remove_footers", True)
    remove_numbers = opts.get("remove_numbers", True)
    lowercase = opts.get("lowercase", True)
    remove_stopwords = opts.get("remove_stopwords", True)
    
    import re
    from sklearn.datasets._twenty_newsgroups import (
        strip_newsgroup_header,
        strip_newsgroup_footer,
        strip_newsgroup_quoting
    )
    
    def _safe_strip_text(value, strip_func):
        stripped = strip_func(value)
        return stripped if stripped.strip() else value

    text = raw_text
    if remove_headers:
        text = _safe_strip_text(text, strip_newsgroup_header)
    if remove_quotes:
        text = _safe_strip_text(text, strip_newsgroup_quoting)
    if remove_footers:
        text = _safe_strip_text(text, strip_newsgroup_footer)

    # 1. 检查移除词是否在当前文本中
    words_in_text = re.findall(r'\b\w+\b', text)
    words_in_text_lower = [w.lower() for w in words_in_text]
    
    if removed_word not in words_in_text_lower:
        raise ValueError("当前文本中未找到该词，无法执行移除后重算。")

    # 2. 检查是否在模型词表中
    vocab = vectorizer.vocabulary_
    if removed_word not in vocab:
        raise ValueError("该词未进入模型词表，原本就未参与预测计算，移除后不会影响预测结果。")

    # 提取分词列表
    if remove_numbers:
        tokens_raw = re.findall(r'\b[a-zA-Z]{2,}\b', text)
    else:
        tokens_raw = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text)

    if lowercase:
        tokens_lowercase = [t.lower() for t in tokens_raw]
    else:
        tokens_lowercase = tokens_raw

    if remove_stopwords:
        tokens_final = [t for t in tokens_lowercase if t not in ENGLISH_STOP_WORDS]
    else:
        tokens_final = tokens_lowercase

    # 计算移除词的数量
    removed_count = tokens_final.count(removed_word)

    # 3. 检查移除该词后是否仍有有效词
    tokens_after = [t for t in tokens_final if t != removed_word]
    valid_after = [t for t in tokens_after if t in vocab]
    if not valid_after:
        raise ValueError("移除该词后，当前文本没有有效词进入模型词表，模型无法基于文本内容形成稳定判断。")

    # 原预测
    clean_text_orig = " ".join(tokens_final)
    x_orig = vectorizer.transform([clean_text_orig])[0]
    orig_explain = explain_sample(ds, x_orig, raw_text, true_class=true_class)

    # 移除后预测
    clean_text_after = " ".join(tokens_after)
    x_after = vectorizer.transform([clean_text_after])[0]
    after_explain = explain_sample(ds, x_after, raw_text, true_class=true_class)

    # 计算概率和对数得分变化
    probability_change = {}
    score_change = {}
    for name in target_names:
        probability_change[name] = float(after_explain["posterior_probs"][name] - orig_explain["posterior_probs"][name])
        score_change[name] = float(after_explain["raw_scores"][name] - orig_explain["raw_scores"][name])

    prediction_changed = bool(after_explain["predicted_label"] != orig_explain["predicted_label"])

    if prediction_changed:
        message = f"移除 {removed_word} 后，预测类别由 {orig_explain['predicted_label']} 变为 {after_explain['predicted_label']}。"
    else:
        message = f"移除 {removed_word} 后，预测类别仍为 {orig_explain['predicted_label']}。"

    return {
        "removed_word": removed_word,
        "removed_count": removed_count,
        "word_found": True,
        "original": {
            "predicted_label": orig_explain["predicted_label"],
            "posterior_probs": orig_explain["posterior_probs"],
            "raw_scores": orig_explain["raw_scores"],
            "support_words_by_class": orig_explain["support_words_by_class"]
        },
        "after_removal": {
            "predicted_label": after_explain["predicted_label"],
            "posterior_probs": after_explain["posterior_probs"],
            "raw_scores": after_explain["raw_scores"],
            "support_words_by_class": after_explain["support_words_by_class"]
        },
        "probability_change": probability_change,
        "score_change": score_change,
        "prediction_changed": prediction_changed,
        "message": message
    }


JSON_ACTIONS = {
    "load_dataset": load_dataset,
    "clean_and_tokenize": clean_and_tokenize,
    "vectorize_dataset": vectorize_dataset,
    "get_word_freq_analysis": get_word_freq_analysis,
    "split_dataset": split_dataset,
    "data_view": prepare_data_view,
    "prepare_train": prepare_train,
    "train_prepare": prepare_train,
    "get_word_prob": get_word_prob,
    "predict": predict,
    "predict_without_word": predict_without_word,
}
