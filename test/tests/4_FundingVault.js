module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;


    contract('Funding Vault', accounts => {

        let TestBuildHelper;
        let deploymentAddress = accounts[0];
        let investorAddress = accounts[1];
        let assetContract;
        let assetName = "FundingVault";
        let FundingContract, MilestonesContract, TokenManagerContract, ProposalsContract;
        let FUNDING_DIRECT_METHOD = 1;
        let FUNDING_MILESTONE_METHOD = 2;

        // settings
        let platformWalletAddress = accounts[8];

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept();

            FundingContract = await TestBuildHelper.getDeployedByName("Funding");
            MilestonesContract = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsContract = await TestBuildHelper.getDeployedByName("Proposals");
            TokenManagerContract = await TestBuildHelper.getDeployedByName("TokenManager");
            assetContract = await helpers.getContract("Test" + assetName).new();
        });

        it('initializes with empty properties', async () => {
            assert.equal(await assetContract.vaultOwner.call(), 0x0, 'vaultOwner address should be empty');
            assert.equal(await assetContract.outputAddress.call(), 0x0, 'outputAddress address should be empty');
            assert.equal(await assetContract.managerAddress.call(), 0x0, 'managerAddress address should be empty');
            assert.isFalse(await assetContract._initialized.call(), false, '_initialized should be false');
        });

        it('addPayment throws if not initialized', async () => {
            return helpers.assertInvalidOpcode(async () => {
                await assetContract.addPayment(FUNDING_DIRECT_METHOD, 1, {value: 1, from: deploymentAddress})
            });
        });

        context('initialize()', async () => {

            it('throws if called when already initialized', async () => {
                await assetContract.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.initialize(
                        investorAddress,
                        platformWalletAddress,
                        await FundingContract.address,
                        await MilestonesContract.address,
                        await ProposalsContract.address,
                        {from: deploymentAddress}
                    );
                });
            });

            it('works if settings are correct and has not been initialized before', async () => {
                await assetContract.initialize(
                    investorAddress,
                    platformWalletAddress,
                    await FundingContract.address,
                    await MilestonesContract.address,
                    await ProposalsContract.address,
                    {from: deploymentAddress}
                );
                assert.equal(await assetContract.vaultOwner.call(), investorAddress, 'vaultOwner address should not be empty');
                assert.equal(await assetContract.outputAddress.call(), platformWalletAddress, 'outputAddress address should not be empty');
                assert.equal(await assetContract.managerAddress.call(), deploymentAddress, 'managerAddress address should not be empty');
                assert.isTrue(await assetContract._initialized.call(), '_initialized should be true');
            });
        });

        context('addPayment()', async () => {

            beforeEach(async () => {
                await assetContract.initialize(
                    investorAddress,
                    platformWalletAddress,
                    await FundingContract.address,
                    await MilestonesContract.address,
                    await ProposalsContract.address,
                    {from: deploymentAddress}
                );
                assert.equal(await assetContract.vaultOwner.call(), investorAddress, 'vaultOwner address should not be empty');
                assert.equal(await assetContract.outputAddress.call(), platformWalletAddress, 'outputAddress address should not be empty');
                assert.equal(await assetContract.managerAddress.call(), deploymentAddress, 'managerAddress address should not be empty');
                assert.isTrue(await assetContract._initialized.call(), '_initialized should be true');
            });

            it('FUNDING_DIRECT_METHOD - works with correct settings and caller', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, 1, {value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'EventPaymentReceived event not received.');

                let purchaseRecordsNum = await assetContract.purchaseRecordsNum.call();
                assert.equal(purchaseRecordsNum, 1, 'purchaseRecordsNum is not 1.');

                let Record = await assetContract.purchaseRecords.call(purchaseRecordsNum);
                let RecordAmountInEther = helpers.web3util.fromWei(Record[2], "ether");
                let SentAmountInEther = helpers.web3util.fromWei(sendAmount, "ether");
                assert.equal(RecordAmountInEther, SentAmountInEther, 'Record Amount is invalid.');

                let contractBalance = await helpers.utils.getBalance(helpers.artifacts, assetContract.address.toString());
                let contractBalanceInEther = helpers.web3util.fromWei(contractBalance, "ether");
                assert.equal(SentAmountInEther, contractBalanceInEther, 'Contract Amount is invalid.');

                let amountDirect = await assetContract.amount_direct.call();
                let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                assert.equal(amountDirectInEther, SentAmountInEther, 'amount_direct is invalid.');
            });

            it('FUNDING_MILESTONE_METHOD - works with correct settings and caller', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_MILESTONE_METHOD, 1, {value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'EventPaymentReceived event not received.');

                let purchaseRecordsNum = await assetContract.purchaseRecordsNum.call();
                assert.equal(purchaseRecordsNum, 1, 'purchaseRecordsNum is not 1.');

                let Record = await assetContract.purchaseRecords.call(purchaseRecordsNum);
                let RecordAmountInEther = helpers.web3util.fromWei(Record[2], "ether");
                let SentAmountInEther = helpers.web3util.fromWei(sendAmount, "ether");
                assert.equal(RecordAmountInEther, SentAmountInEther, 'Record Amount is invalid.');

                let contractBalance = await helpers.utils.getBalance(helpers.artifacts, assetContract.address.toString());
                let contractBalanceInEther = helpers.web3util.fromWei(contractBalance, "ether");
                assert.equal(SentAmountInEther, contractBalanceInEther, 'Contract Amount is invalid.');

                let amountMilestone = await assetContract.amount_milestone.call();
                let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                assert.equal(amountMilestoneInEther, SentAmountInEther, 'amount_milestone is invalid.');
            });

            it('throws if msg.value is missing', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, 1);
                });
            });

            it('throws if payment method does not exist', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(3, 1, {value: 1 * helpers.solidity.ether});
                });
            });

            it('throws if called by other address than manager (funding contract)', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, 1, {value: sendAmount, from: accounts[1]})
                });
            });

            it('handles multiple payments, irregardless of funding method provided', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, 1,{value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'Direct Payment: EventPaymentReceived event not received.');

                eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_MILESTONE_METHOD, 1, {value: sendAmount * 5 , from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'Milestone Payment: EventPaymentReceived event not received.');

            });
        });
    });
};
