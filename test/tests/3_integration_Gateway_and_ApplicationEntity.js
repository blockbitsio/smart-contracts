module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;

    contract('Gateway and Application Integration', accounts => {
        let app, gateway = {};

        beforeEach(async () => {
            gateway = await contracts.GatewayInterface.new();
            app = await contracts.ApplicationEntity.new();
        });

        it('initial deployment', async () => {
            assert.equal(await gateway.getApplicationAddress.call(), 0x0, 'gateway should have returned empty address');
            assert.equal(await app.getParentAddress.call(), 0x0, 'app should have returned empty address');
            assert.isFalse(await app._initialized.call(), 'app _initialized should be false')
        });

        it('first linking', async () => {
            await app.linkToGateway(gateway.address, settings.sourceCodeUrl);
            assert.equal(await gateway.getApplicationAddress.call(), app.address, 'gateway should have returned correct app address');
            assert.equal(await app.GatewayInterfaceAddress.call(), gateway.address, 'app should have returned gateway app address');
            assert.isTrue(await app._initialized.call(), 'app _initialized should be true');
        });

        context('Application upgrades', async () => {
            let proposals, app2 = {};

            beforeEach(async () => {
                proposals = await contracts.Proposals.new();
                await proposals.setInitialApplicationAddress(app.address);
                await app.addAssetProposals(proposals.address);
                await app.linkToGateway(gateway.address, settings.sourceCodeUrl);
            });

            it('first upgrade', async () => {

                app2 = await contracts.ApplicationEntity.new();
                await app2.addAssetProposals(proposals.address);

                let eventFilter = await helpers.utils.hasEvent(
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl),
                    'EventNewProposalCreated(bytes32,uint256)'
                );

                const requestId = helpers.utils.getProposalRequestId(eventFilter);

                eventFilter = helpers.utils.hasEvent(
                    await proposals.callTestAcceptCodeUpgrade(requestId),
                    'EventGatewayNewAddress(address)'
                );

                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
                assert.equal(await gateway.getApplicationAddress.call(), app2.address, 'gateway should have returned correct app address');
                assert.equal(await app2.getParentAddress.call(), gateway.address, 'app2 should have returned gateway app address');
                assert.isTrue(await app2._initialized.call(), 'app2 _initialized should be true');
                assert.isTrue(await app._locked.call(), 'app1 _lock should be true');
            });

            it('second upgrade', async () => {
                app2 = await contracts.ApplicationEntity.new();
                await app2.addAssetProposals(proposals.address);
                let eventFilter = await helpers.utils.hasEvent(
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                let requestId = helpers.utils.getProposalRequestId(eventFilter);
                eventFilter = helpers.utils.hasEvent(
                    await proposals.callTestAcceptCodeUpgrade(requestId),
                    'EventGatewayNewAddress(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
                assert.equal(await gateway.getApplicationAddress.call(), app2.address, 'gateway should have returned correct app address');
                assert.equal(await app2.getParentAddress.call(), gateway.address, 'app2 should have returned gateway app address');
                assert.isTrue(await app2._initialized.call(), 'app2 _initialized should be true');
                assert.isTrue(await app._locked.call(), 'app1 _lock should be true');

                // do deployment of second upgrade
                let app3 = await contracts.ApplicationEntity.new();
                await app3.addAssetProposals(proposals.address);

                eventFilter = await helpers.utils.hasEvent(
                    await app3.linkToGateway(gateway.address, settings.sourceCodeUrl),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                requestId = helpers.utils.getProposalRequestId(eventFilter);

                eventFilter = helpers.utils.hasEvent(
                    await proposals.callTestAcceptCodeUpgrade(requestId),
                    'EventGatewayNewAddress(address)'
                );

                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
                assert.equal(await gateway.getApplicationAddress.call(), app3.address, 'gateway should have returned correct app address');
                assert.equal(await app3.getParentAddress.call(), gateway.address, 'app3 should have returned gateway app address');
                assert.isTrue(await app3._initialized.call(), 'app3 _initialized should be true');
                assert.isTrue(await app2._locked.call(), 'app2 _lock should be true');
                assert.equal(await proposals.owner.call(), app3.address, 'proposal asset should have returned correct owner address');

            });

            it('throws if an upgrade request is received from an account that does not pass validCodeUpgradeInitiator check', async () => {
                let thirdPartyDeployer = accounts[1];
                app2 = await contracts.ApplicationEntity.new({from: thirdPartyDeployer});
                await app2.addAssetProposals(proposals.address, {from: thirdPartyDeployer});

                return helpers.assertInvalidOpcode(async () => {
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl, {from: thirdPartyDeployer})
                });
            });

            it('mock: works if an upgrade request is received and current ApplicationEntity canInitiateCodeUpgrade allows it', async () => {
                let thirdPartyDeployer = accounts[1];
                await app.addTestUpgradeAllowAddress( thirdPartyDeployer );

                app2 = await contracts.ApplicationEntity.new( {from: thirdPartyDeployer} );
                await app2.addAssetProposals(proposals.address, {from: thirdPartyDeployer} );

                let eventFilter = await helpers.utils.hasEvent(
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl, {from: thirdPartyDeployer}),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

            });
        });
    });
};