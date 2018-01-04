module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('FundingManager Asset', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "FundingManager";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];
        let investorWallet6 = accounts[8];
        let investorWallet7 = accounts[9];
        let investorWallet8 = accounts[10];
        let investorWallet9 = accounts[11];
        let investorWallet10 = accounts[12];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, tx, FundingManager, FundingContract;
        let validation;

        let FundingBountyTokenPercentage = settings.bylaws["token_bounty_percentage"];
        let BountySupply = token_settings.supply.div( 100 );
        BountySupply = BountySupply.mul( FundingBountyTokenPercentage );
        let soldTokenSupply = token_settings.supply;
        soldTokenSupply = soldTokenSupply.sub( BountySupply );

        beforeEach(async () => {

            let SnapShotKey = "ApplicationInit";
            if (typeof snapshots[SnapShotKey] !== "undefined" && snapshotsEnabled) {
                // restore snapshot
                await helpers.web3.evm.revert(snapshots[SnapShotKey]);
                // save again because whomever wrote test rpc had the impression no one would ever restore twice.. dafuq
                snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();

            } else {

                TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
                await TestBuildHelper.deployAndInitializeApplication();
                await TestBuildHelper.AddAllAssetSettingsAndLock();

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            FundingContract = await TestBuildHelper.getDeployedByName("Funding");

            // funding inputs
            let FundingInputDirectAddress = await FundingContract.DirectInput.call();
            let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);
            FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");

        });

        context('Successful funding - Token distribution', async () => {

            context('Milestone Payments only', async () => {

                it('SoftCap reached in pre-ico, 1 payment, 1 payment in pre-ico, 0 payments in ico', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);


                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate investor vault has 50% of total sold tokens
                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    let soldTokens = soldTokenSupply.mul(settings.bylaws["token_sale_percentage"] / 100);
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');
                });


                it('SoftCap reached in ico, 1 payment, 1 account, 0 payments in pre-ico, 1 payment in ico', async () => {
                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate investor vault has 50% of total sold tokens
                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    let soldTokens = soldTokenSupply.mul(settings.bylaws["token_sale_percentage"] / 100);
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');
                });


                it('SoftCap reached in pre-ico, 2 payments, 1 account, 1 payment in pre-ico, 1 payment in ico', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[15]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, very low.
                    await FundingInputMilestone.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate investor vault has 50% of total sold tokens
                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    let soldTokens = soldTokenSupply.mul(settings.bylaws["token_sale_percentage"] / 100);
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');
                });

                it('SoftCap reached in ico, 2 payments, 1 account, 1 payment in pre-ico, 1 payment in ico', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, very low.
                    await FundingInputMilestone.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[15]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate investor vault has 50% of total sold tokens
                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    let soldTokens = soldTokenSupply.mul(settings.bylaws["token_sale_percentage"] / 100);
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');
                });


                it('SoftCap reached in pre-ico, 2 payments, 2 accounts, 1 payment in pre-ico (account 1), 1 payment in ico (account 2)', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, funding_global_soft_cap.
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[16]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, very low.
                    await FundingInputMilestone.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[17]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // @TODO Validate result

                    // let vaultAddress1 = await FundingManager.vaultById.call(1);
                    // let vaultAddress2 = await FundingManager.vaultById.call(2);
                    // let balance1 = await TestBuildHelper.getTokenBalance(vaultAddress1);
                    // let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);
                    // let soldTokens = soldTokenSupply.mul( settings.bylaws["token_sale_percentage"] / 100 );
                    // assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');

                });


                it('SoftCap reached in ico, 2 payments, 2 accounts, 1 payment in pre-ico (account 1), 1 payment in ico (account 2)', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, very low.
                    await FundingInputMilestone.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[16]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, funding_global_soft_cap
                    await FundingInputMilestone.sendTransaction({
                        value: settings.bylaws["funding_global_soft_cap"],
                        from: accounts[17]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    let vaultAddress1 = await FundingManager.vaultById.call(1);
                    let vaultAddress2 = await FundingManager.vaultById.call(2);
                    let balance1 = await TestBuildHelper.getTokenBalance(vaultAddress1);
                    let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);



                    // validate investor 1 vault has 10% of total tokens
                    let preTokens = soldTokenSupply.mul(0.1);
                    assert.equal(balance1.toString(), preTokens.toString(), 'Token balance validation failed');

                    // validate investor 2 vault has 40% of total tokens
                    let icoTokens = soldTokenSupply.mul(0.4);
                    assert.equal(balance2.toString(), icoTokens.toString(), 'Token balance validation failed');
                });

            });

            //

            context('Mixed Direct and Milestone Payments', async () => {

                it('SoftCap reached in pre-ico, 4 payments, 2 accounts, 2 payment in pre-ico (account 1/2), 2 payment in ico (account 1/2)', async () => {
                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, funding_global_soft_cap.
                    await FundingInputDirect.sendTransaction({
                        value: ( settings.bylaws["funding_global_soft_cap"] / 2),
                        from: accounts[16]
                    });

                    await FundingInputMilestone.sendTransaction({
                        value: ( settings.bylaws["funding_global_soft_cap"] / 2),
                        from: accounts[17]
                    });


                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, very low.
                    await FundingInputMilestone.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[16]
                    });

                    // insert 1 payment, very low.
                    await FundingInputDirect.sendTransaction({
                        value: 1 * helpers.solidity.ether,
                        from: accounts[17]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // @TODO Validate result

                    // let vaultAddress1 = await FundingManager.vaultById.call(1);
                    // let vaultAddress2 = await FundingManager.vaultById.call(2);
                    // let balance1 = await TestBuildHelper.getTokenBalance(vaultAddress1);
                    // let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);
                    // let soldTokens = soldTokenSupply.mul( settings.bylaws["token_sale_percentage"] / 100 );
                    // assert.equal(balance.toString(), soldTokens.toString(), 'Token balance validation failed');



                });

            });

        });


        context('misc for extra coverage', async () => {
            let tx;

            it('SCADA - initCacheForVariables() throws if called by other than FundingManager', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);
                await TestBuildHelper.insertPaymentsIntoFunding(false, 1);
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                let TokenManager = await TestBuildHelper.getDeployedByName("TokenManager");
                let TokenSCADAContract = await TestBuildHelper.getContract("TestTokenSCADA1Market");
                let SCADAAddress = await TokenManager.TokenSCADAEntity.call();
                let TokenSCADA = await TokenSCADAContract.at(SCADAAddress);
                helpers.assertInvalidOpcode(async () => {
                    tx = await TokenSCADA.initCacheForVariables();

                });
            });

            it('should run doStateChanges even if no changes are required', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);
            });

            it('SCADA - getTokenFraction() should run 0 if my amount is 0', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                await TestBuildHelper.insertPaymentsIntoFunding(false, 1);

                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                let TokenManager = await TestBuildHelper.getDeployedByName("TokenManager");
                let TokenSCADAContract = await TestBuildHelper.getContract("TestTokenSCADA1Market");
                let SCADAAddress = await TokenManager.TokenSCADAEntity.call();
                let TokenSCADA = await TokenSCADAContract.at(SCADAAddress);

                let TokenFraction = await TokenSCADA.getTokenFraction.call(10, 0, 0);

                assert.equal(TokenFraction, 0, "Token Fraction is not ZERO ?!");
            });

            it('SCADA - getUnsoldTokenFraction() should run 0 if my amount is 0', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                await TestBuildHelper.insertPaymentsIntoFunding(false, 1);

                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                let TokenManager = await TestBuildHelper.getDeployedByName("TokenManager");
                let TokenSCADAContract = await TestBuildHelper.getContract("TestTokenSCADA1Market");
                let SCADAAddress = await TokenManager.TokenSCADAEntity.call();
                let TokenSCADA = await TokenSCADAContract.at(SCADAAddress);

                let getUnsoldTokenFraction = await TokenSCADA.getUnsoldTokenFraction.call(100, 0);

                assert.equal(getUnsoldTokenFraction, 0, "Unsold Token Fraction is not ZERO ?!");
            });

        });
    });
};

