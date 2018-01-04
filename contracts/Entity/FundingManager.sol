/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./FundingVault.sol";
import "./TokenManager.sol";
import "./Proposals.sol";
import "./Milestones.sol";
import "./Funding.sol";
import "./Token.sol";
import "./../Algorithms/TokenSCADA1Market.sol";

contract FundingManager is ApplicationAsset {

    Funding FundingEntity;
    TokenManager TokenManagerEntity;
    Token TokenEntity;
    TokenSCADAGeneric TokenSCADAEntity;
    Proposals ProposalsEntity;
    Milestones MilestonesEntity;

    uint256 public LockedVotingTokens = 0;

    event EventFundingManagerReceivedPayment(address indexed _vault, uint8 indexed _payment_method, uint256 indexed _amount );
    event EventFundingManagerProcessedVault(address _vault, uint256 id );

    mapping  (address => address) public vaultList;
    mapping  (uint256 => address) public vaultById;
    uint256 public vaultNum = 0;

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]                 = 0;
        EntityStates["NEW"]                         = 1;
        EntityStates["WAITING"]                     = 2;

        EntityStates["FUNDING_FAILED_START"]        = 10;
        EntityStates["FUNDING_FAILED_PROGRESS"]     = 11;
        EntityStates["FUNDING_FAILED_DONE"]         = 12;

        EntityStates["FUNDING_SUCCESSFUL_START"]    = 20;
        EntityStates["FUNDING_SUCCESSFUL_PROGRESS"] = 21;
        EntityStates["FUNDING_SUCCESSFUL_DONE"]     = 22;

        EntityStates["MILESTONE_PROCESS_START"]     = 30;
        EntityStates["MILESTONE_PROCESS_PROGRESS"]  = 31;
        EntityStates["MILESTONE_PROCESS_DONE"]      = 32;

        EntityStates["EMERGENCY_PROCESS_START"]     = 40;
        EntityStates["EMERGENCY_PROCESS_PROGRESS"]  = 41;
        EntityStates["EMERGENCY_PROCESS_DONE"]      = 42;


        EntityStates["COMPLETE_PROCESS_START"]     = 100;
        EntityStates["COMPLETE_PROCESS_PROGRESS"]  = 101;
        EntityStates["COMPLETE_PROCESS_DONE"]      = 102;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;

    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);
        EventRunBeforeApplyingSettings(assetName);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAGeneric(TokenSCADAAddress) ;

        address MilestonesAddress = getApplicationAssetAddressByName('Milestones');
        MilestonesEntity = Milestones(MilestonesAddress) ;

        address ProposalsAddress = getApplicationAssetAddressByName('Proposals');
        ProposalsEntity = Proposals(ProposalsAddress) ;
    }



    function receivePayment(address _sender, uint8 _payment_method, uint8 _funding_stage)
        payable
        public
        requireInitialised
        onlyAsset('Funding')
        returns(bool)
    {
        // check that msg.value is higher than 0, don't really want to have to deal with minus in case the network breaks this somehow
        if(msg.value > 0) {
            FundingVault vault;

            // no vault present
            if(!hasVault(_sender)) {
                // create and initialize a new one
                vault = new FundingVault();
                if(vault.initialize(
                    _sender,
                    FundingEntity.multiSigOutputAddress(),
                    address(FundingEntity),
                    address(getApplicationAssetAddressByName('Milestones')),
                    address(getApplicationAssetAddressByName('Proposals'))
                )) {
                    // store new vault address.
                    vaultList[_sender] = vault;
                    // increase internal vault number
                    vaultNum++;
                    // assign vault to by int registry
                    vaultById[vaultNum] = vault;

                } else {
                    revert();
                }
            } else {
                // use existing vault
                vault = FundingVault(vaultList[_sender]);
            }

            EventFundingManagerReceivedPayment(vault, _payment_method, msg.value);

            if( vault.addPayment.value(msg.value)( _payment_method, _funding_stage ) ) {
                return true;
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function getMyVaultAddress(address _sender) public view returns (address) {
        return vaultList[_sender];
    }

    function hasVault(address _sender) internal view returns(bool) {
        if(vaultList[_sender] != address(0x0)) {
            return true;
        } else {
            return false;
        }
    }

    bool public fundingProcessed = false;
    uint256 public lastProcessedVaultId = 0;
    uint8 public VaultCountPerProcess = 10;
    bytes32 public currentTask = "";

    mapping (bytes32 => bool) public taskByHash;

    function setVaultCountPerProcess(uint8 _perProcess) external onlyDeployer {
        if(_perProcess > 0) {
            VaultCountPerProcess = _perProcess;
        } else {
            revert();
        }
    }

    function getHash(bytes32 actionType, bytes32 arg1) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1);
    }

    function getCurrentMilestoneProcessed() public view returns (bool) {
        return taskByHash[ getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash() ) ];
    }



    function ProcessVaultList(uint8 length) internal {

        if(taskByHash[currentTask] == false) {
            if(
                CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ||
                CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ||
                CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ||
                CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS") ||
                CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS")
            ) {

                uint256 start = lastProcessedVaultId + 1;
                uint256 end = start + length - 1;

                if(end > vaultNum) {
                    end = vaultNum;
                }

                // first run
                if(start == 1) {
                    // reset LockedVotingTokens, as we reindex them
                    LockedVotingTokens = 0;
                }

                for(uint256 i = start; i <= end; i++) {
                    address currentVault = vaultById[i];
                    EventFundingManagerProcessedVault(currentVault, i);
                    ProcessFundingVault(currentVault);
                    lastProcessedVaultId++;
                }
                if(lastProcessedVaultId >= vaultNum ) {
                    // reset iterator and set task state to true so we can't call it again.
                    lastProcessedVaultId = 0;
                    taskByHash[currentTask] = true;
                }
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function processFundingFailedFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_FAILED_START", "");
        return taskByHash[thisHash];
    }

    function processFundingSuccessfulFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_SUCCESSFUL_START", "");
        return taskByHash[thisHash];
    }

    function getCurrentMilestoneIdHash() internal view returns (bytes32) {
        return bytes32(MilestonesEntity.currentRecord());
    }

    function processMilestoneFinished() public view returns (bool) {
        bytes32 thisHash = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash());
        return taskByHash[thisHash];
    }

    function processEmergencyFundReleaseFinished() public view returns (bool) {
        bytes32 thisHash = getHash("EMERGENCY_PROCESS_START", bytes32(0));
        return taskByHash[thisHash];
    }

    function ProcessFundingVault(address vaultAddress ) internal {
        FundingVault vault = FundingVault(vaultAddress);

        if(vault.allFundingProcessed() == false) {

            if(CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {

                // step 1 -  transfer bought token share from "manager" to "vault"
                TokenEntity.transfer( vaultAddress, vault.getBoughtTokens() );

                // vault should now hold as many tokens as the investor bought using direct and milestone funding,
                // as well as the ether they sent
                // "direct funding" release -> funds to owner / tokens to investor
                if(!vault.ReleaseFundsAndTokens()) {
                    revert();
                }

            } else if(CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS")) {
                // release funds to owner / tokens to investor
                if(!vault.ReleaseFundsAndTokens()) {
                    revert();
                }

            } else if(CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS")) {
                // release emergency funds to owner / tokens to investor
                if(!vault.releaseTokensAndEtherForEmergencyFund()) {
                    revert();
                }
            }

            // For proposal voting, we need to know how many investor locked tokens remain.
            LockedVotingTokens+= getAfterTransferLockedTokenBalances(vaultAddress, true);

        }
    }

    function getAfterTransferLockedTokenBalances(address vaultAddress, bool excludeCurrent) public view returns (uint256) {
        FundingVault vault = FundingVault(vaultAddress);
        uint8 currentMilestone = MilestonesEntity.currentRecord();

        uint256 LockedBalance = 0;
        // handle emergency funding first
        if(vault.emergencyFundReleased() == false) {
            LockedBalance+=vault.tokenBalances(0);
        }

        // get token balances starting from current
        uint8 start = currentMilestone;

        if(CurrentEntityState != getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {
            if(excludeCurrent == true) {
                start++;
            }
        }

        for(uint8 i = start; i < vault.BalanceNum() ; i++) {
            LockedBalance+=vault.tokenBalances(i);
        }
        return LockedBalance;

    }

    function VaultRequestedUpdateForLockedVotingTokens(address owner) public {
        // validate sender
        address vaultAddress = vaultList[owner];
        if(msg.sender == vaultAddress){
            // get token balances starting from current
            LockedVotingTokens-= getAfterTransferLockedTokenBalances(vaultAddress, false);
        }
    }

    function doStateChanges() public {

        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugEntityRequiredChanges( assetName, returnedCurrentEntityState, EntityStateRequired );

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            EntityProcessor(EntityStateRequired);
            callAgain = true;
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        // suppress unused local variable warning
        returnedCurrentEntityState = 0;
        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            hasChanges = true;
        }
        return hasChanges;
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {

        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Update our Entity State
        CurrentEntityState = EntityStateRequired;
        // Do State Specific Updates

// Funding Failed
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
                // CurrentEntityState = getEntityState("FUNDING_FAILED_START");
            }
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
// Milestones
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_START") ) {
            currentTask = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash() );
            CurrentEntityState = getEntityState("MILESTONE_PROCESS_PROGRESS");

        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Emergency funding release
        } else if ( EntityStateRequired == getEntityState("EMERGENCY_PROCESS_START") ) {
            currentTask = getHash("EMERGENCY_PROCESS_START", bytes32(0) );
            CurrentEntityState = getEntityState("EMERGENCY_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("EMERGENCY_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Completion
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_START") ) {
            currentTask = getHash("COMPLETE_PROCESS_START", "");
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_PROGRESS");

        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
            // release platform owner tokens from token manager
            TokenManagerEntity.ReleaseOwnersLockedTokens( FundingEntity.multiSigOutputAddress() );
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_DONE");
        }

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

        if(ApplicationInFundingOrDevelopment()) {

            if ( CurrentEntityState == getEntityState("WAITING") ) {
                /*
                    This is where we decide if we should process something
                */

                // For funding
                if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED")) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_START");
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL")) {
                    // make sure we haven't processed this yet
                    if(taskByHash[ getHash("FUNDING_SUCCESSFUL_START", "") ] == false) {
                        EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_START");
                    }
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL")) {

                    if ( processMilestoneFinished() == false) {
                        if(
                            MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_YES") ||
                            MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_NO_FINAL")
                        ) {
                            EntityStateRequired = getEntityState("MILESTONE_PROCESS_START");
                        }
                    }

                    if(processEmergencyFundReleaseFinished() == false) {
                        if(ProposalsEntity.EmergencyFundingReleaseApproved() == true) {
                            EntityStateRequired = getEntityState("EMERGENCY_PROCESS_START");
                        }
                    }

                    // else, check if all milestones have been processed and try finalising development process
                    // EntityStateRequired = getEntityState("COMPLETE_PROCESS_START");


                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingSuccessfulFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_DONE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_DONE") ) {
                EntityStateRequired = getEntityState("WAITING");

    // Funding Failed
            } else if ( CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingFailedFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_DONE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_PROGRESS");
                }

    // Milestone process
            } else if ( CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done

                if ( processMilestoneFinished() ) {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("MILESTONE_PROCESS_DONE") ) {

                if(processMilestoneFinished() == false) {
                    EntityStateRequired = getEntityState("WAITING");

                } else if(MilestonesEntity.currentRecord() == MilestonesEntity.RecordNum()) {
                    EntityStateRequired = getEntityState("COMPLETE_PROCESS_START");
                }

    // Emergency funding release
            } else if ( CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done

                if ( processEmergencyFundReleaseFinished() ) {
                    EntityStateRequired = getEntityState("EMERGENCY_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("EMERGENCY_PROCESS_PROGRESS");
                }
            } else if ( CurrentEntityState == getEntityState("EMERGENCY_PROCESS_DONE") ) {
                EntityStateRequired = getEntityState("WAITING");

    // Completion
            } else if ( CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
                EntityStateRequired = getEntityState("COMPLETE_PROCESS_PROGRESS");
            }
        } else {

            if( CurrentEntityState == getEntityState("NEW") ) {
                // general so we know we initialized
                EntityStateRequired = getEntityState("WAITING");
            }
        }

        return (CurrentEntityState, EntityStateRequired);
    }

    function ApplicationInFundingOrDevelopment() public view returns(bool) {
        uint8 AppState = getApplicationState();
        if(
            AppState == getApplicationEntityState("IN_FUNDING") ||
            AppState == getApplicationEntityState("IN_DEVELOPMENT")
        ) {
            return true;
        }
        return false;
    }



}
