/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "./TestApplicationEntity.sol";
import "../../contracts/ApplicationEntitySecond.sol";

contract TestApplicationEntitySecond is ApplicationEntitySecond {

    function setTestGatewayInterfaceEntity(address _address) external {
        GatewayInterfaceAddress = _address;
        GatewayInterfaceEntity = ABIGatewayInterface(GatewayInterfaceAddress);
    }

    uint256 _mockTime = now;
    function getTimestamp() view public returns (uint256) {
        if(_mockTime > 0) {
            return _mockTime;
        } else {
            return now;
        }
    }
    function setTestTimestamp(uint256 i) external { _mockTime = i; }


}
