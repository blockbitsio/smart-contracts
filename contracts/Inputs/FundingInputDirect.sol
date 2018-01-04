/*

 * @name        Direct Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "./FundingInputGeneral.sol";

contract FundingInputDirect is FundingInputGeneral {
    function FundingInputDirect() FundingInputGeneral() public {
        typeId = 1;
    }
}
