/*

 * source       https://github.com/blockbitsio/

 * @name        Funding Vault ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 each purchase creates a separate funding vault contract

*/
pragma solidity ^0.4.17;

contract ABIFundingVault {

    bool public _initialized;
    address public vaultOwner;
    address public outputAddress;
    address public managerAddress;
    bool public allFundingProcessed;
    bool public DirectFundingProcessed;
    uint256 public amount_direct;
    uint256 public amount_milestone;
    bool public emergencyFundReleased;

    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint8 funding_stage;
        uint16 index;
    }

    bool public BalancesInitialised;
    uint8 public BalanceNum;
    uint16 public purchaseRecordsNum;
    mapping(uint16 => PurchaseStruct) public purchaseRecords;
    mapping (uint8 => uint256) public stageAmounts;
    mapping (uint8 => uint256) public stageAmountsDirect;
    mapping (uint8 => uint256) public etherBalances;
    mapping (uint8 => uint256) public tokenBalances;

    function initialize( address _owner, address _output, address _fundingAddress, address _milestoneAddress, address _proposalsAddress ) public returns(bool);
    function addPayment(uint8 _payment_method, uint8 _funding_stage ) public payable returns (bool);
    function getBoughtTokens() public view returns (uint256);
    function getDirectBoughtTokens() public view returns (uint256);
    function ReleaseFundsAndTokens() public returns (bool);
    function releaseTokensAndEtherForEmergencyFund() public returns (bool);
    function ReleaseFundsToInvestor() public;
    function canCashBack() public view returns (bool);
    function checkFundingStateFailed() public view returns (bool);
    function checkMilestoneStateInvestorVotedNoVotingEndedNo() public view returns (bool);
    function checkOwnerFailedToSetTimeOnMeeting() public view returns (bool);
}