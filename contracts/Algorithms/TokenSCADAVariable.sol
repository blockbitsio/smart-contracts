/*

 * @name        Token Stake Calculation And Distribution Algorithm - Type 3 - Sell a variable amount of tokens for a fixed price
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


    Inputs:

    Defined number of tokens per wei ( X Tokens = 1 wei )
    Received amount of ETH
    Generates:

    Total Supply of tokens available in Funding Phase respectively Project
    Observations:

    Will sell the whole supply of Tokens available to Current Funding Phase
    Use cases:

    Any Funding Phase where you want the first Funding Phase to determine the token supply of the whole Project

*/


pragma solidity 0.4.17;

import "./../Entity/Funding.sol";
import "./../Entity/Token.sol";
import "./../Entity/FundingVault.sol";

contract TokenSCADAVariable {

    Funding FundingEntity;

    bool public SCADA_requires_hard_cap = true;

    function TokenSCADAVariable( address _fundingContract ) public {

        FundingEntity = Funding(_fundingContract);
    }

    function requiresHardCap() public view returns (bool) {
        return SCADA_requires_hard_cap;
    }

    function getTokensForValueInCurrentStage(uint256 _value) public view returns (uint256) {
        return getTokensForValueInStage(FundingEntity.currentFundingStage(), _value);
    }

    function getTokensForValueInStage(uint8 _stage, uint256 _value) public view returns (uint256) {
        uint256 amount = FundingEntity.getStageAmount(_stage);
        return _value * amount;
    }

    function getBoughtTokens( address _vaultAddress, bool _direct ) public view returns (uint256) {
        FundingVault vault = FundingVault(_vaultAddress);

        if(_direct) {
            uint256 DirectTokens = getTokensForValueInStage(1, vault.stageAmountsDirect(1));
            DirectTokens+= getTokensForValueInStage(2, vault.stageAmountsDirect(2));
            return DirectTokens;
        } else {
            uint256 TotalTokens = getTokensForValueInStage(1, vault.stageAmounts(1));
            TotalTokens+= getTokensForValueInStage(2, vault.stageAmounts(2));
            return TotalTokens;
        }
    }
}