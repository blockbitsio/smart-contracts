const GatewayInterface = artifacts.require('GatewayInterface');
const NewApplicationEntity = artifacts.require('ApplicationEntity');

async function doStage(deployer) {

    /*

     This is how you run a "code upgrade"
     Basically deploy a new "application entity" which should have some different code bundled

    */
    console.log();
    console.log('  ----------------------------------------------------------------');
    console.log('  Stage 2 - Application Upgrade Deployment');
    console.log('  ----------------------------------------------------------------');

    deployer.deploy(NewApplicationEntity)
        .then(() => {
            return NewApplicationEntity.at(NewApplicationEntity.address).then(function (instance) {
                return instance.linkToGateway(GatewayInterface.address, "http://second.url").then(function (receipt) {
                    const inLogs = receipt.logs.filter(log => log.event == 'EventCodeUpgradeProposal')
                    console.log("  >> EventCodeUpgradeProposal: ", inLogs.length);
                    console.log();
                })
            })
        });



}

module.exports = (deployer, network) => {
    // deployer.then(async () => await doStage(deployer));
};


