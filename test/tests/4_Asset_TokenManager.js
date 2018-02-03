module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    contract('TokenManager Asset', accounts => {
        let assetContract, TokenManagerContract, FundingContract, tx, TestBuildHelper = {}, SCADAContract, TokenContract,
            MarketingContract;
        let assetName = "TokenManager";

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, accounts[10]);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLock();

            TokenManagerContract = await TestBuildHelper.getDeployedByName("TokenManager");
            FundingContract = await TestBuildHelper.getDeployedByName("Funding");
            SCADAContract = await TestBuildHelper.getDeployedByName("TokenSCADAVariable");
            TokenContract = await TestBuildHelper.getDeployedByName("Token");
            MarketingContract = await TestBuildHelper.getDeployedByName("ExtraFundingInputMarketing");

        });

        context("addSettings()", async () => {

            it('properly sets up the tokens if initialized', async () => {

                let TokenEntityContractAddress = await TokenManagerContract.TokenEntity.call();
                let SCADAEntityContractAddress = await TokenManagerContract.TokenSCADAEntity.call();
                let MarketingContractAddress = await TokenManagerContract.MarketingMethodAddress.call();
                assert.isAddress(TokenEntityContractAddress, 'TokenEntity is not an address.');
                assert.equal(TokenEntityContractAddress.toString(), TokenContract.address.toString(), 'Deployed Token contract address mismatch!')
                assert.equal(SCADAEntityContractAddress.toString(), SCADAContract.address.toString(), 'Deployed SCADA contract address mismatch!')
                assert.equal(MarketingContractAddress.toString(), MarketingContract.address.toString(), 'Deployed Marketing contract address mismatch!')

                let TokenEntityContract = await helpers.getContract("TestToken").at(TokenEntityContractAddress);
                assert.equal(await TokenEntityContract.name.call(), token_settings.name, 'Deployed Token contract name mismatch!')
            });

        });

        context("getTokenSCADARequiresHardCap()", async () => {

            it('returns boolean value stored in SCADA Contract', async () => {

                let TokenSCADAEntityAddress = await TokenManagerContract.TokenSCADAEntity.call();
                let TokenSCADAEntityContract = await helpers.getContract("TestTokenSCADAVariable").at(TokenSCADAEntityAddress);

                let ContractVal = await TokenSCADAEntityContract.SCADA_requires_hard_cap.call();
                let MethodVal = await TokenManagerContract.getTokenSCADARequiresHardCap.call();

                assert.equal(ContractVal, MethodVal, 'SCADA_requires_hard_cap mismatch!');
            });
        });
    });
};