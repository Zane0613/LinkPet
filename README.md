---
# 详细文档见https://modelscope.cn/docs/%E5%88%9B%E7%A9%BA%E9%97%B4%E5%8D%A1%E7%89%87
domain: #领域：cv/nlp/audio/multi-modal/AutoML
# - cv
tags: #自定义标签
-
datasets: #关联数据集
  evaluation:
  #- iic/ICDAR13_HCTR_Dataset
  test:
  #- iic/MTWI
  train:
  #- iic/SIBR
models: #关联模型
#- iic/ofa_ocr-recognition_general_base_zh

## 启动文件(若SDK为Gradio/Streamlit，默认为app.py, 若为Static HTML, 默认为index.html)
# deployspec:
#   entry_file: app.py
license: Apache License 2.0
---

# 🐾 LinkPet - AI 赛博宠伴

LinkPet 是一个基于大语言模型（LLM）驱动的 AI 电子宠物系统。每一个宠物都拥有独立的性格和灵魂，它们会根据与你的互动自主进化，产生独特的情感、记忆和行为模式。

## ✨ 核心特性

- **🥚 性格孵化系统**：通过心理测试（MBTI 简化版）映射生成的初始性格，决定宠物的互动风格。
- **🧠 自主行为引擎**：宠物不仅仅是等待指令的程序。它们会自主决定何时睡觉、进食或出门旅行。
- **🌍 赛博旅行与明信片**：宠物会随机进行“旅行”，生成独特的旅行照片，并带回旅行日记。
- **💬 深度情感交互**：基于 LLM 的对话系统，支持长短期记忆，宠物会记住你的喜好和共同经历。
- **📱 响应式前端**：基于 Next.js 构建的流畅动画和沉浸式 UI。

## 🛠️ 技术栈

### Backend (后端)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - 高性能 Python Web 框架
- **AI/LLM**: LangChain, OpenAI API (兼容模型)
- **Image Gen**: Volcengine Ark (火山引擎方舟)
- **Database**: SQLite + SQLAlchemy (轻量级持久化)
- **Scheduling**: APScheduler (处理宠物自主行为循环)

### Frontend (前端)
- **Framework**: [Next.js 14](https://nextjs.org/) (Static Export)
- **UI Library**: React 18
- **State Management**: React Hooks

## 📂 目录结构

```bash
LinkPet/
├── app/                 # Python 后端核心代码
│   ├── api/             # API 路由 (v1)
│   ├── core/            # 配置与安全
│   ├── services/        # 业务逻辑 (游戏引擎, 图像生成)
│   └── main.py          # FastAPI 入口
├── frontend/            # Next.js 前端源代码
│   ├── app/             # App Router 页面
│   ├── components/      # UI 组件
│   └── public/          # 静态资源 (图片等)
├── static/              # 前端构建产物 (用于后端挂载)
├── deploy_frontend.sh   # 前端自动构建与部署脚本
├── app.py               # ModelScope 启动入口
└── requirements.txt     # 后端依赖
```

## 🚀 快速开始

### 1. 环境准备
确保你的系统安装了：
- Python 3.10+
- Node.js 18+ & npm

### 2. 配置环境变量
在项目根目录创建 `.env` 文件（参考 `.env.example`）：
```ini
OPENAI_API_KEY=your_llm_api_key
ARK_API_KEY=your_volcengine_api_key  # 用于生图
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

### 3. 后端启动
```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务器
python app.py
```
服务将在 `http://localhost:7860` 启动。

### 4. 前端开发
如果你需要修改前端界面：
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
前端开发服务将在 `http://localhost:3000` 启动。

### 5. 构建与部署
当你完成前端修改后，使用我们提供的脚本自动构建并更新到后端静态目录：
```bash
# 在项目根目录下运行
chmod +x deploy_frontend.sh
./deploy_frontend.sh
```

## ☁️ 部署 (ModelScope)

本项目设计为兼容 **ModelScope Spaces** (魔塔社区) 部署。
- 后端监听 `0.0.0.0:7860`。
- 前端通过 `Next.js` 导出为静态 HTML，由 FastAPI 挂载在根路径 `/`。
- **注意**：在魔塔空间设置中，务必添加 `ARK_API_KEY` 环境变量以启用生图功能。

## 📄 License
Apache License 2.0
