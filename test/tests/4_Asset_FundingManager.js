module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


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

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLock();

            FundingContract = await TestBuildHelper.getDeployedByName("Funding");

            // funding inputs
            let FundingInputDirectAddress = await FundingContract.DirectInput.call();
            let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");
            assetContract = FundingManager;
        });


        it('receivePayment() throws if caller is not funding asset', async () => {

            let FundingAddress = await FundingManager.getApplicationAssetAddressByName.call('Funding');
            assert.equal(FundingAddress, FundingContract.address, 'FundingAddress does not match.');

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            helpers.assertInvalidOpcode(async () => {
                tx = await FundingManager.receivePayment( investorWallet1, 1, 1, {value: DirectPaymentValue, from: investorWallet1});
            });
        });

        context('FundingEndedProcessVaultList()', async () => {

            let paymentNum, accNum;
            beforeEach( async () => {

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("ICO START", false);

                let PaymentValue = 1 * helpers.solidity.ether; // 100 wei  //0.01 * helpers.solidity.ether;
                paymentNum = 11;

                let acc_start = 10;
                let acc_end = 20;
                let acc = acc_start;
                accNum = acc_end - acc_start + 1;
                if(accNum > paymentNum) {
                    accNum = paymentNum;
                }

                for(let i = 0; i < paymentNum; i++) {
                    // console.log("Payment ["+i+"] from account["+acc+"]", accounts[acc]);
                    await FundingInputMilestone.sendTransaction({
                        value: PaymentValue,
                        from: accounts[acc] // starts at investorWallet1
                    });

                    acc++;
                    if(acc === acc_end+1) {
                        acc = acc_start;
                    }
                }
            });


            it('vaultNum has correct number of payments', async () => {
                let vaultNum = await FundingManager.vaultNum.call();
                assert.equal(vaultNum.toString(), accNum, "vaultNum should be "+accNum);
            });

            it('throws if Funding State is not "FUNDING_ENDED"', async () => {
                helpers.assertInvalidOpcode(async () => {
                    tx = await FundingManager.FundingEndedProcessVaultList(2);
                });
            });

            it('Funding State is "FUNDING_ENDED"', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                // tx = await FundingContract.doStateChanges();
                await TestBuildHelper.doApplicationStateChanges("ICO END", false);
                // await TestBuildHelper.FundingManagerProcessVaults();

                it("starts with state as New and requires a change to WAITING", async() => {
                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_ENDED").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');
                });
            });

        });

        context('states', async () => {

            let validation;


            it("starts with state as New and requires a change to WAITING", async() => {
                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

            it("handles ENTITY state change from NEW to WAITING", async() => {
                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                await TestBuildHelper.doApplicationStateChanges("", false);

                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });


            it("handles ENTITY state change from NEW or WAITING to FUNDING_FAILED_DONE when funding state is FAILED ", async() => {

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                // insert payments, but not enough to reach soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(false);
                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);

                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_DONE").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

            context('Funding ends, has payments, but does not reach Soft Cap', async () => {

                  it("handles ENTITY state change to FUNDING_FAILED_DONE, and processes all vaults", async () => {

                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);
                    // insert payments, but not enough to reach soft cap.
                    await TestBuildHelper.insertPaymentsIntoFunding(false);
                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_DONE").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                });

            });



            context('Funding ends, has payments, and Soft Cap is reached', async () => {

                it("handles ENTITY state change to FUNDING_SUCCESSFUL_DONE, and processes all vaults", async () => {

                    // time travel to ico start time
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);
                    // insert payments, over soft cap.
                    await TestBuildHelper.insertPaymentsIntoFunding(true, 2);

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                });

            });


            it("setVaultCountPerProcess throws if value is not higher than 0", async () => {
                // let VaultCountPerProcessInitial = await FundingManager.VaultCountPerProcess.call();
                let newValue = 0x0;
                helpers.assertInvalidOpcode(async () => {
                    await FundingManager.setVaultCountPerProcess(newValue);
                });
            });

            it("setVaultCountPerProcess properly sets value", async () => {
                // let VaultCountPerProcessInitial = await FundingManager.VaultCountPerProcess.call();
                let newValue = 50;
                await FundingManager.setVaultCountPerProcess(newValue);
                let VaultCountPerProcessAfter = await FundingManager.VaultCountPerProcess.call();
                assert.equal(VaultCountPerProcessAfter.toNumber(), newValue, 'VaultCountPerProcessAfter should be newValue');
            });

        });
    });
};

