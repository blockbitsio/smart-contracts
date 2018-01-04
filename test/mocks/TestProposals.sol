/*

 * @name        Test Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/Proposals.sol";
import "./TestApplicationAsset.sol";

contract TestProposals is Proposals, TestApplicationAsset {

    function callTestAcceptCodeUpgrade(uint256 recordId) external {
        acceptCodeUpgrade(recordId);
    }

    function callTestListingContractDelistChild(uint256 _childId ) external {
        ListingContractEntity.delistChild( _childId );
    }
}
