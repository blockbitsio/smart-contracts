/*

 * @name        Milestone Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "./FundingInputGeneral.sol";

contract FundingInputMilestone is FundingInputGeneral {
    function FundingInputMilestone() FundingInputGeneral() public {
        typeId = 2;
    }
}
