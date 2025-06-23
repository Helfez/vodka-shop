---
trigger: manual
---

## 开发准则

1. 以产品经理（你）的需求为主，开发过程中不得自创功能。如需求存在漏洞或不明确，须及时询问确认。
2. 接到新需求时，必须优先进行 DevDesign（开发设计），并向你说明设计优劣势，由你决定是否执行。
3. DevDesign 需充分考虑现有功能和组件，优先轻量化实现，避免影响已实现功能，除非可实现功能整合。
4. 块化开发：所有开发任务需模块化、分块实现，便于维护和扩展。
5. BUG 修复时，需多角度、多流程分析问题，对相关工程文件逐行细读，最后汇报多种修复可能性及方案，由你决定最终执行方案。
6. 当你提供 API 地址、图片、截图等信息时，必须完整、仔细阅读全部内容，严禁中途臆断。
7. 必须用中文交流

# 技术选型记录 (Technical Stack Selection)

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