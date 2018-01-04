/*

 * @name        Token Manager Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>



*/

pragma solidity ^0.4.17;

import "./Token.sol";
import "./../ApplicationAsset.sol";
import "./../ApplicationEntity.sol";

import "./../Algorithms/TokenSCADA1Market.sol";

contract TokenManager is ApplicationAsset {

    TokenSCADA1Market public TokenSCADAEntity;
    Token public TokenEntity;

    function addTokenSettingsAndInit(
        uint256 _tokenSupply,
        uint8 _tokenDecimals,
        string _tokenName,
        string _tokenSymbol,
        string _version
    )
        public
        requireInitialised
        requireSettingsNotApplied
        onlyDeployer
    {
        TokenEntity = new Token(
            _tokenSupply,
            _tokenName,
            _tokenDecimals,
            _tokenSymbol,
            _version
        );
    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        // we need token address
        // we need funding contract address.. let's ask application entity ABI for it :D
        address fundingContractAddress = getApplicationAssetAddressByName('Funding');

        TokenSCADAEntity = new TokenSCADA1Market(address(TokenEntity), fundingContractAddress);
        EventRunBeforeApplyingSettings(assetName);
    }

    function getTokenSCADARequiresHardCap() public view returns (bool) {
        return TokenSCADAEntity.requiresHardCap();
    }

    // Funding initialization complete, give funding manager tokens we're selling
    event EventAllocatedInitialTokenBalances(address _addr, uint256 _value);
    bool InitialTokenBalancesAllocated = false;

    function AllocateInitialTokenBalances(
        uint8 _sellPercentage,
        address _FundingManagerAddress,
        address _BountyManagerAddress
    )
        public
        onlyAsset('Funding')
        returns (bool)
    {
        require(InitialTokenBalancesAllocated == false);
        // TokenManager owns all tokens.

        // first we subtract bounty percentage, the rest is then distributed to funding and owner
        uint256 bountyPercent = getAppBylawUint256("token_bounty_percentage");
        uint256 bountyValue = TokenEntity.balanceOf(address(this)) / 100 * bountyPercent;
        // Allocate the percentage we're distributing using bounty to the BountyManager
        // from this as ( msg.sender ) , to BountyManager, value
        TokenEntity.transfer( _BountyManagerAddress, bountyValue );

        // calculate token value based on selling percentage
        uint256 tokenValue = TokenEntity.balanceOf(address(this)) / 100 * _sellPercentage;
        // Allocate the percentage we're selling to the FundingManager

        // in order to handle fraction and percentage rounding errors, we're allocating 1 full token from owners to sale.
        tokenValue = tokenValue + ( 1 ether );

        // from this as ( msg.sender ) , to FundingManager, value
        TokenEntity.transfer( _FundingManagerAddress, tokenValue );
        EventAllocatedInitialTokenBalances(_FundingManagerAddress, tokenValue);

        InitialTokenBalancesAllocated = true;
        return true;
    }

    // Development stage complete, release tokens to Project Owners
    event EventOwnerTokenBalancesReleased(address _addr, uint256 _value);
    bool OwnerTokenBalancesReleased = false;

    function ReleaseOwnersLockedTokens(address _multiSigOutputAddress)
        public
        onlyAsset('FundingManager')
        returns (bool)
    {
        require(OwnerTokenBalancesReleased == false);
        uint256 lockedBalance = TokenEntity.balanceOf(address(this));
        TokenEntity.transfer( _multiSigOutputAddress, lockedBalance );
        EventOwnerTokenBalancesReleased(_multiSigOutputAddress, lockedBalance);
        OwnerTokenBalancesReleased = true;
        return true;
    }

}