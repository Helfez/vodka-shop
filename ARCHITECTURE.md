# 技术选型记录 (Technical Stack Selection)

本文档记录项目核心技术选型，作为开发决策的基准。

### 前端 (Frontend)
*   **框架 (Framework):** React 18+
*   **构建工具 (Build Tool):** Vite
*   **语言 (Language):** TypeScript
*   **样式方案 (Styling):** Tailwind CSS
*   **2D 画布 (2D Canvas):** Fabric.js (基于 `Vodka` 项目技术预演)

### 后端与服务 (Backend & Services)
*   **电商平台 (E-commerce):** Shopify (通过 Storefront API 实现 Headless 模式)
*   **AI 服务中介 (AI Service Broker):** Aimixhub (作为 OpenAI 等服务统一入口)
*   **AI 生图服务 (Image Generation):** LiblibAI - Flux-Kontext
*   **自定义后端逻辑 (Custom Backend Logic):** Serverless Functions (例如 Vercel/Netlify Functions)，作为前端与各服务 API 交互的安全代理层 (BFF)。
