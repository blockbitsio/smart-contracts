/*

 * source       https://github.com/blockbitsio/

 * @name        Bounty Program Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Bounty program contract that holds and distributes tokens upon successful funding.
*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";

import "./../abis/ABIFunding.sol";
import "./../abis/ABIToken.sol";
import "./../abis/ABITokenManager.sol";

contract BountyManager is ApplicationAsset {

    ABIFunding FundingEntity;
    ABIToken TokenEntity;

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = ABIFunding(FundingAddress);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        ABITokenManager TokenManagerEntity = ABITokenManager(TokenManagerAddress);
        TokenEntity = ABIToken(TokenManagerEntity.TokenEntity());

        EventRunBeforeApplyingSettings(assetName);
    }

    function sendBounty( address _receiver, uint256 _amount )
        public
        requireInitialised
        requireSettingsApplied
        onlyDeployer
    {
        if( FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL") ) {
            TokenEntity.transfer( _receiver, _amount );
        } else {
            revert();
        }
    }
}