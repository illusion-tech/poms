# F12 request-only 验收候选 44

本目录是未运行候选。作者没有发HTTP、连接数据库、读取凭据、改Root或编造业务成功。只有纯静态合约 / 手算见证检查；所有11个case及F12运行状态初始not-run。

## 最小接线

`createFAcceptanceSuite44(context,{request})` 使用与现有E21相同的回调：

```js
request(operationId, idOrNull, bodyOrNull, actualActor, meta)
// -> {status,body,receiptId,requestId?}; body为真实HTTP解析后的裸DTO。
```

Root负责真实会话/CSRF、一次网络调用、公开请求/响应原回执、当前服务器/源码绑定。meta给出caseId、唯一stepId、冻结method/path、独立query。没有SQL回调、业务假producer、内部成功替身或自动retry。suite.run只能调用一次；半途失败保留resources中真实创建ID供Root原有清理机制处理，不自动重放。

public-context44.example.json仅从允许读取的E41公共before取真实project/otherProject/activeContract、字典代码和四种实际actor快照；不含Cookie/CSRF/DB配置。Root使用新的tag，并复核stageAssessment责任说明，明确填写taxReason（示例REQUIRED占位会拒绝执行税务case）。policy authority已指向Root正式freeze51；真正运行F44-11之前仍须确认当前服务已导入同SOURCE_PINS的F46，旧F25不是新版policy运行证明。

```js
const context = { ...publicExample.context,
  tag: 'f44',
  taxReason: '由本次验收财务责任人明确填写对真实0.01税额先pending后deductible的判断依据，成本不自动included'
};
const suite = createFAcceptanceSuite44(context, {request: rootHarness.request});
const before = suite.manifest(); // 只有not-run声明
const actual = await suite.run(); // 必须真实HTTP；Root另存新原件
```

## 覆盖与真实来源

| Case   | 内容                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F44-01 | E费用实际create/confirm/map→registered；cost CAS、非法snapshot、真实expense sourceVersion、auto无阶段证明拒绝；F具证确认、GET/list、mandatory lock    |
| F44-02 | 重新GET当前真实D confirmed handover，校对HK日期/版本；未allocated成本成功reclassify，旧链和原确认时间/人保留                                          |
| F44-03 | 真实Expense源税务pending确认、GET/list、stale CAS拒绝、deductible替代；税额不再次改成本，financeOnly读mask                                            |
| F44-04 | 真实0.11净+0.01税=0.12，双项目1:2→1:4完整替代；固定独立分币见证、每项目继任、source成本版本断言                                                       |
| F44-05 | 已被当前分摊冻结的成本reclassify409，cost version/stage lock/history不变                                                                              |
| F44-06 | E实际publish0.5000角色率×0.02工时=0.01、F确认；三种缺敏感授权写403及stage证据mask                                                                     |
| F44-07 | 已知普通费用0.02+受保护LABOR0.01=0.03；可分别读已授权单项，但mixed总额/份额/weight/ratio/source整体mask；错误金额探针写403，完整替代及旧新basis同保护 |
| F44-08 | 含LABOR tax来源、写403；替代为仅普通来源仍因旧链保持双敏感；GET/list/receipt无金额/证据旁路                                                           |
| F44-09 | 真实费用gross-only 0.01，net/tax未知保持null；选择未知net拒绝、gross分摊成功且不补0                                                                   |
| F44-10 | 真实C payable净/含税9999999999999999.99、tax0→E采购registered→F确认/双项目分摊，全程money string；合同金额不作项目成本预算上限                        |
| F44-11 | 用户已选的gross主层0.12按1:1=0.06/0.06，net0.06/0.05、tax0/0.01；新confirm和完整replace同规则，只在F46冻结/部署绑定后运行                             |

所有新成本均通过E真实API生产，然后由F具证confirm；不复用E41已经allocated的旧成本，也不SQL插造stage、included、费率、成本或Operating snapshot。唯一随机UUID仅用于明确失败的非法snapshot引用，不作为成功业务事实。D事实只证明handover当天，不制造execution期间，也不绕过R5角色冻结。

## 独立金额见证与政策边界

WITNESSES是写死的手算金额，不调用生产logic反求期望；日期/UUID排序不参与浮点money计算。

- 普通：11/1/12分，权重1:2：net4/7、tax0/1、gross4/8；完整替代1:4：net2/9、tax0/1、gross2/10。源总额始终12分，最后含税精确配额2.4/9.6分有尾差。
- mixed：普通2分+人工1分，net3/tax0/gross3；1:1为2/1分，1:2为1/2分。缺任一敏感权限不能通过mixed总额减已知项反推另一项。
- MAX：999999999999999999分按1:1，UUID较小项目500000000000000000分，即5000000000000000.00；另一4999999999999999.99，显式tax0，net=gross。C/E/F都须原样十进制字符串，不能经过Number。
- 主层区分反例与旧F25组件口径的差异见POLICY-QUESTION44.md及独立冻结proposal45。非歧义普通/MAX用例不单独证明新版主层政策。F44-11能检验公开金额，但私有basis/result policy v2与canonical hash仍须Root单独PG读回，不把公开摘要冒充完整私有证据。

## 结论边界

result逐case保留passed/failed/needs-context/not-run及真实HTTP回执引用；f12SuccessfulCoverage只表示实际成功响应被观察，不替代case断言或独审。未触发的依赖case仍not-run，不传播Pass。最终由Root执行全部真实HTTP、F46原始PG policy/hash/旧F25历史、fault32回滚/受控并发、源码绑定及G3/G4；本候选不认证这些结果。
