# API 输入01：预检首停，禁止启动

输入 `3d3788` 的 current.binary 与 current.summaryBinary 误放了历史六键 stat 容器，而已冻结当前输入要求严格 Pin。实际元数据预检退出 1，structured stack 定位于 inputShape→pinShape；没有生成 request、RootApproval、环境、进程或 API 输出。

原输入、元数据生产器和失败原件保留，不改写成新输入。修正仅在新输入中投影 file/bytes/rawBytesSha256；当前 stat 继续单独实测。另两处 Root/Native 历史二进制比较接线按具名代码修订处理，旧 stat 与证明不修改、不冒当前事实。

此输入不得提交实际启动。新代码独审、单文件修订提升及新全量源码清单之后，必须生成新 nonce 并重新做只读预检与具体 G2。
