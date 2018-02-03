/*

 * @name        Test Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/GatewayInterface.sol";

contract TestGatewayInterface is GatewayInterface {

    function setTestCurrentApplicationEntityAddress(address _address) external {
        currentApplicationEntityAddress = _address;
    }

    function callTestApplicationEntityInitialize() external {
        ApplicationEntityABI(currentApplicationEntityAddress).initialize();
    }

    function callTestLockCurrentApp() external {
        ApplicationEntityABI(currentApplicationEntityAddress).lock();
    }

}