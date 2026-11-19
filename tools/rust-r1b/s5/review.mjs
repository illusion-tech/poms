// Exact reviewed S6 pins; the existing --s5 CLI remains the compatible whole-exporter entry.
// S4/S5 source checkpoints and historical nominal identities remain immutable.
export const S5_REVIEW = Object.freeze({
    "sourceHead": "2cd1be6029cf1b14ebfb1fc4530af894507a4c5a",
    "registryNormalizedTextSha256": "fdc5e6b3e4c4caca5b7c2218c3a0aedd1c6bef0d777e453aff4f4342f547bc8e",
    "identityNormalizedTextSha256": "9f5f1e044f0e5ea57023238cd5d6e2d2f5caf1b58f1977add5faaeb713daa335",
    "snapshotManifestRawSha256": "ddb2d8e44ed6897d75d0181093b49b3a27540560d2df73f789fd476bf1d91b35",
    "generatorNormalizedTextSha256": {
        "tools/rust-r1b/export-shared.mjs": "450ef3b2a5239bc3f7228a9ebe58924009b10dfed024243efcff0d7e82e5c666",
        "tools/rust-r1b/s5/export-s5.mjs": "8ccb6df3f645154cfb08a39baea17fe651b71867cf5760977f2f6a18bebac1d5",
        "tools/rust-r1b/s5/full-build.mjs": "96f510b0737d79826e6a663faabf0d32dccbf2a69c0c88f66348cdf0247a36e3",
        "tools/rust-r1b/s5/registered-module-graph.mjs": "bf9db24cf463f06d81e639d0772f16a5d284074e0f9d2b0ac4a85da4212aa308",
        "tools/rust-r1b/s5/static-data-oracle.mjs": "2c534359b27d7165c1b702b29d73132124e1a815a075b2f2c2e4ca92ee535576",
        "tools/rust-r1b/s5/source-access.mjs": "464c2588cf00cc1b6c00d9ad8efabbd6e1d195f64807d10ac3eab4e58d59333f"
    }
});
