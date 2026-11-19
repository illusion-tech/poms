# #118 预算探测与成功准备证据采用：联合修订 G1

Root依据用户本批启动授权及[非作者设计独审](../../../tools/rust-r4ghi/budget-probe118-g1-v2/independent-design-READY02.json)，冻结[联合G1原件](../../../tools/rust-r4ghi/budget-probe118-g1-v2/Root-G1-budget-probe118-v2.json)。本条是已开工#118的具名技术G3纠正，只许可有限隔离代码实施。任务、清单和后续Gate以GitHub #118为准，父项为#114；#121实际技术G4保持完成，#57及完整R5 #116开放。

完整SSOT是包内两份v2设计原字节和独审，不能以摘要替代：控制面31093B/be033675…，Tax28677B/812bf690…，独审12665B/8132c9c7…。上一轮NOTREADY及所有原实际证据保留。G1包保全11个真实before并绑定原229 helper＋55 external＝284图；本次图内9 MOD、275 same，图外两个数据工厂，共11个既有文件，0新增生产模块。

控制线负责Native/Core/publisher和两数据工厂；Tax线负责run/proof/retained-proof/effects/wire/ledger六叶；第三线独立审查及有界负例验收。所有候选先写隔离目录，当前Root执行源和P不由实施者改动。原prepare/facts、业务源420、compile528、API/PG、公共路由、DTO、OpenAPI、数据库迁移和UI不在本次改动范围。

新第7 mode为`budget-probe`。Native只有两个实际Full3参数的专用executor对外有效，仅返数据；普通构造器、binding、view、retained/GH/trusted及通用效果入口中央拒绝预算对象。私有六方法port与真实WeakMap准入不外泄Root、db、client、通用八方法或callback。一次原canonical Auth3、完整37权限及原I900/A28800/T60保持；N1包完整基础checkpoint，包括最终Native引用，真实actor SQL前单调锚及向上取整扣时不减，两期限严格剩余大于2秒。

原成功6458/K847、prepared62/full61、565740读回、出生a8、原record与旧journal整样保持。Origin7/S4/Adoption6明确区分旧出生证据与新current；FS发布只替换lease并追加history，不清Tax槽或补FI前缀。runtimeBindings外层schema2/闭5改为schema3/闭6；current17、frame17、ref11、Tax34、Root9分别维持自己的闭形。旧六mode和未来consumer不获得schema3预算身份的效果权限。

输出严格为现存sample wx→单次真实close引用sample→nonce外层builtinFS wx report/complete或partial；不回写已封journal、原K，不复活cap。CP真实返回而sample写失败时保留真实区间，不造pin；close成功但保守会话覆盖不足时分别保存真实close事实和STOPPED_PRESERVE，不能混称整体成功。

必须完成设计列出的中央拒绝与逃逸、完整强谓词复用、旧模式兼容、37权限/owned session/2秒边界、唯一Auth、完整样本/最终ref、sample/close/report失败和四阶段原像负例。模型和代码资格不代真实验收。数据工厂只产生实际存在的元数据，不签Root9，不读写会话或回调prepare。

源码提升、Native FS/adoption发布、实际ctx/Auth/probe分别需要后续独立具体G2。旧362失败态6＋2 promoter不能用于成功态9＋2；Root新有限交付工具还需单独资格，本G1不授权其实际执行。本次不授FI、normal、Main、未来消费者桥、prepare重放、额外登录、TTL变更、缓存跳检或新PG/API。

N1只补一次activeFault=false的真实基础CP观测，不是高尾或618倍全FI预算。DDL、命中态、500回滚、等待、coflush、完整capture、final67和close总体余量未覆盖时仍为UNKNOWN。正式Rust240、R4 67/95、本批32 candidate、业务认证0/G3G4未签；只有后续真实依赖和独立验收满足后才能收口实际完成子片。
