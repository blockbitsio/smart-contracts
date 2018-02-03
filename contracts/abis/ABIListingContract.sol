/*

 * source       https://github.com/blockbitsio/

 * @name        Listing Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "./ABIApplicationAsset.sol";

contract ABIListingContract is ABIApplicationAsset {

    address public managerAddress;
    // child items
    struct item {
        bytes32 name;
        address itemAddress;
        bool    status;
        uint256 index;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum;

    function setManagerAddress(address _manager) public;
    function addItem(bytes32 _name, address _address) public;
    function getNewsContractAddress(uint256 _childId) external view returns (address);
    function canBeDelisted(uint256 _childId) public view returns (bool);
    function getChildStatus( uint256 _childId ) public view returns (bool);
    function delistChild( uint256 _childId ) public;

}