/*

 * source       https://github.com/blockbitsio/

 * @name        Token Manager Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../abis/ABIToken.sol";
import "./../abis/ABITokenSCADAVariable.sol";

contract TokenManager is ApplicationAsset {

    ABITokenSCADAVariable public TokenSCADAEntity;
    ABIToken public TokenEntity;
    address public MarketingMethodAddress;

    function addSettings(address _scadaAddress, address _tokenAddress, address _marketing ) onlyDeployer public {
        TokenSCADAEntity = ABITokenSCADAVariable(_scadaAddress);
        TokenEntity = ABIToken(_tokenAddress);
        MarketingMethodAddress = _marketing;
    }

    function getTokenSCADARequiresHardCap() public view returns (bool) {
        return TokenSCADAEntity.requiresHardCap();
    }

    function mint(address _to, uint256 _amount)
        onlyAsset('FundingManager')
        public
        returns (bool)
    {
        return TokenEntity.mint(_to, _amount);
    }

    function finishMinting()
        onlyAsset('FundingManager')
        public
        returns (bool)
    {
        return TokenEntity.finishMinting();
    }

    function mintForMarketingPool(address _to, uint256 _amount)
        onlyMarketingPoolAsset
        requireSettingsApplied
        external
        returns (bool)
    {
        return TokenEntity.mint(_to, _amount);
    }

    modifier onlyMarketingPoolAsset() {
        require(msg.sender == MarketingMethodAddress);
        _;
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