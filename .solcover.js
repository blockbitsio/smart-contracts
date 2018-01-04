module.exports = {
    norpc: true,
    testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    skipFiles: [
        'misc/Migrations.sol',
        'zeppelin/math/Math.sol'
    ],
    copyNodeModules: false,
}
