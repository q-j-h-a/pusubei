# CosyVoice 本地语音服务

CosyVoice 用于给 AI 助教提供更自然的本地中文语音。当前项目不直接内嵌 CosyVoice 模型，而是调用 CosyVoice 官方 FastAPI 服务。

## 接入方式

项目后端会请求 CosyVoice 官方 FastAPI 的 SFT 接口：

```text
http://127.0.0.1:50000/inference_sft
```

请求参数：

```text
tts_text：需要朗读的文本
spk_id：角色音色，例如 中文女
```

CosyVoice 官方 FastAPI 返回的是 16-bit PCM 音频流，项目后端会把它包装成 WAV，再返回给浏览器播放。

## 项目设置

在 AI 助教设置页里：

- 语音引擎选 `CosyVoice 本地模型`
- CosyVoice 服务地址填 `http://127.0.0.1:50000/inference_sft`
- CosyVoice 角色填 `中文女`
- CosyVoice 采样率填 `22050`

可用角色取决于你启动的 CosyVoice 模型。官方 client 默认示例使用 `中文女`。

## 官方启动参考

官方仓库：

```text
https://github.com/FunAudioLLM/CosyVoice
```

官方建议先克隆仓库并初始化子模块：

```bash
git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice
git submodule update --init --recursive
```

官方环境示例使用 Python 3.10：

```bash
conda create -n cosyvoice -y python=3.10
conda activate cosyvoice
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host=mirrors.aliyun.com
```

模型下载可以用 ModelScope，也可以用 Hugging Face。常用 SFT 模型：

```python
from modelscope import snapshot_download

snapshot_download("iic/CosyVoice-300M-SFT", local_dir="pretrained_models/CosyVoice-300M-SFT")
```

启动官方 FastAPI：

```bash
cd runtime/python/fastapi
python3 server.py --port 50000 --model_dir ../../pretrained_models/CosyVoice-300M-SFT
```

如果使用 Docker 运行官方服务，官方示例端口也是 `50000`。

## 验证命令

CosyVoice 官方服务启动后，可以先直接测试：

```bash
curl -X POST http://127.0.0.1:50000/inference_sft \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "tts_text=你好，我是 CosyVoice 本地语音服务。" \
  --data-urlencode "spk_id=中文女" \
  --output cosyvoice.raw
```

通过主项目测试：

```bash
curl -k -X POST https://192.168.60.29:5443/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"这是主项目调用 CosyVoice 的测试。","provider":"cosyvoice","voice":"cosyvoice:中文女","rate":1.0}' \
  --output cosyvoice.wav
```

如果响应头里有：

```text
X-TTS-Provider: cosyvoice
```

说明主项目已经走 CosyVoice。

## 注意事项

- CosyVoice 服务必须单独启动；主项目只负责调用它。
- 官方 FastAPI 的 `/inference_sft` 返回 PCM 流，不是 WAV 文件，项目后端已经处理这个转换。
- 如果你换成第三方 CosyVoice API，只要返回标准 `audio/wav` 或 `audio/mpeg`，项目后端也会直接转发。
- 当前接入的是 SFT 模式；zero-shot、cross-lingual、instruct 模式需要额外传参考音频或指令文本，后面可以继续扩展。
