module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    const TokenSettings = setup.settings.token;

    const leftPad = require('left-pad');

    contract('ERC20 Token', accounts => {
        const TokenContract = artifacts.require('TestToken');
        const SampleRecipientSuccess = artifacts.require('SampleRecipientSuccess');
        const SampleRecipientThrow = artifacts.require('SampleRecipientThrow');
        let HST;

       beforeEach(async () => {
            HST = await TokenContract.new(
                TokenSettings.supply,
                TokenSettings.name,
                TokenSettings.decimals,
                TokenSettings.symbol,
                TokenSettings.version,
                {from: accounts[0]}
            );
        });

        it('creation: in contract settings should match constructor parameters', async () => {
            let decimals = await HST.decimals.call();
            let supply = await HST.totalSupply.call();
            assert.equal(TokenSettings.name, await HST.name.call(), 'name invalid');
            assert.equal(TokenSettings.symbol, await HST.symbol.call(), 'symbol invalid');
            assert.equal(TokenSettings.supply.toNumber(), supply.toNumber(), 'totalSupply invalid');
            assert.equal(TokenSettings.decimals, decimals.toString(), 'decimals invalid');
            assert.equal(TokenSettings.version, await HST.version.call(), 'version invalid');
        });

        it('creation: should create a correct initial balance for the creator', async () => {
            const balance = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance.toString(), TokenSettings.supply.toString())
        });

        it('creation: test correct setting of vanity information', async () => {
            const name = await HST.name.call();
            assert.strictEqual(name, TokenSettings.name);
            const decimals = await HST.decimals.call();
            assert.strictEqual(decimals.toNumber(), TokenSettings.decimals);
            const symbol = await HST.symbol.call();
            assert.strictEqual(symbol, TokenSettings.symbol)
        });

        it('creation: should succeed in creating over 2^256 - 1 (max) tokens', async () => {
            // 2^256 - 1
            let HST2 = await TokenContract.new(
                '115792089237316195423570985008687907853269984665640564039457584007913129639935',
                TokenSettings.name,
                TokenSettings.decimals,
                TokenSettings.symbol,
                TokenSettings.version,
                {from: accounts[0]}
            );
            const totalSupply = await HST2.totalSupply();
            const match = totalSupply.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77');
            assert(match, 'result is not correct')
        });

        // TRANSERS
        // normal transfers without approvals
        it('transfers: ether transfer should be reversed.', async () => {
            const balanceBefore = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balanceBefore.toString(), TokenSettings.supply.toString());

            web3.eth.sendTransaction({from: accounts[0], to: HST.address, value: web3.toWei('10', 'Ether')}, async (err, res) => {
                helpers.assertInvalidOpcode(async () => {
                    await new Promise((resolve, reject) => {
                        if (err) reject(err);
                        resolve(res);
                    })
                });

                let balanceAfter = await HST.balanceOf.call(accounts[0]);
                assert.strictEqual(balanceAfter.toString(), TokenSettings.supply.toString())
            })
        });

        it('transfers: should transfer 10000 to accounts[1] with accounts[0] having 10000', async () => {
            await HST.transfer(accounts[1], 10000, {from: accounts[0]});
            const balance = await HST.balanceOf.call(accounts[1]);
            assert.strictEqual(balance.toNumber(), 10000)
        });

        it('transfers: should fail when trying to transfer total amount +1 to accounts[1] with accounts[0] having total amount', async () => {

            let balance  = await HST.balanceOf.call(accounts[0]);
            let amt = balance.add(new helpers.BigNumber('1'));
            assert.strictEqual(balance.toString(), TokenSettings.supply.toString());
            assert.equal(amt.toNumber(), TokenSettings.supply.add( new helpers.BigNumber("1") ).toString() );
            return helpers.assertInvalidOpcode(async () => {
                await HST.transfer.call(accounts[1], amt, {from: accounts[0]})
            });
        });

        it('transfers: should handle zero-transfers normally', async () => {
            assert(await HST.transfer.call(accounts[1], 0, {from: accounts[0]}), 'zero-transfer has failed')
        });

        it('transfers: should throw if receiver address is 0x0', async () => {
            return helpers.assertInvalidOpcode(async () => {
                await HST.transfer.sendTransaction(0, 0, {from: accounts[0]})
            });
        });

        it('transferFrom: should throw if receiver address is 0x0', async () => {
            const TestERC20Caller = await artifacts.require('TestERC20Caller').new();
            return helpers.assertInvalidOpcode(async () => {
                await TestERC20Caller.callTestTransfer.sendTransaction(HST.address);
            });
        });

        // NOTE: testing uint256 wrapping is impossible in this standard token since you can't supply > 2^256 -1
        // todo: transfer max amounts

        /*
        it('transfer: msg.sender should transfer 100 to SampleRecipient and then NOTIFY SampleRecipient. It should succeed.', async () => {
            let SRS = await SampleRecipientSuccess.new({from: accounts[0]});
            await HST.transferAndCall(SRS.address, 100, {from: accounts[0]});
            const balance = await HST.balanceOf.call(SRS.address);
            assert.strictEqual(balance.toNumber(), 100);

            const value = await SRS.value.call();
            assert.strictEqual(value.toNumber(), 100)
        });

        it('transfer: msg.sender should transfer 100 to SampleRecipient and then NOTIFY SampleRecipient and throw if called as view method.', async () => {
            let SRS = await SampleRecipientThrow.new({from: accounts[0]});
            return helpers.assertInvalidOpcode(async () => {
                await HST.transferAndCall(SRS.address, 100, {from: accounts[0]})
            });
        });
        */

        // APPROVALS
        it('approvals: msg.sender should approve 100 to accounts[1]', async () => {
            await HST.approve(accounts[1], 100, {from: accounts[0]});
            const allowance = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance.toNumber(), 100)
        });

        // bit overkill. But is for testing a bug
        it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.', async () => {
            const balance0 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance0.toString(), TokenSettings.supply.toString());

            await HST.approve(accounts[1], 100, {from: accounts[0]}); // 100
            const balance2 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

            HST.transferFrom.call(accounts[0], accounts[2], 20, {from: accounts[1]});
            await HST.allowance.call(accounts[0], accounts[1]);
            await HST.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]}); // -20
            const allowance01 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance01.toNumber(), 80); // =80

            const balance22 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance22.toNumber(), 20);

            const balance02 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance02.toString(), TokenSettings.supply.sub( new helpers.BigNumber("20") ).toString())
        });

        // should approve 100 of msg.sender & withdraw 50, twice. (should succeed)
        it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.', async () => {
            await HST.approve(accounts[1], 100, {from: accounts[0]});
            const allowance01 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance01.toNumber(), 100);

            await HST.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]});
            const allowance012 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance012.toNumber(), 80);

            const balance2 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance2.toNumber(), 20);

            const balance0 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance0.toString(), TokenSettings.supply.sub(new helpers.BigNumber("20")).toString());

            // FIRST tx done.
            // onto next.
            await HST.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]});
            const allowance013 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance013.toNumber(), 60);

            const balance22 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance22.toNumber(), 40);

            const balance02 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance02.toString(), TokenSettings.supply.sub(new helpers.BigNumber("40")).toString());
        });

        // should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
        it('approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)', async () => {
            await HST.approve(accounts[1], 100, {from: accounts[0]});
            const allowance01 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance01.toNumber(), 100);

            await HST.transferFrom(accounts[0], accounts[2], 50, {from: accounts[1]});
            const allowance012 = await HST.allowance.call(accounts[0], accounts[1]);
            assert.strictEqual(allowance012.toNumber(), 50);

            const balance2 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance2.toNumber(), 50);

            const balance0 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance0.toString(), TokenSettings.supply.sub(new helpers.BigNumber("50")).toString());

            // FIRST tx done.
            // onto next.
            return helpers.assertInvalidOpcode(async () => {
                await HST.transferFrom.call(accounts[0], accounts[2], 60, {from: accounts[1]});
            });
        });

        it('approvals: attempt withdrawal from account with no allowance (should fail)', function () {
            return helpers.assertInvalidOpcode(async () => {
                await HST.transferFrom.call(accounts[0], accounts[2], 60, {from: accounts[1]});
            });
        });

        it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.', async () => {
            await HST.approve(accounts[1], 100, {from: accounts[0]});
            await HST.transferFrom(accounts[0], accounts[2], 60, {from: accounts[1]});
            await HST.approve(accounts[1], 0, {from: accounts[0]});

            return helpers.assertInvalidOpcode(async () => {
                await HST.transferFrom(accounts[0], accounts[2], 10, {from: accounts[1]});
            });
        });

        it('approvals: approve max (2^256 - 1)', async () => {
            let numberString = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
            await HST.approve(accounts[1], numberString, {from: accounts[0]});
            const allowance = await HST.allowance.call(accounts[0], accounts[1]);
            let allowanceNum = helpers.web3util.hexToNumberString(allowance);
            assert.equal(allowanceNum, numberString);
        });

        // should approve max of msg.sender & withdraw 20 without changing allowance (should succeed).
        it('approvals: msg.sender approves accounts[1] of max (2^256 - 1) & withdraws 20', async () => {
            const balance0 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance0.toString(), TokenSettings.supply.toString());

            const max = '1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77';
            await HST.approve(accounts[1], max, {from: accounts[0]});
            const balance2 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

            await HST.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]});
            const allowance01 = await HST.allowance.call(accounts[0], accounts[1]);

            assert.equal(allowance01.toNumber(), max);

            const balance22 = await HST.balanceOf.call(accounts[2]);
            assert.strictEqual(balance22.toNumber(), 20);

            const balance02 = await HST.balanceOf.call(accounts[0]);
            assert.strictEqual(balance02.toString(), TokenSettings.supply.sub(new helpers.BigNumber("20")).toString());
        });

        it('allowance: should start with zero', async function() {
            let preApproved = await HST.allowance.call(accounts[0], accounts[1]);
            assert.equal(preApproved, 0);
        });

        it('allowance: should increase by 50 then decrease by 10', async function() {
            await HST.increaseApproval(accounts[1], 50);
            let postIncrease = await HST.allowance.call(accounts[0], accounts[1]);
            assert.equal(postIncrease, 50, 'Approval after increase should be 50');
            await HST.decreaseApproval(accounts[1], 10);
            let postDecrease = await HST.allowance.call(accounts[0], accounts[1]);
            assert.equal(postDecrease, 40, 'Approval after decrease should be 40');
        });

        it('allowance: should be set to zero if decrease value is higher than existing', async function() {
            await HST.increaseApproval(accounts[1], 50);
            await HST.decreaseApproval(accounts[1], 70);
            let postDecrease = await HST.allowance.call(accounts[0], accounts[1]);
            assert.equal(postDecrease, 0, 'Approval after decrease should be 0');
        });

        it('events: should fire Transfer event properly', async () => {
            let eventFilter = helpers.utils.hasEvent(
                await HST.transfer(accounts[1], '2666', {from: accounts[0]}),
                'Transfer(address,address,uint256)'
            );
            assert.equal(eventFilter.length, 1, 'Transfer event not received.');

            let _from = helpers.utils.topicToAddress( eventFilter[0].topics[1] );
            let _to = helpers.utils.topicToAddress( eventFilter[0].topics[2] );
            let _value = helpers.web3util.toDecimal( eventFilter[0].topics[3] );

            assert.strictEqual(_from, accounts[0]);
            assert.strictEqual(_to, accounts[1]);
            assert.strictEqual(_value.toString(), '2666');
        });

        it('events: should fire Transfer event normally on a zero transfer', async () => {
            let eventFilter = helpers.utils.hasEvent(
                await HST.transfer(accounts[1], '0', {from: accounts[0]}),
                'Transfer(address,address,uint256)'
            );
            assert.equal(eventFilter.length, 1, 'Transfer event not received.');

            let _from = helpers.utils.topicToAddress( eventFilter[0].topics[1] );
            let _to = helpers.utils.topicToAddress( eventFilter[0].topics[2] );
            let _value = helpers.web3util.toDecimal( eventFilter[0].topics[3] );

            assert.strictEqual(_from, accounts[0]);
            assert.strictEqual(_to, accounts[1]);
            assert.strictEqual(_value.toString(), '0');
        });

        it('events: should fire Approval event properly', async () => {
            let eventFilter = helpers.utils.hasEvent(
                await HST.approve(accounts[1], '2666', {from: accounts[0]}),
                'Approval(address,address,uint256)'
            );
            assert.equal(eventFilter.length, 1, 'Approval event not received.');

            let _from = helpers.utils.topicToAddress( eventFilter[0].topics[1] );
            let _to = helpers.utils.topicToAddress( eventFilter[0].topics[2] );
            let _value = helpers.web3util.toDecimal( eventFilter[0].topics[3] );

            assert.strictEqual(_from, accounts[0]);
            assert.strictEqual(_to, accounts[1]);
            assert.strictEqual(_value.toString(), '2666');
        })
    })
};
