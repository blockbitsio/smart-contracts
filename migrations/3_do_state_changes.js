let ApplicationEntity_LiveAddress =         '0xd30f268471f372886bb76b4d3325494c98c39e21';   // rinkeby address
const utils                         = require('../test/helpers/utils');

async function doStateChanges() {
    let contract = await artifacts.require("ApplicationEntity");
    let app = await contract.at( ApplicationEntity_LiveAddress );

    let hasChanges = await app.hasRequiredStateChanges.call();
    utils.toLog("    hasChanges: "+ hasChanges.toString() );

    if (hasChanges === true) {
        let tx = await app.doStateChanges();
        await doStateChanges();
    }
}

module.exports = (deployer, network) => {
    // deployer.then(async () => await doStateChanges());
};


