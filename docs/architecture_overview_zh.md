# 架构总览（ens-tool 版）

- 目标：在 ens-tool 仓库内承载 CometENS 的网关与文档，避免上游 fork 历史负担
- 技术栈：TypeScript、viem、Cloudflare Workers（目标运行环境）、Foundry（合约编译/部署）

```mermaid
graph TD
    subgraph 用户端
        A[Admin Portal]
    end
    subgraph 链下
        B[Gateway (viem)]
        C[Worker EOA]
    end
    subgraph L1
        G[ENS Registry]
        H(OffchainResolver/OPResolver)
    end
    subgraph L2
        D[Name Wrapper]
        E[Public Resolver]
        X[L2Records(MVP)]
    end
    A --> B
    B --> C
    C --> D
    C --> X
    D --> E
    G --> H --> B
```

