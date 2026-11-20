02只修IR108-01入口顺序。旧26340…及原manifest/10项回归保留hold，不更改其原件。旧顺序先createContext（当前context无条件persist），后wx driver.lock，已有driver时会在EEXIST前先重写共享state。

新入口在读取/校验私有plan基本形状后，使用固定`/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01/driver.lock`、wx/0600、真实本PID及随机nonce先取得锁。目录必须已经是canonical new13 priv，不会在锁前创建context或新state。只有锁成功才进入同一个try中的Root模块加载、G2/自身pin、createContext、R3/H0/API/source/旧006965验证、capture及控制事务。finally只在regular单link锁的PID/nonce均仍属于本进程时unlink；现存锁、错owner或路径别名不会被清除。

未改buildM98FrozenNegatives、controlledAttemptM98、assertControlledFailureM98、SQL语句及父UUID序→child raw/xmin→白名单UPDATE→always ROLLBACK/end路径。全库139×2 raw/xmin/meta/sequence/objects守恒、auth无例外、旧M97记录逐值保留、禁止parentless/commit-window、未完成阶段不可盲重放等原语义保持。模板与原件逐字同、全部Source13实际值仍null。外部脚本仍不入business H0；Root最终需将新代码pin登记G2.supportingTools.postM98FrozenNegative，不能用旧26340 pin执行新字节。

依赖只按Root181实际新增4个directFiles的context重基线：3904197c…→9862d325c82f8823cc76499ca20a202322e22347864d9cec3a52a1bccf24ac3d；其余六个直接依赖与原manifest精确相同，所有实际完整helper H0仍在运行时与新R3验证。此为显式源叶重登记，不给旧Source12 producer改标签。

验证15项fake-client/内存文件系统纯回归，原10项保留；新增已有锁context零调用/零persist/原锁不变、锁成功后才context、context失败仍清本锁、错PID/nonce保留、私有目录重定向拒绝。syntax/help通过。作者未运行实际模式、SQL、HTTP、Root写、迁移或进程操作；原README关于Root未来实际步骤仍适用，并以后置的02先锁顺序为准。
