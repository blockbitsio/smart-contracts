module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    contract('Bounty Manager', accounts => {

        let TestBuildHelper;
        let deploymentAddress = accounts[0];
        let investorAddress = accounts[1];
        let assetName = "BountyManager";
        let FundingContract, BountyManagerContract, TokenEntity;

        // settings
        let platformWalletAddress = accounts[8];

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLock();

            FundingContract = await TestBuildHelper.getDeployedByName("Funding");
            BountyManagerContract = await TestBuildHelper.getDeployedByName("BountyManager");

            let TokenManager = await TestBuildHelper.getDeployedByName("TokenManager");
            let TokenEntityAddress = await TokenManager.TokenEntity.call();

            let TokenEntityContract = await helpers.getContract("Token");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);
        });

        it('token balance matches bylaws', async () => {
            let Balance = await TokenEntity.balanceOf.call(BountyManagerContract.address.toString());
            let supply = settings.token.supply;
            let percentage = settings.bylaws["token_bounty_percentage"];
            let bountyValid = supply.div( 100 );
            bountyValid = bountyValid.mul( percentage );
            assert.equal(Balance.toString(), bountyValid.toString(), 'balances should match');
        });

        context('Before Funding ended', async () => {

            it('throws if sendBounty is called', async () => {
                let state = await FundingContract.CurrentEntityState.call();
                let notState = await FundingContract.getEntityState.call("SUCCESSFUL_FINAL");
                assert.notEqual(state.toString(), notState.toString(), 'state should not be SUCCESSFUL_FINAL');

                return helpers.assertInvalidOpcode(async () => {
                    await BountyManagerContract.sendBounty( accounts[5], 1 );
                });
            });

        });

        context('After Funding ended', async () => {

            let investor1wallet = accounts[10];
            let investor1amount = 10000 * helpers.solidity.ether;
            let investor2wallet = accounts[11];
            let investor2amount = 10000 * helpers.solidity.ether;
            let investor3wallet = accounts[12];
            let investor3amount = 10000 * helpers.solidity.ether;
            let investor4wallet = accounts[13];
            let investor4amount = 10000 * helpers.solidity.ether;

            let end_time, start_time;

            beforeEach(async () => {

                // funding inputs
                let FundingInputDirectAddress = await FundingContract.DirectInput.call();
                let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();
                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

                let FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                let FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

                // time travel to pre ico start time
                await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After PRE ICO START", false);

                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: investor3amount,
                    from: investor3wallet
                });

                await FundingInputMilestone.sendTransaction({
                    value: investor4amount,
                    from: investor4wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);
            });


            it('throws if sendBounty is called by anyone else but deployer', async () => {
                let state = await FundingContract.CurrentEntityState.call();
                let notState = await FundingContract.getEntityState.call("SUCCESSFUL_FINAL");
                assert.equal(state.toString(), notState.toString(), 'state should be SUCCESSFUL_FINAL');

                return helpers.assertInvalidOpcode(async () => {
                    await BountyManagerContract.sendBounty( accounts[5], 1, {from: accounts[1]} );
                });
            });

            it('throws if sendBounty amount is higher than remaining value', async () => {

                let Balance = await TokenEntity.balanceOf.call(BountyManagerContract.address.toString());
                Balance = Balance.add(1);

                return helpers.assertInvalidOpcode(async () => {
                    await BountyManagerContract.sendBounty( accounts[5], Balance );
                });
            });

            it('works if sendBounty is called by deployer and value is lower than remaining', async () => {
                await BountyManagerContract.sendBounty( accounts[5], 1 );
                let Balance = await TokenEntity.balanceOf.call(accounts[5]);
                assert.equal(Balance.toString(), 1, 'balance should be 1');
            });
        });

    });
};
