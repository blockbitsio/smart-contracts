/*

 * source       https://github.com/blockbitsio/

 * @name        Listing Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Listing Contract
 - used by the platform to find child campaigns
 - used by mobile application to retrieve News Items

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../ApplicationEntityABI.sol";

contract ListingContract is ApplicationAsset {

    address public managerAddress;

    // child items
    struct item {
        bytes32 name;
        address itemAddress;
        bool    status;
        uint256 index;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum = 0;

    event EventNewChildItem(bytes32 _name, address _address, uint256 _index);

    function ListingContract() ApplicationAsset() public {

    }

    // deployer address, sets the address who is allowed to add entries, in order to avoid a code upgrade at first milestone.
    function setManagerAddress(address _manager) public onlyDeployer {
        managerAddress = _manager;
    }

    function addItem(bytes32 _name, address _address) public requireInitialised {
        require(msg.sender == owner || msg.sender == managerAddress); // only application

        item storage child = items[++itemNum];
        child.name = _name;
        child.itemAddress = _address;
        child.status = true;
        child.index = itemNum;

        EventNewChildItem( _name, _address, itemNum);
    }

    /*
    * Get current News Contract address
    *
    * @return       address NewsContractEntity
    */
    function getNewsContractAddress(uint256 _childId) external view returns (address) {
        item memory child = items[_childId];
        if(child.itemAddress != address(0x0)) {
            ApplicationEntityABI ChildApp = ApplicationEntityABI(child.itemAddress);
            return ChildApp.NewsContractEntity();
        } else {
            revert();
        }
    }

    function canBeDelisted(uint256 _childId) public view returns (bool) {

        item memory child = items[_childId];
        if(child.status == true) {
            ApplicationEntityABI ChildApp = ApplicationEntityABI(child.itemAddress);
            if(
                ChildApp.CurrentEntityState() == ChildApp.getEntityState("WAITING") ||
                ChildApp.CurrentEntityState() == ChildApp.getEntityState("NEW"))
            {
                return true;
            }
        }
        return ;
    }

    function getChildStatus( uint256 _childId ) public view returns (bool) {
        item memory child = items[_childId];
        return child.status;
    }

    // update so that this checks the child status, and only delists IF funding has not started yet.
    function delistChild( uint256 _childId ) public onlyAsset("Proposals") requireInitialised {
        require(canBeDelisted(_childId) == true );

        item storage child = items[_childId];
            child.status = false;
    }

}