# 分类规则来源与限定

07b保留已冻结gate：normal/internal/sensitive仍与真实业务scope相与；confidential/restricted还需既有敏感读权限；当前/冻结分类均须通过，未知分类failclosed。07原候选漏sensitive的兼容分支，已追加07b且原件不改。

R2正式归档baseline docs/design/archive/slices/rust-r2ij-storage-attachments-baseline.md §1纳入j-source-input.md及g0-dependencies.json作为联合G1冻结输入。j-source-input.md:124明确只confidential/restricted追加限制并指出sensitive原行为；g0-dependencies.json:154写明Only confidential/restricted，normal/internal/sensitive follow original behavior。本批effective-v2/scope-response-contract.json:37要求existing attachment permission/classification仍AND，未重定义字面量规则。EX45仅要求security gate，未另给权限表。

这证明当前冻结gate内容，不证明未来业务上sensitive理应普通可读。R2文本带原行为兼容限定；用户不追bug级等价仍有效。若Root决定sensitive也受控，应精确corrective并同步原附件/I/C各入口，不能只在窄修复单边重写安全模型。
