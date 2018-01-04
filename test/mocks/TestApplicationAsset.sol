/*

 * @name        Test Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/ApplicationAsset.sol";
import "./TestApplicationEntityABI.sol";  // used for time mocking only

contract TestApplicationAsset is ApplicationAsset {

    function setTestInitialized() external {
        _initialized = true;
    }

    function setTestOwner(address _address) external {
        owner = _address;
    }

    /*
        outside tests we just return "now"
    */
    function getTimestamp() view public returns (uint256) {
        TestApplicationEntityABI App = TestApplicationEntityABI(owner);
        return App.getTimestamp();
    }

}
