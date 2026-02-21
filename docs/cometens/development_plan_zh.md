# CometENS 开发计划 (V3 - 继承改造方案)

本文档基于 V3 版设计文档，明确了“先继承运行，再改造增强”的核心策略。

---

## 核心依赖与来源

#### 1. `CometENS_L1_Resolver` (我方部署)
- **策略**: 使用 `unruggable-gateways` 项目中自带的 `OffchainResolver.sol` 模板进行编译和部署。
- **ABI 来源**: 通过 `foundry` 编译后获得。
- **地址来源**: 部署到 L1 测试网/主网后获得。

#### 2. `ENS Name Wrapper` & `Public Resolver` (官方部署)
- **策略**: 直接与 ENS 官方已部署的合约交互。
- **ABI 来源**: 通过 `pnpm add @ensdomains/ens-contracts` 安装官方包，并从包中导入。
- **地址来源**: 从 ENS 官方文档查询。

#### 3. TypeScript 客户端选型
- **统一选择**: 使用 `viem` 作为唯一链上读写与 ABI 编解码库（替代 `ethers`）。
- **网关运行时**: Bun/Node 均可，MVP 以 Bun 运行，未来保留 Node 落地选项。

--- 

## Phase 0: 基线运行与分析 (Baseline Run & Analysis)

*   **目标**: 确保环境配置正确，并完整地在本地运行 `unruggable-gateways` 原始 Demo。
*   **任务**:
    1.  **同步/配置 (已完成)**: 分支已同步，`.env` 文件已配置。
    2.  **启动本地测试链**: 使用 `anvil` 启动一个本地 Ethereum 节点。
    3.  **部署 L1 解析器**: 将 `OffchainResolver.sol` 合约部署到本地 `anvil` 网络。
    4.  **启动 Gateway 服务**: 在 `packages/gateway` 使用 `viem` 启动 CCIP‑Read 网关（`bun run`），指向公共测试网（如 `op-sepolia`）以验证基础功能。
    5.  **端到端测试**: 编写或使用一个测试脚本，调用部署在 `anvil` 上的 L1 解析器，验证整个 CCIP-Read 流程是否可以成功通过本地 Gateway 从公共测试网获取数据。
    6.  **Vendor 策略**: `vendor/unruggable-gateways` 仅作参考示例，不直接依赖其运行组件；核心代码在 `packages/gateway` 以 `viem` 重写

## Phase 1: CometENS 核心改造 (MVP)

*   **目标**: 将 Gateway 的数据源改造为 L2 Name Wrapper，并完成核心业务逻辑。
*   **任务**:
    1.  **实现 `L2RecordsReader` 优先**: 在 `packages/gateway/readers` 实现 viem 读取自有 L2Records 合约（MVP 路线），并预留 Name Wrapper Reader。
    2.  **CCIP‑Read 入口**: 在 `packages/gateway/ccip` 实现 EIP‑3668 接口，替换 ethers，统一使用 viem ABI 编解码。
    3.  **实现注册/管理接口**: 在 Gateway 中添加 `/register` 等 API 端点，用于接收前端签名授权，并由 Worker EOA 调用 L2 合约执行写操作。
    4.  **开发前端**: 独立开发 Vite 前端应用，实现钱包连接、子域名注册（签名授权）、域名管理等界面。
    5.  **迁移预案**: 提供自定义存储 → 官方 Resolver 的同步脚本与灰度切换策略

## Phase 2 & 3: (与 V2 计划一致)

*   **功能增强**: 支持 ERC-4337 AA 账户。
*   **部署与安全**: 上线主网并执行 L1 解析器“熔断”操作。
