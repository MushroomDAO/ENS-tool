# CometENS Re-think
这个项目首先是一个开源框架，任何组织和个人可以无条件使用它，来建立自己的ENS分发系统。
它核心能力是基于你的根域名（假设你长期续费持有），分发给其他用户二级和三级域名，并且以NFT的形式转让所有权（控制权），以确保用户可以使用这个二级ENS并用来指向自己的多链钱包地址和SBT，以及维护ENS的头像、社交链接等等信息。
AAStar基于CometENS开发了DAPI：用ENS来唯一动态的指向去中心化服务，目前用于SuperPaymaster服务体系，任何人可以加入并提供Gas Sponsor服务（以API方式），无需许可，就依赖了归属于自己的
三级域名（bob.paymaster.aastar.eth).
而AAStar的AirAccount也基于CometENS为所有注册钱包的用户提供确定归属权的ENS NFT（例如alice.aastar.eth）.
期待你们基于CometENS作出更多探索。
技术栈基于CCP协议，建立自己的Resolver合约和Server，目前我们基于Optimism Mainnet运行，未来会逐步扩展到其他Layer2（Layer1）。
本repo默认是sepolia和op sepolia链进行开发测试。

## 背景

工作目录：/Users/jason/Dev/aastar/CometENS， 添加子模块：git@github.com:AAStarCommunity/comet-ens-contracts.git，git@github.com:AAStarCommunity/CometENS-frontend.git，git@github.com:AAStarCommunity/CometENS-old.git
，https://github.com/ensdomains/ens-contracts
，https://github.com/ensdomains/ensjs
，https://github.com/ensdomains/docs
，https://github.com/ensdomains/ens-app-v3
，https://github.com/unruggable-labs/unruggable-gateways
，https://github.com/unruggable-labs/unruggable-gateways-documentation
，https://github.com/unruggable-labs/unruggable-gateways-ens-resolution-demos
，https://github.com/unruggable-labs/chain-resolver
，https://github.com/unruggable-labs/chain-resolver
，https://github.com/unruggable-labs/unruggable-gateways-examples
，https://github.com/unruggable-labs/unruggable-gateways-trusted-verifier-example

在vendor目录（请新建在项目根目录），我们所在分支是aastar-dev分支，以后这个分支是发布分支，因为main是我们fork自其他项目，然后了解三个子模块（是国外的历史版本，和当前项目的思路CometENS），然后了解我的基础思路。

## 技术栈
使用pnpm，react（vite，不用next，轻巧），foundry/forge,不用hardhat，使用wrangler/cloudflare workers部署。使用viem，wagmi，不使用walletconnect。

## 账户交互
使用简单的小狐狸metamask链接和airaccount连接，来提交web3账户地址,签名，获得ens，而后台执行的是一个工作eoa，实现api方式对例如ens nft转移，ens record设置等操作。

## 问题
目前仅看到文档说ens二级三级域名支持nft方式转让，但不了解具体技术实现


设计的这部分，还使用原来内容吧：
1.  **子域名即 NFT (ERC-1155)**
    *   所有通过 CometENS 分发的子域名都将是基于官方 **ENS Name Wrapper** 标准的 **ERC-1155** NFT。
    *   用户拥有其域名 NFT 的**真正所有权**，可以自由转让、交易，父域名所有者无法收回。
    *   为每个注册 AirAccount 的用户提供一个确定的、归属于其钱包的 ENS NFT。

2.  **多链地址解析**
    *   用户可以将其 ENS 域名指向多个区块链地址（如 Ethereum, Optimism, Arbitrum 等），实现一个域名管理所有钱包。

3.  **去中心化身份 (DID) 和社交图谱**
    *   用户可以编辑与 ENS 关联的个人资料，包括：头像、社交链接、个人简介、可验证凭证 (SBTs) 等。

4.  **DAPI (去中心化服务) 指向**
    *   将 ENS 域名用作动态、唯一的指针，指向去中心化服务或 API。
    *   **示例**: SuperPaymaster 的 Gas Sponsor 可以用 `bob.paymaster.aastar.eth` 作为其服务的唯一入口点。

### 1.3. 目标用户

1.  **Web3 项目方/社区**: 为其成员提供品牌化、有身份归属感的子域名。
2.  **DApp 开发者**: 需要一个去中心化的方式来标识和调用服务。
3.  **普通 Web3 用户**: 寻求一个统一的、可移植的去中心化身份。
1.  **Web3 项目方/社区**
2.  **DApp 开发者**
3.  **普通 Web3 用户**


