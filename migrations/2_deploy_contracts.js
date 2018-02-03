const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
const utils                         = require('../test/helpers/utils');
const web3util                      = require('web3-utils');

const Token                         = artifacts.require('Token');
const GatewayInterface              = artifacts.require('GatewayInterface');
const ApplicationEntity             = artifacts.require('ApplicationEntity');
const ExtraFundingInputMarketing    = artifacts.require('ExtraFundingInputMarketing');

const ProjectSettings               = require('../project-settings.js');
const getContract = (obj)           => artifacts.require(obj.name);

let settings = ProjectSettings.application_settings;
settings.sourceCodeUrl = "http://www.test.io/";

let token_settings = settings.token;

const assets = [
    {'name' : 'ListingContract'},
    {'name' : 'NewsContract'},
    {'name' : 'TokenManager'},
    {'name' : 'Proposals'},
    {'name' : 'FundingManager'},
    {'name' : 'Funding'},
    {'name' : 'Milestones'},
    {'name' : 'Meetings'},
    {'name' : 'BountyManager'},
];

const entities = assets.map(getContract);

let deployedAssets = [];

const mapDeployedAssets = (asset) => {
    let obj = {};
    contract = getContract(asset);
    obj.name = asset.name;
    obj.method = "addAsset"+asset.name;
    obj.address = contract.address;
    obj.contract_name = contract.contract_name;
    obj.contract = contract;
    return obj;
};


