# CometENS 统一架构与里程碑（V3）

## 1. 总览与模块边界

用户/运营入口：
- Admin Portal（Vite 前端）：统一管理入口；.eth 可写；.box 只读+跳转/工单
- 钱包/应用：标准 ENS 解析（viem/ethers/钱包）

链上组件：
- 以太坊主网（L1）
  - ENS Registry（官方）
  - L1 Resolver（我们部署）
    - OffchainResolver：可信签名校验
    - OPResolver：存储证明校验
  - L1 Name Wrapper（可选）：包裹根域并烧断 CANNOT_SET_RESOLVER
- Optimism（L2）
  - 记录与所有权存储
    - 选型 A：L2Records 合约（MVP）
    - 选型 B：ENS Name Wrapper + Public Resolver（官方）
  - Worker EOA（网关控制），可扩展 Paymaster/AA

中台：
- CCIP‑Read Gateway（独立部署）
  - 解析 API：EIP‑3668 标准接口，返回签名或证明
  - 管理 API：注册子域、设置记录（Worker EOA 在 L2 写入）
  - Readers：NameWrapper/Records/box 适配
  - 安全与观测：EIP‑712、RBAC、限流、审计、日志

.box（OP）：
- my.box 合约状态只读展示；待官方开放写入能力后接入

## 2. 架构与交互流程（ASCII）

解析流程：
```
[dApp/Wallet] ─ resolve(name) ─> [ENS Registry L1] ─> [L1 Resolver]
                                         │ OffchainLookup
                                         ▼
                               [CCIP‑Read Gateway]
                                         │ Read L2 (OP)
                                         ▼
                         [L2 Records / Name Wrapper]
                                         │ result/proof
                                         ▼
                              [L1 Resolver callback]
                                         │
                                         ▼
                                   return value
```

管理流程：
```
[Admin Portal] ─ EIP‑712 签名 ─> [Gateway 管理API]
                                   │ 校验/策略
                                   ▼
                               [Worker EOA]
                                   │ OP tx
                                   ▼
                       [L2 Records / Name Wrapper]
                                   │ receipt
                                   ▼
                             [Admin Portal 展示]
```

.box 集成（只读）：
```
[Admin Portal] ─> [Gateway] ─> 读取 .box OP 状态 ─> 展示 + 跳转 my.box
```

## 3. “Unruggable Gateway”原有能力与我们扩展

原有能力：
- EIP‑3668/ENSIP‑10 网关协议
- 解析 calldata 路由（addr/text/contenthash 等）
- GatewayRequest DSL 构建跨合约读取图
- 两种验证：可信签名 / 存储证明（Bedrock）
- 多链/L2 适配范式

新增能力：
- Readers：接入 OP Name Wrapper/Public Resolver 或自有 L2Records
- 管理 API：/register、/set‑addr、/set‑text、/set‑contenthash
- 安全与治理：EIP‑712、RBAC、配额、审计、日志、限流
- 多域/多链配置、签名人轮换、环境隔离
- Admin Portal：.eth 全功能；.box 只读+工单

## 4. 模块与子模块

packages/
- admin-portal/：Vite 前端（wagmi/viem）
- gateway/：CCIP‑Read 与管理 API
  - ccip/、manage/、readers/、proof/、security/、config/
- l1-resolver/：OffchainResolver、OPResolver
- l2-records/：L2Records 合约（MVP）
- shared/：types、abi、domain‑config、sig‑schema

docs/
- 设计与计划文档（现有）
- 本文件：统一架构与里程碑

## 5. 部署拓扑
- L1 Resolver：Ethereum Mainnet（主网）
- Gateway：Cloudflare Workers/Node（HTTPS、可水平扩展）
- L2 合约：Optimism Mainnet（MVP 可先 OP‑Sepolia）
- Admin Portal：静态托管（Cloudflare Pages/Vercel）
- 密钥：Worker EOA/网关签名人独立管理，环境隔离

## 6. 里程碑与任务进度

里程碑 A：可信签名版解析 MVP（进行中）
- A1 网关跑通 CCIP‑Read（解析 API、addr/text/contenthash、签名返回）【计划】
- A2 部署 L2Records 合约或接 Name Wrapper（只读）【进行中】
- A3 部署 L1 OffchainResolver 并绑定测试根域【计划】
- A4 Admin Portal 最小闭环（注册/设置/查询）【计划】
- A5 .box 仪表盘（只读 + 跳转/工单模板）【计划】
- A6 安全与运维基础（EIP‑712、nonce/过期、限流、日志）【计划】

里程碑 B：Name Wrapper + NFT 子域（计划）
- B1 集成官方 Name Wrapper：铸造/转移子域 NFT
- B2 Portal 批量发放/记录设置、冲突检测与命名规则
- B3 审计日志与监控看板

里程碑 C：存储证明与信任最小化（计划）
- C1 证明生成：接入 Bedrock 状态根与证明
- C2 部署 OPResolver，启用 resolveWithProof
- C3 切换与回退策略

里程碑 D：生产强化与治理（计划）
- D1 L1 包裹根域并烧断 CANNOT_SET_RESOLVER（谨慎执行）
- D2 密钥轮换、RBAC、报警与应急预案
- D3 运维流程与灾备演练

里程碑 E：.box 写路径（依赖官方，待定）
- E1 接入 my.box 授权/角色/接口
- E2 与 .eth 管理闭环对齐

## 7. 当期状态与下一步
- 文档合并完成；MVP 选型采用 L2Records 合约优先落地（A2 进行中）
- 下一步：实现 L2Records 合约并 forge 编译；随后初始化 gateway 的解析与管理 API 契约
