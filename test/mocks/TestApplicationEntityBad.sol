/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "./TestApplicationEntity.sol";

contract TestApplicationEntityBad is TestApplicationEntity {

    bool testInitializeAssetsResponse = false;
    bool testTransferResponse = false;
    bool testLockResponse = false;
    bool testInitializeResponse = false;


    function setTestInitializeAssetsResponse(bool _value) public {
        testInitializeAssetsResponse = _value;
    }

    function initializeAssetsToThisApplication() external returns (bool) {
        EventAppEntityInitAssetsToThis(1);
        return testInitializeAssetsResponse;
    }

    function setTestTransferResponse(bool _value) public {
        testInitializeResponse = _value;
    }

    function transferAssetsToNewApplication(address newAddress) external returns(bool) {
        EventAppEntityAssetsToNewApplication ( newAddress );
        return testTransferResponse;
    }

    function setTestTestLockResponse(bool _value) public {
        testLockResponse = _value;
    }

    function lock() external returns(bool) {
        EventAppEntityLocked(address(this));
        return testLockResponse;
    }

    function setTestInitializeResponse(bool _value) public {
        testInitializeResponse = _value;
    }

    function initialize() external returns(bool) {
        EventAppEntityReady( address(this) );
        return testInitializeResponse;
    }
}
