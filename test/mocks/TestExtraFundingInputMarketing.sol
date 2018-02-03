/*

 * @name        Extra Funding Input Marketing
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/ExtraFundingInputMarketing.sol";
import "./TestApplicationEntityABI.sol";  // used for time mocking only

contract TestExtraFundingInputMarketing is ExtraFundingInputMarketing {


    /*
        outside tests we just return "now"
    */
    address public appAddress;

    function setAppAddress(address _app) public {
        appAddress = _app;
    }

    function getTimestamp() view public returns (uint256) {
        TestApplicationEntityABI App = TestApplicationEntityABI(appAddress);
        return App.getTimestamp();
    }
}
