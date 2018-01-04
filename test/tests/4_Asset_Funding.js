module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Funding Asset', accounts => {

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

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept("Funding");

            assetContract = await TestBuildHelper.getDeployedByName("Funding");
        });

        it('deploys with no Funding Stages', async () => {
            assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum should be 0!');
        });

        it('deploys with no multiSigOutputAddress', async () => {
            assert.equal(await assetContract.multiSigOutputAddress.call(), 0, 'multiSigOutputAddress should be 0!');
        });

        it('deploys with no Funding Inputs', async () => {
            let NewfundingContract = await helpers.getContract("TestFunding").new();
            assert.equal(await NewfundingContract.DirectInput.call(), 0, 'DirectInput should be 0!');
            assert.equal(await NewfundingContract.MilestoneInput.call(), 0, 'MilestoneInput should be 0!');
        });

        it('has Funding Inputs once initialized', async () => {
            assert.notEqual(await assetContract.DirectInput.call(), 0, 'DirectInput should not be 0!');
            assert.notEqual(await assetContract.MilestoneInput.call(), 0, 'MilestoneInput should not be 0!');
        });

        context("addSettings()", async () => {

            it('throws if called when settings are locked', async () => {
                await assetContract.applyAndLockSettings();
                helpers.assertInvalidOpcode(async () => {
                    await assetContract.addSettings(
                        platformWalletAddress,
                        settings.bylaws["funding_global_soft_cap"],
                        settings.bylaws["funding_global_hard_cap"]
                    );
                });
            });


            it('throws if global soft cap is greater than global hard cap', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await assetContract.addSettings(
                        platformWalletAddress,
                        settings.bylaws["funding_global_hard_cap"],
                        settings.bylaws["funding_global_soft_cap"]
                    );
                });
            });

            it('properly sets up the funding settings', async () => {

                let tx = await assetContract.addSettings(
                    platformWalletAddress,
                    settings.bylaws["funding_global_soft_cap"],
                    settings.bylaws["funding_global_hard_cap"]
                );

                let softCap = await assetContract.GlobalAmountCapSoft.call();
                let hardCap = await assetContract.GlobalAmountCapHard.call();
                assert.equal(
                    await assetContract.multiSigOutputAddress.call(),
                    platformWalletAddress,
                    'multiSigOutputAddress should not be 0!'
                );
                assert.equal(
                    softCap.toString(),
                    settings.bylaws["funding_global_soft_cap"].toString(),
                    'GlobalAmountCapSoft should not be 0!'
                );
                assert.equal(
                    hardCap.toString(),
                    settings.bylaws["funding_global_hard_cap"].toString(),
                    'GlobalAmountCapHard should not be 0!'
                );
            });

        });

        context("first funding stage", async () => {

            it('successfully creates a funding stage with proper settings', async () => {
                await TestBuildHelper.addFundingStage(0);
                assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 1!');
            });

            it('throws if end time is before or equal to start time', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await TestBuildHelper.addFundingStage(0, {
                        end_time: setup.settings.funding_periods[0].start_time - 1
                    });
                });
                assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
            });

            if(setup.settings.tokenSCADA.requires_global_hard_cap === true) {

                context("SCADA Requires Record Hard Cap", async () => {

                    it('throws if hard cap is 0', async () => {
                        helpers.assertInvalidOpcode(async () => {
                            await TestBuildHelper.addFundingStage(0, {
                                amount_cap_hard: 0
                            });
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
                    });

                    it('throws if record soft cap is higher than hard cap', async () => {
                        helpers.assertInvalidOpcode(async () => {
                            await TestBuildHelper.addFundingStage(0, {
                                amount_cap_soft: 15,
                                amount_cap_hard: 10
                            });
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
                    });

                    it('works if hard cap is higher than soft cap which is higher than 0', async () => {
                        await TestBuildHelper.addFundingStage(0, {
                            amount_cap_soft: 5000,
                            amount_cap_hard: 10000
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 1!');
                    });

                });
            }
            else if(setup.settings.tokenSCADA.requires_global_hard_cap === false)
            {

                context("SCADA Disallows Record Hard Cap, Requires Globals", async () => {


                    it('throws if soft cap exists', async () => {
                        helpers.assertInvalidOpcode(async () => {
                            await TestBuildHelper.addFundingStage(0, {
                                amount_cap_soft: 15,
                                amount_cap_hard: 0
                            });
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
                    });

                    it('throws if hard cap exists', async () => {
                        helpers.assertInvalidOpcode(async () => {
                            await TestBuildHelper.addFundingStage(0, {
                                amount_cap_soft: 0,
                                amount_cap_hard: 15
                            });
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
                    });

                    it('works if hard cap and soft cap is 0', async () => {
                        await TestBuildHelper.addFundingStage(0, {
                            amount_cap_soft: 0,
                            amount_cap_hard: 0
                        });
                        assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                    });

                });
            }


            it('throws if token selling percentage is higher than 100%', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await TestBuildHelper.addFundingStage(0, {
                        token_share_percentage: 101
                    });
                });
                assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
            });

            context("when at least 1 funding stage already exists", async () => {

                beforeEach(async () => {
                    await TestBuildHelper.addFundingStage(0);
                });

                it('successfully creates the second funding stage with proper settings', async () => {
                    await TestBuildHelper.addFundingStage(1);
                    assert.equal(await assetContract.FundingStageNum.call(), 2, 'FundingStageNum is not 0!');
                });

                it('throws if new funding stage start time overlaps existing stage', async () => {
                    helpers.assertInvalidOpcode(async () => {
                        await TestBuildHelper.addFundingStage(1, {
                            start_time: setup.settings.funding_periods[0].end_time - 1
                        });
                    });
                    assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                });

                it('throws if new funding stage + existing stage sell more than 100% of tokens', async () => {

                    helpers.assertInvalidOpcode(async () => {
                        await TestBuildHelper.addFundingStage(1, {
                            token_share_percentage: 100
                        });
                    });
                    assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                });

            });
        });



        context("funding stages added, asset initialized", async () => {
            let FundingInputDirect, FundingInputMilestone;

            beforeEach( async () => {

                assetContract = await TestBuildHelper.AddAssetSettingsAndLock("Funding");

                assert.isTrue(await assetContract._initialized.call(), 'Asset not initialized');
                assert.isTrue(await assetContract._settingsApplied.call(), 'Asset settings not applied');

                let FundingInputDirectAddress = await assetContract.DirectInput.call();
                let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

                FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            });

            it('has correct Funding Inputs after ApplicationEntity grabs asset ownership and initializes it', async () => {
                assert.isAddress(await assetContract.DirectInput.call(), 'DirectInput should be a valid address');
                assert.isAddress(await assetContract.MilestoneInput.call(), 'MilestoneInput should be a valid address');
            });

            context("receivePayment()", async () => {

                it('throws if called directly in the Funding contract', async () => {
                    let PaymentValue = 0.1 * helpers.solidity.ether;
                    return helpers.assertInvalidOpcode(async () => {
                        await assetContract.receivePayment(investorWallet1, 1, {from: investorWallet1, value: PaymentValue})
                    });
                });

                it('throws if caller is not funding asset', async () => {
                    let FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");
                    let DirectPaymentValue = 1 * helpers.solidity.ether;
                    helpers.assertInvalidOpcode(async () => {
                        await FundingManager.receivePayment( investorWallet1, 1, 1, {value: DirectPaymentValue, from: investorWallet1});
                    });
                });

                it('throws if _payment_method is not allowed', async () => {
                    let PaymentValue = 1 * helpers.solidity.ether;
                    let FundingInputMock = await helpers.getContract('TestFundingInputMock').new();
                    await assetContract.setTestFundingInputDirect(FundingInputMock.address.toString());
                    await FundingInputMock.setTestFundingAssetAddress(assetContract.address.toString());
                    return helpers.assertInvalidOpcode(async () => {
                        await FundingInputMock.sendTransaction({value: PaymentValue, from: investorWallet3});
                    });
                });
            });

            context("canAcceptPayment()", async () => {

                it('returns false if CurrentEntityState is not IN_PROGRESS', async () => {

                    let tx = await assetContract.canAcceptPayment.call(1 * helpers.solidity.ether);
                    assert.isFalse(tx, 'Should not accept payments');


                    // canAcceptPayment();
                    // hasRequiredStateChanges();

                    // tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    // await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

                    /*
                    let PaymentValue = 0.1 * helpers.solidity.ether;
                    let FundingInputMock = await helpers.getContract('TestFundingInputMock').new();
                    await assetContract.setTestFundingInputDirect(FundingInputMock.address.toString());
                    await FundingInputMock.setTestFundingAssetAddress(assetContract.address.toString());
                    return helpers.assertInvalidOpcode(async () => {
                        await FundingInputMock.sendTransaction({value: PaymentValue, from: investorWallet5});
                    });
                    */
                });

                context("CurrentEntityState is IN_PROGRESS", async () => {

                    beforeEach(async () => {
                        let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                        tx = await assetContract.doStateChanges();
                    });

                    it('returns false if ETH value is 0', async () => {
                        let tx = await assetContract.canAcceptPayment.call(0);
                        assert.isFalse(tx, 'Should not accept payments');
                    });

                    it('returns false if ETH value is smaller than minimum entry', async () => {
                        let tx = await assetContract.canAcceptPayment.call(1);
                        assert.isFalse(tx, 'Should not accept payments');
                    });

                    it('returns false if any State changes are required', async () => {
                        let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.end_time + 1);
                        let changes = await assetContract.hasRequiredStateChanges.call();
                        assert.isTrue(changes, 'Changes should be required');
                        tx = await assetContract.canAcceptPayment.call(1);
                        assert.isFalse(tx, 'Should not accept payments');
                    });

                });

            });

            context("Funding State: IN_PROGRESS", async () => {


                context("Funding Input: All", async () => {

                    it('has correct FundingAssetAddress', async () => {
                        let FundingAssetAddress = await FundingInputDirect.FundingAssetAddress.call();
                        assert.isAddress(FundingAssetAddress, 'FundingAssetAddress should be a valid address');
                        assert.equal(FundingAssetAddress, assetContract.address, 'FundingAssetAddress should be a ' + assetContract.address + ' address');
                    });

                    it('throws if msg.value is missing', async () => {
                        return helpers.assertInvalidOpcode(async () => {
                            await FundingInputDirect.sendTransaction({from: investorWallet1})
                        });
                    });

                    it('throws if FundingAssetAddress is not set', async () => {
                        let PaymentValue = 1 * helpers.solidity.ether;
                        let FundingInputMock = await helpers.getContract('TestFundingInputMock').new();
                        await FundingInputMock.setTestFundingAssetAddressToZero();
                        // await assetContract.setTestFundingInputDirect(FundingInputMock.address.toString());
                        return helpers.assertInvalidOpcode(async () => {
                            await FundingInputMock.sendTransaction({value: PaymentValue, from: investorWallet1});
                        });
                    });

                    it('throws if FundingAsset is not pointing to a Contract', async () => {
                        let PaymentValue = 1 * helpers.solidity.ether;
                        let FundingInput = await helpers.getContract('FundingInputDirect').new();
                        return helpers.assertInvalidOpcode(async () => {
                            await FundingInput.sendTransaction({value: PaymentValue, from: investorWallet1})
                        });
                    });

                    context("Funding Input: Direct", async () => {

                        beforeEach(async () => {
                            let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                            tx = await assetContract.doStateChanges();
                        });

                        it('has correct type id = 1', async () => {
                            let typeId = await FundingInputDirect.typeId.call();
                            assert.equal(typeId, 1, 'typeId should be 1');
                        });

                        it('accepts payments using fallback () method and stores in valut\'s direct pool', async () => {
                            let PaymentValue = 1 * helpers.solidity.ether;
                            let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');

                            let paymentTx = await FundingInputDirect.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });

                            let eventFilter = helpers.utils.hasEvent(
                                paymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            assert.equal(_method, 1, '_payment_method should be 1');
                            assert.equal(_value, PaymentValueInEther, '_value should be ' + PaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, PaymentValueInEther, 'Vault Contract balance should be ' + PaymentValueInEther);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);
                            let amountDirect = await vaultContract.amount_direct.call();
                            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                            assert.equal(amountDirectInEther, PaymentValueInEther, 'amount_direct is invalid.');

                            await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ Direct Payment:");
                        });

                        it('accepts second payment from same investor', async () => {
                            let PaymentValue = 1 * helpers.solidity.ether;
                            let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');

                            let paymentTx = await FundingInputDirect.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });

                            let eventFilter = helpers.utils.hasEvent(
                                paymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );
                            let secondPaymentTx = await FundingInputDirect.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });

                            eventFilter = helpers.utils.hasEvent(
                                secondPaymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            let TotalPaymentValues = PaymentValueInEther * 2;

                            assert.equal(_method, 1, '_payment_method should be 1');
                            assert.equal(_value, PaymentValueInEther, '_value should be ' + PaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, TotalPaymentValues, 'Vault Contract balance should be ' + TotalPaymentValues);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountDirect = await vaultContract.amount_direct.call();
                            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                            assert.equal(amountDirectInEther, TotalPaymentValues, 'amount_direct is invalid.');


                            await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ First Direct Payment:");
                            await helpers.utils.showGasUsage(helpers, secondPaymentTx, "     ↓ Second Direct Payment:");

                        });

                        it('accepts second payment from same investor using both payment methods ( Direct & Milestone )', async () => {
                            let DirectPaymentValue = 1 * helpers.solidity.ether;
                            let DirectPaymentValueInEther = helpers.web3util.fromWei(DirectPaymentValue, 'ether');

                            let MilestonePaymentValue = 2 * helpers.solidity.ether;
                            let MilestonePaymentValueInEther = helpers.web3util.fromWei(MilestonePaymentValue, 'ether');

                            // direct payment
                            let eventFilter = helpers.utils.hasEvent(
                                await FundingInputDirect.sendTransaction({
                                    value: DirectPaymentValue,
                                    from: investorWallet1
                                }),
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            // milestone payment
                            eventFilter = helpers.utils.hasEvent(
                                await FundingInputMilestone.sendTransaction({
                                    value: MilestonePaymentValue,
                                    from: investorWallet1
                                }),
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            let TotalPaymentValues = parseInt(DirectPaymentValueInEther) + parseInt(MilestonePaymentValueInEther);

                            assert.equal(_method, 2, '_payment_method should be 2');
                            assert.equal(_value, MilestonePaymentValueInEther, '_value should be ' + MilestonePaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, TotalPaymentValues, 'Vault Contract balance should be ' + TotalPaymentValues);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountDirect = await vaultContract.amount_direct.call();
                            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                            assert.equal(amountDirectInEther, DirectPaymentValueInEther, 'amount_direct is invalid.');

                            let amountMilestone = await vaultContract.amount_milestone.call();
                            let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                            assert.equal(amountMilestoneInEther, MilestonePaymentValueInEther, 'amount_milestone is invalid.');
                        });


                    });

                    context("Funding Input: Milestone", async () => {

                        beforeEach(async () => {
                            let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                            tx = await assetContract.doStateChanges();
                        });

                        it('has correct type id = 2', async () => {
                            let typeId = await FundingInputMilestone.typeId.call();
                            assert.equal(typeId, 2, 'typeId should be 2');
                        });

                        it('accepts payments using fallback () method and stores in valut\'s milestone pool', async () => {
                            let PaymentValue = 1 * helpers.solidity.ether;
                            let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');
                            let paymentTx = await FundingInputMilestone.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });
                            let eventFilter = helpers.utils.hasEvent(
                                paymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            assert.equal(_method, 2, '_payment_method should be 2');
                            assert.equal(_value, PaymentValueInEther, '_value should be ' + PaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, PaymentValueInEther, 'Vault Contract balance should be ' + PaymentValueInEther);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountMilestone = await vaultContract.amount_milestone.call();
                            let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                            assert.equal(amountMilestoneInEther, PaymentValueInEther, 'amount_milestone is invalid.');

                            await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ Milestone Payment:");

                            // showContractDebug(helpers, assetContract)

                        });
                    });
                });
            });
        });
    });
};

