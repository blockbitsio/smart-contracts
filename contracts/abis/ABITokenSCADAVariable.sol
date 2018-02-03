/*

 * source       https://github.com/blockbitsio/

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

contract ABITokenSCADAVariable {
    bool public SCADA_requires_hard_cap = true;
    bool public initialized;
    address public deployerAddress;
    function addSettings(address _fundingContract) public;
    function requiresHardCap() public view returns (bool);
    function getTokensForValueInCurrentStage(uint256 _value) public view returns (uint256);
    function getTokensForValueInStage(uint8 _stage, uint256 _value) public view returns (uint256);
    function getBoughtTokens( address _vaultAddress, bool _direct ) public view returns (uint256);
}