/*

 * source       https://github.com/blockbitsio/

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Application

 ENS: gateway.main.blockbits.eth will point directly to this contract.

    ADD ENS domain ownership / transfer methods

*/

pragma solidity ^0.4.17;

import "./../ApplicationEntityABI.sol";

contract ABIGatewayInterface {
    address public currentApplicationEntityAddress;
    ApplicationEntityABI private currentApp;
    address public deployerAddress;

    function getApplicationAddress() external view returns (address);
    function requestCodeUpgrade( address _newAddress, bytes32 _sourceCodeUrl ) external returns (bool);
    function approveCodeUpgrade( address _newAddress ) external returns (bool);
    function link( address _newAddress ) internal returns (bool);
    function getNewsContractAddress() external view returns (address);
    function getListingContractAddress() external view returns (address);
}