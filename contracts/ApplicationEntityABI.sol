/*

 * @name        Application Entity Generic Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Used for the ABI interface when assets need to call Application Entity.

    This is required, otherwise we end up loading the assets themselves when we load the ApplicationEntity contract
    and end up in a loop
*/

pragma solidity 0.4.17;

contract ApplicationEntityABI {

    address public ProposalsEntity;
    address public FundingEntity;
    address public MilestonesEntity;
    address public MeetingsEntity;
    address public BountyManagerEntity;
    address public TokenManagerEntity;
    address public ListingContractEntity;
    address public FundingManagerEntity;
    address public NewsContractEntity;

    address public deployerAddress;

    uint8 public CurrentEntityState;

    function getAssetAddressByName(bytes32 _name) public view returns (address);

    function getBylawUint256(bytes32 name) public view returns (uint256);
    function getBylawBytes32(bytes32 name) public view returns (bytes32);

    function getEntityState(bytes32 name) public view returns (uint8);

    function canInitiateCodeUpgrade(address _sender) public view returns(bool);

    function acceptCodeUpgradeProposal(address _newAddress) external ;
}