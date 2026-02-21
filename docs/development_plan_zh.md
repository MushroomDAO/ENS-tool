# CometENS 开发计划（ens-tool）

## 里程碑（最新标记）

### 里程碑 A：可信签名版解析 MVP（进行中）

- A1 网关跑通 CCIP‑Read（viem 版解析 API、addr/text/contenthash、签名返回）【计划】
  - Owner：Gateway
  - 交付物：/api/ccip（本地开发）与 Worker 部署入口（生产）
- A2 部署 L2Records 或接 Name Wrapper（只读）【进行中】
  - Owner：Contracts / L2
  - 交付物：OP‑Sepolia 上 L2Records 地址、前端可读回显
- A3 部署 L1 OffchainResolver 并绑定测试根域【计划】
  - Owner：Contracts / L1
  - 交付物：L1 Resolver 地址、测试根域解析可用
- A4 Admin Portal 最小闭环（注册/设置/查询）【计划】
  - Owner：Portal
  - 交付物：.eth 管理页：签名→提交→链上写入→回读
- A5 .box 仪表盘（只读 + 跳转/工单模板）【计划】
  - Owner：Portal
  - 交付物：my.box 信息展示、跳转与工单指引
- A6 安全与运维基础（EIP‑712、nonce/过期、限流、日志）【计划】
  - Owner：Gateway
  - 交付物：nonce 存储、过期校验、基本限流与审计日志字段

### 里程碑 B：Name Wrapper + NFT 子域（计划）
- B1 接入 Name Wrapper 铸造/转移子域 NFT
- B2 Portal 批量发放/冲突检测/命名规则

### 里程碑 C：存储证明与信任最小化（计划）
- C1 证明生成与查询（OP Bedrock）
- C2 L1 OPResolver 验证 resolveWithProof

### 里程碑 D：生产强化与治理（计划）
- D1 L1 根域包裹并烧断 CANNOT_SET_RESOLVER
- D2 密钥轮换、RBAC、报警与应急预案

### 里程碑 E：.box 写路径（待官方开放）
- E1 接入 my.box 写路径与授权/角色接口

## Task 拆解（持续更新）

### A1（网关 CCIP-Read）
- A1-T1：实现 viem 版读取适配（L2RecordsReader）
- A1-T2：实现 /api/ccip（本地开发中间件），返回 data + signature
- A1-T3：补齐 Selector 路由（addr/text/contenthash）

### A2（L2 存储）
- A2-T1：部署 L2Records 到 OP‑Sepolia
- A2-T2：前端读取配置化（OP_SEPOLIA_RPC_URL / L2Records 地址）

### A3（L1 Resolver）
- A3-T1：部署 OffchainResolver（测试网）
- A3-T2：绑定测试根域 resolver，完成解析回调验证

### A4（Portal）
- A4-T1：.eth 页面 SetAddr/Register 签名与提交
- A4-T2：写入后回读校验与错误提示

### A6（安全与运维）
- A6-T1：nonce 策略与存储（最小：内存/文件；后续 KV）
- A6-T2：deadline/过期校验
- A6-T3：请求日志字段与最小限流

