module.exports = function (setup) {
    // obsolete
    return;

    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Funding Asset - Payments', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "Funding";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, myFundingVault, tx;

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName, ["TokenManager", "FundingManager", "Milestones"] );
            await TestBuildHelper.AddAssetSettingsAndLock("TokenManager");
            await TestBuildHelper.AddAssetSettingsAndLock("FundingManager");
            await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            // apply and lock settings in funding
            await TestBuildHelper.AddAssetSettingsAndLock(assetName);

            // funding inputs
            let FundingInputDirectAddress = await assetContract.DirectInput.call();
            let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            tx = await assetContract.doStateChanges(true);

        });

        it('TokenSCADA provides the correct token stake for current funding phase', async () => {
            // 1 ether payment total from 1 account, results in owning total stage supply
            // add payment of 1 ether
            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            myFundingVault = await TestBuildHelper.getMyVaultAddress(investorWallet1);

            let FundingPeriodId = 0;
            let FundingSettings = await assetContract.getFundingStageVariablesRequiredBySCADA.call(FundingPeriodId);
            // let token_share_percentage = FundingSettings[0];
            let amount_raised = FundingSettings[1];

            let FundingVaultAmountDirect = await myFundingVault.amount_direct.call();
            assert.equal(FundingVaultAmountDirect.toString(), amount_raised.toString(), "FundingVault Amount and Funding Contract Amount mismatch!");

            let TokenStake = await myFundingVault.getMyTokenStakeInCurrentFunding.call({from: investorWallet1});
            let expectedTokens = await TestBuildHelper.getTokenStakeInFundingPeriod(FundingPeriodId, DirectPaymentValue);
            assert.equal(TokenStake.toString(), expectedTokens.toString(), "Token stake value mismatch!");
        });


        it('TokenSCADA provides the correct token stake when buying multiple times', async () => {

            // add payment of 1 ether
            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            myFundingVault = await TestBuildHelper.getMyVaultAddress(investorWallet1);

            // second payment of 2 ether
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue * 2, from: investorWallet1});

            let FundingPeriodId = 0;
            let TokenStake = await myFundingVault.getMyTokenStakeInCurrentFunding.call({from: investorWallet1});
            let expectedTokens = await TestBuildHelper.getTokenStakeInFundingPeriod(FundingPeriodId, DirectPaymentValue * 3);
            assert.equal(TokenStake.toString(), expectedTokens.toString(), "Token stake value mismatch!");
        });


        it('TokenSCADA provides the correct token stake when multiple investors are buying multiple times', async () => {

            // investorWallet1 - add payment of 1 ether
            let investorWallet1PaymentValue = 0;
            let DirectPaymentValue = 1 * helpers.solidity.ether;
            investorWallet1PaymentValue+= DirectPaymentValue;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            myFundingVault = await TestBuildHelper.getMyVaultAddress(investorWallet1);

            // investorWallet1 - second payment
            investorWallet1PaymentValue+= DirectPaymentValue;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});

            let investorWallet2PaymentValue = 0;
            investorWallet2PaymentValue+=DirectPaymentValue;
            // investorWallet2 - first payment
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});
            let investor2FundingVault = await TestBuildHelper.getMyVaultAddress(investorWallet2);


            let FundingPeriodId = 0;
            let TokenStake = new helpers.BigNumber(
                await myFundingVault.getMyTokenStakeInCurrentFunding.call({from: investorWallet1})
            );

            let expectedTokens = new helpers.BigNumber(
                await TestBuildHelper.getTokenStakeInFundingPeriod(FundingPeriodId, investorWallet1PaymentValue)
            );
            assert.equal(expectedTokens.toString(), TokenStake.toString(), "Token stake value mismatch!");

            TokenStake = new helpers.BigNumber(
                await investor2FundingVault.getMyTokenStakeInCurrentFunding.call({from: investorWallet2})
            );
            expectedTokens = new helpers.BigNumber(
                await TestBuildHelper.getTokenStakeInFundingPeriod(FundingPeriodId, investorWallet2PaymentValue)
            );
            assert.equal(TokenStake.toString(), expectedTokens.toString(), "Token stake value mismatch!");

        });
    });
};