## 风险
父域名所有者是子域名的“信任根”，如何防止这个“根”作恶，拔掉网线？**

您的分析完全正确：
如果 `aastar.eth` 的 L1 所有者，将其在 L1 ENS 注册表中的 `resolver` 地址从我们精心设计的 `CometENS_L1_Resolver` 更换为其他地址（甚至是空地址），那么：
1.  所有通过标准 ENS 协议（L1 -> L2）的解析路径都会被**瞬间切断**。
2.  尽管用户在 L2 上的子域名 NFT 和相关记录都**安然无恙，不会丢失**，但对于整个 L1 生态来说，这些子域名会立刻变得**无法解析**，形同“数据孤岛”。

这是一个巨大的风险，因为它将所有子域名用户的资产价值，都置于父域名所有者的信誉之下。

### 我的建议：如何从根本上解决这个问题

要解决这个问题，我们需要一把“锁”，将父域名和它的解析器永久绑定。幸运的是，ENS 官方同样通过 **Name Wrapper** 提供了这把锁。这里的关键点是，我们不仅要在 L2 使用 Name Wrapper，也需要在 **L1** 上对父域名本身使用 Name Wrapper。

**最终极、最可信的解决方案如下：**

1.  **在 Layer 1 上包裹父域名**: `aastar.eth` 的所有者，需要在 **以太坊主网 (L1)** 上，调用 **L1 的 Name Wrapper** 合约，将 `aastar.eth` 这个域名本身包裹起来。

2.  **烧断“更换解析器”的保险丝 (Fuse)**: 在 L1 上包裹 `aastar.eth` 之后，所有者需要调用 L1 Name Wrapper 的 `setFuses` 函数，永久性地烧断 (burn) `CANNOT_SET_RESOLVER` 这个保险丝。

**结果是什么？**

一旦 `CANNOT_SET_RESOLVER` 这个保险丝在 L1 上被烧断，就意味着**任何人（包括 `aastar.eth` 的所有者自己）都将永远无法再更改 `aastar.eth` 在 L1 设置的解析器地址**。

这个操作是**不可逆**的。

它向整个社区和生态系统提供了一个**基于代码和密码学的承诺 (Cryptographic Commitment)**：`aastar.eth` 的解析路径将永远指向我们设定好的 `CometENS_L1_Resolver`，绝不会改变。所有基于 `aastar.eth` 的子域名生态将永久有效，不再依赖于任何个人或组织的信誉。

**这个操作的取舍 (Trade-off):**

*   **优点**: 提供了最高级别的安全性、去中心化和抗审查性。一劳永逸地解决了您提出的信任漏洞。
*   **缺点**: `CometENS_L1_Resolver` 将无法再被升级。如果未来 CCIP-Read 协议有重大更新，或者我们发现了当前解析器合约的漏洞，我们将无法通过简单地更换解析器来进行修复。（当然，可以通过代理合约模式来部分缓解这个问题，但这增加了初始的复杂性）。

这是一个需要项目方深思熟虑后做出的、具有战略意义的决定。


## 融合架构

1.  **所有权和记录存储在 L2**：
    *   我们依然使用 **Optimism (L2)** 作为我们的大本营。
    *   **ENS Name Wrapper** 合约部署在 L2 上，用于管理 `aastar.eth` 下所有子域名的 **NFT 所有权**。
    *   用户的解析记录（地址、头像等）也通过 Name Wrapper 存储在 L2 的 **Public Resolver** 中。
    *   这样做，所有权的变更（NFT 转移）和记录的更新（设置头像）都在 L2 上发生，成本极低。

2.  **解析请求发生在 L1**：
    *   当一个 DApp (例如 Uniswap) 在以太坊主网 (L1) 上尝试解析 `alice.aastar.eth` 时，它会查询 L1 的 ENS 注册表。
    *   我们将 `aastar.eth` 在 L1 的解析器设置为一个我们自己部署的、支持 **CCIP-Read** 的自定义解析器，我们称之为 `CometENS_L1_Resolver`。

