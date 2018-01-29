module.exports = function (setup) {
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
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept();
            assetContract = await TestBuildHelper.getDeployedByName("Funding");

            // funding inputs
            let FundingInputDirectAddress = await assetContract.DirectInput.call();
            let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

        });

        it('payments do not exist yet, accepts payment that is larger than remaining cap, and returns what\'s left back to the investor', async() => {

            // tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            // tx = await assetContract.doStateChanges();
            // await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

            // let DirectPaymentValue = 2000 * helpers.solidity.ether;
            // tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
            // await helpers.utils.showGasUsage(helpers, tx, "     ↓ Direct Payment:");

            // tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});
            // await helpers.utils.showGasUsage(helpers, tx, "     ↓ Direct Payment:");

            let investor5amount = new helpers.BigNumber( 5000 * helpers.solidity.ether );
            let ValueOverCurrentCap = await assetContract.getValueOverCurrentCap.call(investor5amount);
            let ContributedValue = investor5amount.sub(ValueOverCurrentCap);
            let EtherBalanceStart = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);

            // since the investor calls this, we need to take GasUsage into account.
            tx = await FundingInputDirect.sendTransaction({value: investor5amount, from: investorWallet5});
            let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
            let gasPrice = await helpers.utils.getGasPrice(helpers);
            let gasDifference = gasUsed.mul(gasPrice);

            await helpers.utils.showGasUsage(helpers, tx, "     ↓ Direct Payment with value over cap:");

            let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);
            let EtherBalanceInitialMinusContributed = EtherBalanceStart.sub(ContributedValue);
            EtherBalanceInitialMinusContributed = EtherBalanceInitialMinusContributed.sub(gasDifference);

            assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialMinusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialMinusContributed");

            // tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});
            // await helpers.utils.showGasUsage(helpers, tx, "     ↓ Direct Payment:");
        });

        it('payments exist, accepts payment that is larger than remaining cap, and returns what\'s left back to the investor', async() => {

            // tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            // tx = await assetContract.doStateChanges();
            // await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

            let DirectPaymentValue = 2000 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

            let investor5amount = new helpers.BigNumber( 10000 * helpers.solidity.ether );
            let ValueOverCurrentCap = await assetContract.getValueOverCurrentCap.call(investor5amount);
            let ContributedValue = investor5amount.sub(ValueOverCurrentCap);
            let EtherBalanceStart = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);

            // since the investor calls this, we need to take GasUsage into account.
            tx = await FundingInputDirect.sendTransaction({value: investor5amount, from: investorWallet5});
            let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
            let gasPrice = await helpers.utils.getGasPrice(helpers);
            let gasDifference = gasUsed.mul(gasPrice);

            await helpers.utils.showGasUsage(helpers, tx, "     ↓ Direct Payment with value over cap:");

            let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);
            let EtherBalanceInitialMinusContributed = EtherBalanceStart.sub(ContributedValue);
            EtherBalanceInitialMinusContributed = EtherBalanceInitialMinusContributed.sub(gasDifference);

            assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialMinusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialMinusContributed");

        });

        it('throws if cap is already reached, even if state change is not done yet. ', async() => {

            // tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            // tx = await assetContract.doStateChanges();
            // await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

            let DirectPaymentValue = 2000 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

            let investor5amount = new helpers.BigNumber( 10000 * helpers.solidity.ether );
            let ValueOverCurrentCap = await assetContract.getValueOverCurrentCap.call(investor5amount);
            let ContributedValue = investor5amount.sub(ValueOverCurrentCap);
            let EtherBalanceStart = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);

            // since the investor calls this, we need to take GasUsage into account.
            tx = await FundingInputDirect.sendTransaction({value: investor5amount, from: investorWallet5});
            let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
            let gasPrice = await helpers.utils.getGasPrice(helpers);
            let gasDifference = gasUsed.mul(gasPrice);

            let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investorWallet5);
            let EtherBalanceInitialMinusContributed = EtherBalanceStart.sub(ContributedValue);
            EtherBalanceInitialMinusContributed = EtherBalanceInitialMinusContributed.sub(gasDifference);

            assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialMinusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialMinusContributed");

            return helpers.assertInvalidOpcode(async () => {
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});
            });
        });

        /*

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

        */
    });
};

