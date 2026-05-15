# MeloTTS 本地语音服务

这个服务用于给 AI 助教提供真正离线的中文朗读。主项目不直接加载 MeloTTS 模型，只调用本机 HTTP 服务。

## 本机文件位置

本项目自己的 MeloTTS 服务代码：

```text
/Users/d1a0y1bb/Documents/TempProjects/Linear-Regression_Boston-Housing-Dataset/tools/melotts_service.py
```

服务说明和依赖文件：

```text
/Users/d1a0y1bb/Documents/TempProjects/Linear-Regression_Boston-Housing-Dataset/tools/README_melotts.md
/Users/d1a0y1bb/Documents/TempProjects/Linear-Regression_Boston-Housing-Dataset/tools/requirements-melotts-service.txt
```

MeloTTS Python 包安装在项目独立虚拟环境里：

```text
/Users/d1a0y1bb/Documents/TempProjects/Linear-Regression_Boston-Housing-Dataset/.venv-melotts/
/Users/d1a0y1bb/Documents/TempProjects/Linear-Regression_Boston-Housing-Dataset/.venv-melotts/lib/python3.11/site-packages/melo/
```

`.venv-melotts` 已经写进 `.gitignore`，不会提交到仓库。

当前中文模型缓存位置：

```text
/Users/d1a0y1bb/.cache/huggingface/hub/models--myshell-ai--MeloTTS-Chinese/
/Users/d1a0y1bb/.cache/huggingface/hub/models--myshell-ai--MeloTTS-Chinese/snapshots/af5d207a364ea4208c6f589c89f57f88414bdd16/
```

这个目录里主要有：

```text
config.json
checkpoint.pth
```

中文合成时还会用到 BERT 相关缓存：

```text
/Users/d1a0y1bb/.cache/huggingface/hub/models--bert-base-multilingual-uncased/
```

当前运行命令：

```bash
.venv-melotts/bin/uvicorn tools.melotts_service:app --host 0.0.0.0 --port 8000
```

## 推荐启动方式

先单独准备 MeloTTS 环境：

```bash
git clone https://github.com/myshell-ai/MeloTTS.git
cd MeloTTS
pip install -e .
python -m unidic download
```

如果 Hugging Face 下载慢，可以先设置镜像：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

再回到本项目启动服务：

```bash
pip install -r tools/requirements-melotts-service.txt
uvicorn tools.melotts_service:app --host 0.0.0.0 --port 8000
```

服务默认使用 CPU，避免部分 macOS 机器上 MPS 后端合成卡住。要手动指定可以设置：

```bash
export MELOTTS_DEVICE=cpu
```

在 macOS 上，服务代码会在 `MELOTTS_DEVICE=cpu` 时禁用 MeloTTS 内部 BERT 模块自动改用 MPS 的行为，避免出现 `Placeholder storage has not been allocated on MPS device`。

启动后可以测试：

```bash
curl -X POST http://127.0.0.1:8000/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"我最近在学习 machine learning，希望把线性回归讲清楚。","speed":1.0,"language":"ZH"}' \
  --output output.wav
```

## 项目设置

在 AI 助教设置页里：

- 语音引擎选 `MeloTTS 本地模型`
- MeloTTS 服务地址填 `http://127.0.0.1:8000/speech`
- MeloTTS 语言填 `ZH`
- MeloTTS 说话人填 `ZH`

如果使用 Docker 版 MeloTTS API，也可以把服务地址改成 `http://127.0.0.1:8888/tts/convert/tts`。

## 常见问题

- `python -m unidic download` 下载失败：可以按文章里的方法手动放置 `unidic.zip`，或处理 `unidic_lite` 的字典目录。
- NLTK 下载失败：手动下载 `nltk_data` 后放到本机 NLTK 数据目录。
- Hugging Face 下载失败：先设置 `HF_ENDPOINT=https://hf-mirror.com`，失败后重新运行一次服务启动命令。
- 首次生成很慢：这是模型首次加载和资源下载，后续会快很多。