3.  **L1 与 L2 的桥梁：CCIP-Read Gateway (Cloudflare Worker)**
    *   当 `CometENS_L1_Resolver` 收到解析请求时，它不会尝试在 L1 上找数据，而是直接 `revert` 并返回一个指向我们 **Cloudflare Worker (Gateway)** 的 URL。
    *   DApp 的客户端（如 Ethers.js）捕获到这个 `revert`，并自动向我们的 Gateway 发起 HTTP 请求。
    *   我们的 Gateway (Cloudflare Worker) 收到请求后，**它会去查询 L2 (Optimism)**，读取 Name Wrapper 和 Public Resolver 中的数据，找到 `alice.aastar.eth` 对应的记录。
    *   Gateway 用它的 Worker EOA 私钥对查询到的结果进行签名，然后将 **[结果 + 签名]** 返回给 DApp 客户端。
    *   DApp 客户端带着 **[结果 + 签名]** 再次调用 L1 的 `CometENS_L1_Resolver`。
    *   `CometENS_L1_Resolver` 验证签名是否来自可信的 Gateway，验证通过后，将结果返回给 DApp。

**结论：**
通过这个流程，我们完美地融合了两个方案：
*   **Name Wrapper** 在 L2 上提供了可信的、低成本的 NFT 所有权管理。
*   **CCIP-Read** 机制则充当了 L1 和 L2 之间的桥梁，让 L1 的应用可以低成本、安全地读取 L2 上的解析数据。

**因此，您是对的，我不应该删除 2.2 节的关键组件，而是应该将它们融合。



如果之前在 L1 设置过解析，方案生效后会怎样？

您的理解再次完全正确，这是一个非常关键的“覆盖”逻辑：**我们的方案一旦生效，L2 上的记录将成为唯一的数据源**。

*   **机制**: ENS 的解析机制是“下游优先”。当一个 DApp 解析 `jason.aastar.eth` 时，它会找到 `aastar.eth` 的解析器（也就是我们的 `CometENS_L1_Resolver`），然后把解析任务完全交给它。我们的解析器被设计为**只信任**通过 CCIP-Read 从 L2 获取的数据。
*   **结果**: 对于您举的例子 `jason.aastar.eth`，假设它之前在某个旧的 L1 解析器上设置了 `0xaabb` 地址。当 `aastar.eth` 的主解析器被更新为我们的 `CometENS_L1_Resolver` 后，所有解析请求都会被导向我们的 L2 方案。因此，`jason.aastar.eth` 将会解析到您在我们产品中（即 L2 上）为它设置的新地址，而那个旧的 L1 记录 `0xaabb` 将**不再被标准解析流程访问到**，相当于被“覆盖”了。

这正是我们这套复杂架构的核心目标：**为最终用户和开发者提供无缝、无感的体验**。

*   **对于开发者 (DApp)**:
    他们不需要为我们的方案做任何特殊适配。他们使用的标准 `ethers.js` 或 `viem` 库（例如 `provider.resolveName("alice.aastar.eth")`）已经内置了对 CCIP-Read (EIP-3668) 的支持。当他们的代码调用 ENS 解析时，这些库会自动处理我们 L1 解析器返回的 `OffchainLookup` 错误，完成与我们 Gateway 的通信和验证，最终拿到正确的地址。整个过程对他们来说是完全透明的。

*   **对于最终用户 (域名持有者)**:
    他们也无需关心底层发生了什么。他们只需要在我们提供的简单前端界面上，连接钱包，设置他们想要的地址、头像等信息。一旦设置成功，他们就可以立即在任何支持 ENS 的地方（如 MetaMask、Uniswap、Etherscan）看到他们的域名正确地解析成他们设置的内容。


1. 关于 “Layer 2 解析” 的概念 和 `.box` 域名

您观察得非常敏锐。这里的确存在一个行业术语和实际架构的细微差别。

*   **我们的方案 (L1-Anchored L2 Resolution)**: 您说“都在 Layer 1 解析”是对的，因为我们方案的**入口**在 L1。任何标准 DApp 都是从 L1 的 ENS 注册表开始查找。但因为我们的 L1 解析器通过 CCIP-Read 协议，将解析的**工作负载和数据存储**外包给了 L2，所以我们称之为“L2 解析方案”。它的巨大优势是**通用兼容性**，任何支持 ENS 的应用无需修改就能使用。

*   **`.box` 域名 (L2-Native Resolution)**: `.box` 这种域名，它的注册表本身就**只存在于 L2**，在 L1 的 ENS 系统里根本没有记录。因此，想要解析它，钱包或 DApp **必须直接连接到对应的 L2 网络**，并查询 L2 的 ENS 系统。它快且便宜，但牺牲了 L1 的通用兼容性