async function doStage(deployer)  {

    utils.toLog(
        ' ----------------------------------------------------------------\n'+
        '  Stage 1 - Initial Gateway and Application Deployment\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog("  Deploy GatewayInterface");
    await deployer.deploy(GatewayInterface);

    utils.toLog("  Deploy ApplicationEntity");
    await deployer.deploy(ApplicationEntity);
    let app = await ApplicationEntity.at( ApplicationEntity.address );

    utils.toLog("  Add ApplicationEntity Bylaws");

    await addBylawsIntoApp(app, settings);
    utils.toLog("  Added Bylaws");

    utils.toLog("  Deploy Assets");
    for(let i = 0; i < entities.length; i++) {
        let entity = entities[i];
        utils.toLog("    Asset: " + entity.contract_name);
        let name = entity.contract_name;

        await deployer.deploy(entity);
        let arts = artifacts.require(name);
        let contract = arts.at(arts.address);
        await contract.setInitialApplicationAddress(app.address);
    }


    await deployer.deploy(artifacts.require("Token"));
    utils.toLog("    Contract: Token" );
    await deployer.deploy(artifacts.require("TokenSCADAVariable"));
    utils.toLog("    Contract: TokenSCADAVariable" );
    await deployer.deploy(artifacts.require("ExtraFundingInputMarketing"));
    utils.toLog("    Contract: ExtraFundingInputMarketing" );

    await deployer.deploy(artifacts.require("FundingInputDirect"));     // FundingInputDirect: 0xb05faba79ac993dc1ff7e3a0a764c3d0478cdc1f
    utils.toLog("    Contract: FundingInputDirect" );

    await deployer.deploy(artifacts.require("FundingInputMilestone"));  // FundingInputMilestone: 0x91ca47b9ec3187c77f324281a1851f4b991103f1
    utils.toLog("    Contract: FundingInputMilestone" );


    let FundingInputDirect = artifacts.require("FundingInputDirect");
    let FundingInputDirectObject = await FundingInputDirect.at( FundingInputDirect.address );

    let FundingInputMilestone = artifacts.require("FundingInputMilestone");
    let FundingInputMilestoneObject = await FundingInputMilestone.at( FundingInputMilestone.address );


    deployedAssets = assets.map(mapDeployedAssets);

    utils.toLog("  Link assets to ApplicationEntity");

    for(let d = 0; d < deployedAssets.length; d++) {
        let entity = deployedAssets[d];
        let receipt = await app[entity.method]( entity.address );
        let eventFilter = await utils.hasEvent(receipt, 'EventAppEntityInitAsset(bytes32,address)');
        utils.toLog("    Successfully linked: " +utils.colors.green+ web3util.toAscii(eventFilter[0].topics[1]) );
    }

    utils.toLog("  Link ApplicationEntity to GatewayInterface");

    let receipt = await app.linkToGateway(GatewayInterface.address, "https://blockbits.io");
    let eventFilter = utils.hasEvent(receipt, 'EventAppEntityReady(address)');
    utils.toLog("    "+utils.colors.green+"EventAppEntityReady => " + eventFilter.length+utils.colors.none);

    utils.toLog("  Apply initial Settings into Entities:");

    let TokenManagerAsset = utils.getAssetContractByName(deployedAssets, "TokenManager");
    let MilestonesAsset = utils.getAssetContractByName(deployedAssets, "Milestones");
    let FundingAsset = utils.getAssetContractByName(deployedAssets, "Funding");

    // Setup token manager
    let TokenManagerAssetContract = await artifacts.require(TokenManagerAsset.name);
    TokenManagerAssetContract = await TokenManagerAssetContract.at(TokenManagerAsset.address);

    let ScadaAssetContract = await artifacts.require("TokenSCADAVariable");
    let ScadaAsset = await ScadaAssetContract.at(ScadaAssetContract.address);
    await ScadaAsset.addSettings(FundingAsset.address);

    utils.toLog("  Added TokenSCADAVariable Settings");

    let tokenContract = await artifacts.require("Token");
    let tokenAsset = await tokenContract.at(tokenContract.address);

    await tokenAsset.transferOwnership(TokenManagerAssetContract.address);

    utils.toLog("  Added Token Settings");

    let ExtraContract = await artifacts.require("ExtraFundingInputMarketing");
    let ExtraAsset = await ExtraContract.at(ExtraContract.address);

    await ExtraAsset.addSettings(
        TokenManagerAssetContract.address,        // TokenManager Entity address
        settings.platformWalletAddress,           // Output Address
        settings.extra_marketing.hard_cap,        // 300 ether hard cap
        settings.extra_marketing.tokens_per_eth,  // 20 000 BBX per ETH
        settings.extra_marketing.start_date,      // 31.01.2018
        settings.extra_marketing.end_date         // 10.03.2018
    );

    utils.toLog("  Added ExtraFundingInput Settings");


    await TokenManagerAssetContract.addSettings(
        ScadaAsset.address, tokenContract.address, ExtraAsset.address
    );

    utils.toLog("  Added TokenManager Settings");

    // Setup Funding
    let FundingAssetContract = await artifacts.require(FundingAsset.name);
    FundingAssetContract = await FundingAssetContract.at(FundingAsset.address);

    for (let i = 0; i < settings.funding_periods.length; i++) {

        let stage = settings.funding_periods[i];
        await FundingAssetContract.addFundingStage(
            stage.name,
            stage.start_time,
            stage.end_time,
            stage.amount_cap_soft,
            stage.amount_cap_hard,
            stage.methods,
            stage.minimum_entry,
            stage.fixed_tokens,
            stage.price_addition_percentage,
            stage.token_share_percentage
        );
    }

    // add global funding settings like hard cap and such
    await FundingAssetContract.addSettings(
        settings.platformWalletAddress,
        settings.bylaws["funding_global_soft_cap"],
        settings.bylaws["funding_global_hard_cap"],
        settings.bylaws["token_sale_percentage"],
        FundingInputDirect.address,
        FundingInputMilestone.address
    );

    utils.toLog("  Added Funding Settings");

    // Setup Milestones
    let MilestonesAssetContract = await artifacts.require(MilestonesAsset.name);
    MilestonesAssetContract = await MilestonesAssetContract.at(MilestonesAsset.address);

    for (let i = 0; i < settings.milestones.length; i++) {
        let milestone = settings.milestones[i];
        await MilestonesAssetContract.addRecord(
            milestone.name,
            milestone.description,
            milestone.duration,
            milestone.funding_percentage,
        );
    }

    utils.toLog("  Added Milestones Settings");

    utils.toLog(
        '  Lock and initialized Settings into Entities:\n'+
        '  ----------------------------------------------------------------\n');

    utils.toLog("  Set assets ownership and initialize");



    for(let i = 0; i < deployedAssets.length; i++) {
        let entity = deployedAssets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at(arts.address);

        let eventFilter = await utils.hasEvent(
            await contract.applyAndLockSettings(),
            'EventRunBeforeApplyingSettings(bytes32)'
        );

        if (eventFilter.length === 1) {
            utils.toLog("    Successfully locked: " + utils.colors.green + name + utils.colors.none);
        } else {
            throw name + ': EventRunBeforeApplyingSettings event not received.';
        }


    }

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - VALIDATION\n'+
        '  ----------------------------------------------------------------\n'
    );


    let gw = await GatewayInterface.at( GatewayInterface.address );
    let gwAppAddress = await gw.currentApplicationEntityAddress.call();
    if(gwAppAddress === app.address) {
        utils.toLog("    " + GatewayInterface.contract_name + ": currentApplicationEntityAddress is correct");
    } else {
        throw "Invalid ApplicationEntity address stored in GatewayInterface";
    }

    let appInit = await app._initialized.call();
    if(appInit.toString() === "true") {
        utils.toLog("    " + ApplicationEntity.contract_name + ": is initialized correctly");
    } else {
        throw "ApplicationEntity is not initialized";
    }

    let AssetCollectionNum = await app.AssetCollectionNum.call();
    if(AssetCollectionNum.toString() === deployedAssets.length.toString() ) {
        utils.toLog("    " + ApplicationEntity.contract_name + ": contains the correct number of assets ["+AssetCollectionNum+"]");
    } else {
        throw "ApplicationEntity AssetCollectionNum issue has ["+AssetCollectionNum.toString()+"] should have ["+deployedAssets.length+"]";
    }

    for(let i = 0; i < deployedAssets.length; i++) {
        let entity = deployedAssets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at(arts.address);

        let _initialized = await contract._initialized.call();
        let _settingsApplied = await contract._settingsApplied.call();

        if(_initialized.toString() === "true" && _settingsApplied.toString() === "true") {
            utils.toLog("    "+utils.colors.green+ name +utils.colors.white+": locked and settings applied.") ;
        } else {
            throw utils.colors.green+ name +utils.colors.none+" is not locked or has settings not applied" ;
        }

    }

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - DONE\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog(
        ' Entities:\n'+
        '  ----------------------------------------------------------------\n');

    utils.toLog("    "+GatewayInterface.contract_name+": "+ GatewayInterface.address);
    utils.toLog("    "+ApplicationEntity.contract_name+": "+ ApplicationEntity.address);

    entities.map((entity) => {
        utils.toLog("      "+entity.contract_name+": "+ entity.address);
    });

    // funding inputs
    let FundingInputDirectAddress = await FundingAssetContract.DirectInput.call();
    let FundingInputMilestoneAddress = await FundingAssetContract.MilestoneInput.call();

    utils.toLog("  ----------------------------------------------------------------\n");
    utils.toLog("    InputDirect:    "+ FundingInputDirectAddress);
    utils.toLog("    InputMilestone: "+ FundingInputMilestoneAddress);
    utils.toLog("    InputMarketing: "+ ExtraAsset.address);


    utils.toLog("  ----------------------------------------------------------------");
    utils.toLog("    TokenSCADA:     "+ ScadaAsset.address);
    utils.toLog("    TokenEntity:    "+ tokenAsset.address);
    utils.toLog("  ----------------------------------------------------------------\n");


}

addBylawsIntoApp = async function (app, settings) {

    for (let key in settings.bylaws) {

        if(key.length > 32) {
            throw "addBylawsIntoApp: ["+key+"] Bylaws key length higher than allowed 32 bytes!";
        }
        let value = settings.bylaws[key];
        // store string bylaw

        if(typeof value === "string") {
            await app.setBylawBytes32(key, value);
        } else {
            // uints and booleans
            // convert booleans to 1 / 0
            if(typeof value === "boolean") {
                if(value === true) {
                    value = 1;
                } else {
                    value = 0;
                }
            }
            await app.setBylawUint256(key, value.toString());
        }
    }
};


async function doTest(deployer) {
    await deployer.deploy("NewsContract");
}

module.exports = (deployer, network) => {

    if(settings.doDeployments) {
        deployer.then(async () => await doStage(deployer));
    }

};


