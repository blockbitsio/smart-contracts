/*

 * source       https://github.com/blockbitsio/

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

*/

pragma solidity ^0.4.17;

import "./abis/ABIGatewayInterface.sol";
import "./abis/ABIProposals.sol";
import "./abis/ABIFunding.sol";
import "./abis/ABIMeetings.sol";
import "./abis/ABIMilestones.sol";
import "./abis/ABIBountyManager.sol";
import "./abis/ABITokenManager.sol";
import "./abis/ABIFundingManager.sol";
import "./abis/ABIListingContract.sol";
import "./abis/ABINewsContract.sol";

contract ApplicationEntity {

    /* Source Code Url */
    bytes32 sourceCodeUrl;

    /* Entity initialised or not */
    bool public _initialized = false;

    /* Entity locked or not */
    bool public _locked = false;

    /* Current Entity State */
    uint8 public CurrentEntityState;

    /* Available Entity State */
    mapping (bytes32 => uint8) public EntityStates;

    /* GatewayInterface address */
    address public GatewayInterfaceAddress;

    /* Parent Entity Instance */
    ABIGatewayInterface GatewayInterfaceEntity;

    /* Asset Entities */
    ABIProposals public ProposalsEntity;
    ABIFunding public FundingEntity;
    ABIMilestones public MilestonesEntity;
    ABIMeetings public MeetingsEntity;
    ABIBountyManager public BountyManagerEntity;
    ABITokenManager public TokenManagerEntity;
    ABIListingContract public ListingContractEntity;
    ABIFundingManager public FundingManagerEntity;
    ABINewsContract public NewsContractEntity;

    /* Asset Collection */
    mapping (bytes32 => address) public AssetCollection;
    mapping (uint8 => bytes32) public AssetCollectionIdToName;
    uint8 public AssetCollectionNum = 0;

    event EventAppEntityReady ( address indexed _address );
    event EventAppEntityCodeUpgradeProposal ( address indexed _address, bytes32 indexed _sourceCodeUrl );
    event EventAppEntityInitAsset ( bytes32 indexed _name, address indexed _address );
    event EventAppEntityInitAssetsToThis ( uint8 indexed _assetNum );
    event EventAppEntityAssetsToNewApplication ( address indexed _address );
    event EventAppEntityLocked ( address indexed _address );

    address public deployerAddress;

    function ApplicationEntity() public {
        deployerAddress = msg.sender;
        setEntityStates();
        CurrentEntityState = getEntityState("NEW");
    }

    function setEntityStates() internal {

        // ApplicationEntity States
        EntityStates["__IGNORED__"]                 = 0;
        EntityStates["NEW"]                         = 1;
        EntityStates["WAITING"]                     = 2;

        EntityStates["IN_FUNDING"]                  = 3;

        EntityStates["IN_DEVELOPMENT"]              = 5;
        EntityStates["IN_CODE_UPGRADE"]             = 50;

        EntityStates["UPGRADED"]                    = 100;

        EntityStates["IN_GLOBAL_CASHBACK"]          = 150;
        EntityStates["LOCKED"]                      = 200;

        EntityStates["DEVELOPMENT_COMPLETE"]        = 250;
    }

    function getEntityState(bytes32 name) public view returns (uint8) {
        return EntityStates[name];
    }

    /*
    * Initialize Application and it's assets
    * If gateway is freshly deployed, just link
    * else, create a voting proposal that needs to be accepted for the linking
    *
    * @param        address _newAddress
    * @param        bytes32 _sourceCodeUrl
    *
    * @modifiers    requireNoParent, requireNotInitialised
    */
    function linkToGateway(
        address _GatewayInterfaceAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireNoParent
        requireNotInitialised
        onlyDeployer
    {
        GatewayInterfaceAddress = _GatewayInterfaceAddress;
        sourceCodeUrl = _sourceCodeUrl;

        // init gateway entity and set app address
        GatewayInterfaceEntity = ABIGatewayInterface(GatewayInterfaceAddress);
        GatewayInterfaceEntity.requestCodeUpgrade( address(this), sourceCodeUrl );
    }

    function setUpgradeState(uint8 state) public onlyGatewayInterface {
        CurrentEntityState = state;
    }

    /*
        For the sake of simplicity, and solidity warnings about "unknown gas usage" do this.. instead of sending
        an array of addresses
    */
    function addAssetProposals(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ProposalsEntity = ABIProposals(_assetAddresses);
        assetInitialized("Proposals", _assetAddresses);
    }

    function addAssetFunding(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingEntity = ABIFunding(_assetAddresses);
        assetInitialized("Funding", _assetAddresses);
    }

    function addAssetMilestones(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MilestonesEntity = ABIMilestones(_assetAddresses);
        assetInitialized("Milestones", _assetAddresses);
    }

    function addAssetMeetings(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MeetingsEntity = ABIMeetings(_assetAddresses);
        assetInitialized("Meetings", _assetAddresses);
    }

    function addAssetBountyManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        BountyManagerEntity = ABIBountyManager(_assetAddresses);
        assetInitialized("BountyManager", _assetAddresses);
    }

    function addAssetTokenManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        TokenManagerEntity = ABITokenManager(_assetAddresses);
        assetInitialized("TokenManager", _assetAddresses);
    }

    function addAssetFundingManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingManagerEntity = ABIFundingManager(_assetAddresses);
        assetInitialized("FundingManager", _assetAddresses);
    }

    function addAssetListingContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ListingContractEntity = ABIListingContract(_assetAddresses);
        assetInitialized("ListingContract", _assetAddresses);
    }

    function addAssetNewsContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        NewsContractEntity = ABINewsContract(_assetAddresses);
        assetInitialized("NewsContract", _assetAddresses);
    }

    function assetInitialized(bytes32 name, address _assetAddresses) internal {
        if(AssetCollection[name] == 0x0) {
            AssetCollectionIdToName[AssetCollectionNum] = name;
            AssetCollection[name] = _assetAddresses;
            AssetCollectionNum++;
        } else {
            // just replace
            AssetCollection[name] = _assetAddresses;
        }
        EventAppEntityInitAsset(name, _assetAddresses);
    }

    function getAssetAddressByName(bytes32 _name) public view returns (address) {
        return AssetCollection[_name];
    }

    /* Application Bylaws mapping */
    mapping (bytes32 => uint256) public BylawsUint256;
    mapping (bytes32 => bytes32) public BylawsBytes32;


    function setBylawUint256(bytes32 name, uint256 value) public requireNotInitialised onlyDeployer {
        BylawsUint256[name] = value;
    }

    function getBylawUint256(bytes32 name) public view requireInitialised returns (uint256) {
        return BylawsUint256[name];
    }

    function setBylawBytes32(bytes32 name, bytes32 value) public requireNotInitialised onlyDeployer {
        BylawsBytes32[name] = value;
    }

    function getBylawBytes32(bytes32 name) public view requireInitialised returns (bytes32) {
        return BylawsBytes32[name];
    }

    function initialize() external requireNotInitialised onlyGatewayInterface returns (bool) {
        _initialized = true;
        EventAppEntityReady( address(this) );
        return true;
    }

    function getParentAddress() external view returns(address) {
        return GatewayInterfaceAddress;
    }

    function createCodeUpgradeProposal(
        address _newAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireInitialised
        onlyGatewayInterface
        returns (uint256)
    {
        // proposals create new.. code upgrade proposal
        EventAppEntityCodeUpgradeProposal ( _newAddress, _sourceCodeUrl );

        // return true;
        return ProposalsEntity.addCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
    }

    /*
    * Only a proposal can update the ApplicationEntity Contract address
    *
    * @param        address _newAddress
    * @modifiers    onlyProposalsAsset
    */
    function acceptCodeUpgradeProposal(address _newAddress) external onlyProposalsAsset  {
        GatewayInterfaceEntity.approveCodeUpgrade( _newAddress );
    }

    function initializeAssetsToThisApplication() external onlyGatewayInterface returns (bool) {

        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(current != address(0x0)) {
                if(!current.call(bytes4(keccak256("setInitialOwnerAndName(bytes32)")), _name) ) {
                    revert();
                }
            } else {
                revert();
            }
        }
        EventAppEntityInitAssetsToThis( AssetCollectionNum );

        return true;
    }

    function transferAssetsToNewApplication(address _newAddress) external onlyGatewayInterface returns (bool){
        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(current != address(0x0)) {
                if(!current.call(bytes4(keccak256("transferToNewOwner(address)")), _newAddress) ) {
                    revert();
                }
            } else {
                revert();
            }
        }
        EventAppEntityAssetsToNewApplication ( _newAddress );
        return true;
    }

    /*
    * Only the gateway interface can lock current app after a successful code upgrade proposal
    *
    * @modifiers    onlyGatewayInterface
    */
    function lock() external onlyGatewayInterface returns (bool) {
        _locked = true;
        CurrentEntityState = getEntityState("UPGRADED");
        EventAppEntityLocked(address(this));
        return true;
    }

    /*
        DUMMY METHOD, to be replaced in a future Code Upgrade with a check to determine if sender should be able to initiate a code upgrade
        specifically used after milestone development completes
    */
    address testAddressAllowUpgradeFrom;
    function canInitiateCodeUpgrade(address _sender) public view returns(bool) {
        // suppress warning
        if(testAddressAllowUpgradeFrom != 0x0 && testAddressAllowUpgradeFrom == _sender) {
            return true;
        }
        return false;
    }

    /*
    * Throws if called by any other entity except GatewayInterface
    */
    modifier onlyGatewayInterface() {
        require(GatewayInterfaceAddress != address(0) && msg.sender == GatewayInterfaceAddress);
        _;
    }

    /*
    * Throws if called by any other entity except Proposals Asset Contract
    */
    modifier onlyProposalsAsset() {
        require(msg.sender == address(ProposalsEntity));
        _;
    }

    modifier requireNoParent() {
        require(GatewayInterfaceAddress == address(0x0));
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false && _locked == false);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true && _locked == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress);
        _;
    }

    event DebugApplicationRequiredChanges( uint8 indexed _current, uint8 indexed _required );
    event EventApplicationEntityProcessor(uint8 indexed _current, uint8 indexed _required);

    /*
        We could create a generic method that iterates through all assets, and using assembly language get the return
        value of the "hasRequiredStateChanges" method on each asset. Based on return, run doStateChanges on them or not.

        Or we could be using a generic ABI contract that only defines the "hasRequiredStateChanges" and "doStateChanges"
        methods thus not requiring any assembly variable / memory management

        Problem with both cases is the fact that our application needs to change only specific asset states depending
        on it's own current state, thus making a generic call wasteful in gas usage.

        Let's stay away from that and follow the same approach as we do inside an asset.
        - view method: -> get required state changes
        - view method: -> has state changes
        - processor that does the actual changes.
        - doStateChanges recursive method that runs the processor if views require it to.

        // pretty similar to FundingManager
    */

    function doStateChanges() public {

        if(!_locked) {
            // process assets first so we can initialize them from NEW to WAITING
            AssetProcessor();

            var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
            bool callAgain = false;

            DebugApplicationRequiredChanges( returnedCurrentEntityState, EntityStateRequired );

            if(EntityStateRequired != getEntityState("__IGNORED__") ) {
                EntityProcessor(EntityStateRequired);
                callAgain = true;
            }
        } else {
            revert();
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        if(!_locked) {
            var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
            // suppress unused local variable warning
            returnedCurrentEntityState = 0;
            if(EntityStateRequired != getEntityState("__IGNORED__") ) {
                hasChanges = true;
            }

            if(anyAssetHasChanges()) {
                hasChanges = true;
            }
        }
        return hasChanges;
    }

    function anyAssetHasChanges() public view returns (bool) {
        if( FundingEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( FundingManagerEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( MilestonesEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( ProposalsEntity.hasRequiredStateChanges() ) {
            return true;
        }

        return extendedAnyAssetHasChanges();
    }

    // use this when extending "has changes"
    function extendedAnyAssetHasChanges() internal view returns (bool) {
        if(_initialized) {}
        return false;
    }

    // use this when extending "asset state processor"
    function extendedAssetProcessor() internal  {
        // does not exist, but we check anyway to bypass compier warning about function state mutability
        if ( CurrentEntityState == 255 ) {
            ProposalsEntity.process();
        }
    }

    // view methods decide if changes are to be made
    // in case of tasks, we do them in the Processors.

    function AssetProcessor() internal {


        if ( CurrentEntityState == getEntityState("NEW") ) {

            // move all assets that have states to "WAITING"
            if(FundingEntity.hasRequiredStateChanges()) {
                FundingEntity.doStateChanges();
            }

            if(FundingManagerEntity.hasRequiredStateChanges()) {
                FundingManagerEntity.doStateChanges();
            }

            if( MilestonesEntity.hasRequiredStateChanges() ) {
                MilestonesEntity.doStateChanges();
            }

        } else if ( CurrentEntityState == getEntityState("WAITING") ) {

            if( FundingEntity.hasRequiredStateChanges() ) {
                FundingEntity.doStateChanges();
            }
        }
        else if ( CurrentEntityState == getEntityState("IN_FUNDING") ) {

            if( FundingEntity.hasRequiredStateChanges() ) {
                FundingEntity.doStateChanges();
            }

            if( FundingManagerEntity.hasRequiredStateChanges() ) {
                FundingManagerEntity.doStateChanges();
            }
        }
        else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

            if( FundingManagerEntity.hasRequiredStateChanges() ) {
                FundingManagerEntity.doStateChanges();
            }

            if(MilestonesEntity.hasRequiredStateChanges()) {
                MilestonesEntity.doStateChanges();
            }

            if(ProposalsEntity.hasRequiredStateChanges()) {
                ProposalsEntity.process();
            }
        }
        else if ( CurrentEntityState == getEntityState("DEVELOPMENT_COMPLETE") ) {

            if(ProposalsEntity.hasRequiredStateChanges()) {
                ProposalsEntity.process();
            }
        }

        extendedAssetProcessor();
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {

        EventApplicationEntityProcessor( CurrentEntityState, EntityStateRequired );

        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        // Do State Specific Updates

        if ( EntityStateRequired == getEntityState("IN_FUNDING") ) {
            // run Funding state changer
            // doStateChanges
        }

        // EntityStateRequired = getEntityState("IN_FUNDING");


        // Funding Failed
        /*
        if ( EntityStateRequired == getEntityState("FUNDING_FAILED_START") ) {
            // set ProcessVaultList Task
            currentTask = getHash("FUNDING_FAILED_START", "");
            CurrentEntityState = getEntityState("FUNDING_FAILED_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("FUNDING_FAILED_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

            // Funding Successful
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_START") ) {

            // init SCADA variable cache.
            if(TokenSCADAEntity.initCacheForVariables()) {
                // start processing vaults
                currentTask = getHash("FUNDING_SUCCESSFUL_START", "");
                CurrentEntityState = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
            } else {
                // something went really wrong, just bail out for now
                CurrentEntityState = getEntityState("FUNDING_FAILED_START");
            }
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
            // Milestones
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_START") ) {
            currentTask = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneId() );
            CurrentEntityState = getEntityState("MILESTONE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

            // Completion
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_START") ) {
            currentTask = getHash("COMPLETE_PROCESS_START", "");
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
        }
        */
    }

    /*
     * Method: Get Entity Required State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       ( uint8 CurrentEntityState, uint8 EntityStateRequired )
     */
    function getRequiredStateChanges() public view returns (uint8, uint8) {

        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        if( CurrentEntityState == getEntityState("NEW") ) {
            // general so we know we initialized
            EntityStateRequired = getEntityState("WAITING");

        } else if ( CurrentEntityState == getEntityState("WAITING") ) {

            // Funding Started
            if( FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("IN_PROGRESS") ) {
                EntityStateRequired = getEntityState("IN_FUNDING");
            }

        } else if ( CurrentEntityState == getEntityState("IN_FUNDING") ) {

            if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL")) {
                // SUCCESSFUL_FINAL means FUNDING was successful, and FundingManager has finished distributing tokens and ether
                EntityStateRequired = getEntityState("IN_DEVELOPMENT");

            } else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED_FINAL")) {
                // Funding failed..
                EntityStateRequired = getEntityState("IN_GLOBAL_CASHBACK");
            }

        } else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

            // this is where most things happen
            // milestones get developed
            // code upgrades get initiated
            // proposals get created and voted

            /*
            if(ProposalsEntity.CurrentEntityState() == ProposalsEntity.getEntityState("CODE_UPGRADE_ACCEPTED")) {
                // check if we have an upgrade proposal that is accepted and move into said state
                EntityStateRequired = getEntityState("START_CODE_UPGRADE");
            }
            else
            */

            if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("DEVELOPMENT_COMPLETE")) {
                // check if we finished developing all milestones .. and if so move state to complete.
                EntityStateRequired = getEntityState("DEVELOPMENT_COMPLETE");
            }

            if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("DEADLINE_MEETING_TIME_FAILED")) {
                EntityStateRequired = getEntityState("IN_GLOBAL_CASHBACK");
            }

        } else if ( CurrentEntityState == getEntityState("START_CODE_UPGRADE") ) {

            // check stuff to move into IN_CODE_UPGRADE
            // EntityStateRequired = getEntityState("IN_CODE_UPGRADE");

        } else if ( CurrentEntityState == getEntityState("IN_CODE_UPGRADE") ) {

            // check stuff to finish
            // EntityStateRequired = getEntityState("FINISHED_CODE_UPGRADE");

        } else if ( CurrentEntityState == getEntityState("FINISHED_CODE_UPGRADE") ) {

            // move to IN_DEVELOPMENT or DEVELOPMENT_COMPLETE based on state before START_CODE_UPGRADE.
            // EntityStateRequired = getEntityState("DEVELOPMENT_COMPLETE");
            // EntityStateRequired = getEntityState("FINISHED_CODE_UPGRADE");

        }

        return (CurrentEntityState, EntityStateRequired);
    }

    function getTimestamp() view public returns (uint256) {
        return now;
    }

}