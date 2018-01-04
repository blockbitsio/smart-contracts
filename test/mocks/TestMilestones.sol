/*

 * @name        Test Milestones Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/Milestones.sol";
import "./TestApplicationAsset.sol";

contract TestMilestones is Milestones, TestApplicationAsset {


    function callTestCreateMilestoneAcceptanceProposal() external returns (uint256) {

        return ProposalsEntity.createMilestoneAcceptanceProposal();
    }

}