# 严格 OAS3.0 规范化候选

仅候选；不改已晋升的 17 个 shared/Native 产品文件，不改当前 `openapi: 3.0.0`，不运行正式生成或客户端生成，也不访问 HTTP/DB。

优先复用了项目当前 `libs/vendor/nestjs-zod/src/utils.ts` 的 `convertToOpenApi3Point0`，但只让它处理已预检的原子节点。实际反例证明，直接让旧转换器处理 `{type:string,anyOf:[string,null]}` 会把原来不允许的 null 放进结果；它也不处理 if/then。因此没有全树盲复用，没有更改该库。

规则：

- const 转单值 enum，保留 falsy 值；矛盾的 type/enum/const 转空集合，不覆盖其他约束。
- null-only 编成同一对象中显式 `type:object`、`nullable:true`、`enum:[null]`，因此只允许 null，不能把 `{}` 放行。nullable 不能只挂在 ref/allOf 的父层。普通 nullable union 保留 anyOf/oneOf，不合并互斥分支或猜测 null 分支。
- if A then B else C 编成 `A∧B` 与 `¬A∧C` 的互斥 oneOf，并和原 base 做 allOf。现有 8 条条件的 predicate 只使用 properties/required/type/const/enum/not，均在有限支持片段内。未知 predicate、同层条件/oneOf 模糊组合、未注册或外部 ref、未知校验关键字、混合类型数组、tuple items、重叠数值边界、需要输入/输出方向决策的 readOnly/writeOnly 等明确阻断。
- JSON Schema 的 `$ref` sibling 约束用显式 allOf 保留，因为 OAS3.0 的 Reference Object 不承认 sibling。先规范化全部 129 项，全部成功后才更新目标 document；失败不写入部分结果。
- 所有字段 required、literal-null、金额 regex/精度界限、已有 oneOf/anyOf/allOf/not 和 x-* 注解保留。没有金额浮点计算、默认填零、删条件、可选化或升级 3.1。

上述 nullable 与 ref sibling 处理依据 [OAS3.0.3 Schema / Reference Object](https://spec.openapis.org/oas/v3.0.3.html#schema-object)；同一 Schema Object 中显式 type 是 nullable 生效前提，其他约束继续生效。

实际独立检查使用现有 AJV8.20.0 的2020-12验证器与支持 nullable 的目标验证器，129 component 均编译、均有正向结构样本；另含字段缺失、额外属性、literal-null 替换、零/未知、零权重条件、重叠 oneOf、ref sibling 等对照。它是 schema 接受集合的样本验证，不是业务来源真实性、授权、HTTP、正式 OpenAPI meta-schema 或客户端类型验收。

Root 接入：引入 `createStrictNormalizer`，传入真实 canonical atomic converter；正式 Swagger cleanup 后把批准的129原始 registry传给 `normalizer.overlay(cleaned, approvedSource)`，再走既有 nullable-ref 最后整理/正式规范和客户端验收。目标必须仍为3.0。`normalization-report.json` 绑定输入与 canonical converter 原字节 hash；`schemas.oas30.candidate.json` 仅供审查。nullOnly pointer 清单也在报告中，生成客户端后必须逐项确认这些字段仍是必填 null，而非 object/any/optional。

运行只会写此目录：`generate-candidate.cjs` → `check-semantics.cjs`。Node24.19.0 与所有库均使用已安装版本；无安装、无服务、无 schema/数据迁移。新片段若被阻断，保留失败报告，不把旧输出冒充这次成功。
