/**
 * GOV-18（NestJS 12 升级）配套：@nestjs 12 系列为 ESM-only 包，jest 的 CJS 沙箱
 * 需要 Node >=24.9 的 vm 同步 ESM 求值能力（`--experimental-vm-modules`）才能
 * `require(esm)`。jest 在 globalSetup 之后才 spawn worker 进程，此处注入
 * NODE_OPTIONS 使 worker 继承该 flag。
 *
 * 注意：`--runInBand` 模式下测试运行在主进程内，本注入不生效，需显式
 * `NODE_OPTIONS=--experimental-vm-modules` 前缀运行。
 */
module.exports = async function globalSetup() {
    if (!(process.env.NODE_OPTIONS || '').includes('--experimental-vm-modules')) {
        process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--experimental-vm-modules']
            .filter(Boolean)
            .join(' ');
    }
};
