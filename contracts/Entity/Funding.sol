/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity


    !!! Links directly to Milestones

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../Entity/FundingManager.sol";
import "./../Entity/TokenManager.sol";

import "./../Inputs/FundingInputDirect.sol";
import "./../Inputs/FundingInputMilestone.sol";

contract Funding is ApplicationAsset {

    address public multiSigOutputAddress;
    FundingInputDirect public DirectInput;
    FundingInputMilestone public MilestoneInput;


    // mapping (bytes32 => uint8) public FundingMethods;
    enum FundingMethodIds {
        __IGNORED__,
        DIRECT_ONLY, 				//
        MILESTONE_ONLY, 		    //
        DIRECT_AND_MILESTONE		//
    }

    TokenManager public TokenManagerEntity;
    FundingManager public FundingManagerEntity;

    event FundingStageCreated( uint8 indexed index, bytes32 indexed name );

    struct FundingStage {
        bytes32 name;
        uint8   state;
        uint256 time_start;
        uint256 time_end;
        uint256 amount_cap_soft;            // 0 = not enforced
        uint256 amount_cap_hard;            // 0 = not enforced
        uint256 amount_raised;              // 0 = not enforced
        // funding method settings
        uint256 minimum_entry;
        uint8   methods;                    // FundingMethodIds
        // token settings
        uint256 fixed_tokens;
        uint8   price_addition_percentage;  //
        uint8   token_share_percentage;
        uint8   index;
    }

    mapping (uint8 => FundingStage) public Collection;
    uint8 public FundingStageNum = 0;
    uint8 public currentFundingStage = 1;

    // funding settings
    uint256 public AmountRaised = 0;
    uint256 public MilestoneAmountRaised = 0;

    uint256 public GlobalAmountCapSoft = 0;
    uint256 public GlobalAmountCapHard = 0;

    uint8 public TokenSellPercentage = 0;

    uint256 public Funding_Setting_funding_time_start = 0;
    uint256 public Funding_Setting_funding_time_end = 0;

    uint256 public Funding_Setting_cashback_time_start = 0;
    // end time is ignored at this stage, anyone can cashback forever if funding fails.
    uint256 public Funding_Setting_cashback_time_end = 0;

    // to be taken from application bylaws
    uint256 public Funding_Setting_cashback_before_start_wait_duration = 7 days;
    uint256 public Funding_Setting_cashback_duration = 90 days;

    event LifeCycle();
    event DebugRecordRequiredChanges( bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required );
    event DebugCallAgain(uint8 indexed _who);

    event EventEntityProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);
    event EventRecordProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);

    event DebugAction(bytes32 indexed _name, bool indexed _allowed);


    event EventFundingReceivedPayment(address indexed _sender, uint8 indexed _payment_method, uint256 indexed _amount );

    function runBeforeInitialization() internal requireNotInitialised {
        DirectInput = new FundingInputDirect();
        MilestoneInput = new FundingInputMilestone();

        // instantiate token manager, moved from runBeforeApplyingSettings
        TokenManagerEntity = TokenManager( getApplicationAssetAddressByName('TokenManager') );
        FundingManagerEntity = FundingManager( getApplicationAssetAddressByName('FundingManager') );

        EventRunBeforeInit(assetName);
    }

    /*
    function runBeforeApplyingSettings() internal requireInitialised requireSettingsNotApplied {
        AllocateTokens();
        EventRunBeforeApplyingSettings(assetName);
    }

    event EventAllocateTokens(address _addr, uint8 _value);

    function AllocateTokens() internal {
        EventAllocateTokens(address(FundingManagerEntity), TokenSellPercentage);
        TokenManagerEntity.AllocateInitialTokenBalances(TokenSellPercentage, address(FundingManagerEntity), getApplicationAssetAddressByName('BountyManager'));
    }
    */


    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]     = 0;
        EntityStates["NEW"]             = 1;
        EntityStates["WAITING"]         = 2;
        EntityStates["IN_PROGRESS"]     = 3;
        EntityStates["COOLDOWN"]        = 4;
        EntityStates["FUNDING_ENDED"]   = 5;
        EntityStates["FAILED"]          = 6;
        EntityStates["FAILED_FINAL"]    = 7;
        EntityStates["SUCCESSFUL"]      = 8;
        EntityStates["SUCCESSFUL_FINAL"]= 9;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
    }


    /*
        When using a funding model that can sell tokens at the market decided value, then a global hard cap is required.
        If global hard cap is defined:
            - funding stage caps are ignored.
            - token distribution is done based on fractions in each funding stage
            - tokens left unsold in funding stages get redistributed to all participants
    */

    function addSettings(address _outputAddress, uint256 soft_cap, uint256 hard_cap, uint8 sale_percentage )
        public
        requireInitialised
        requireSettingsNotApplied
    {
        if(soft_cap > hard_cap) {
            revert();
        }

        multiSigOutputAddress = _outputAddress;
        GlobalAmountCapSoft = soft_cap;
        GlobalAmountCapHard = hard_cap;

        if(sale_percentage > 90) {
            revert();
        }

        TokenSellPercentage =  sale_percentage;
    }

    function addFundingStage(
        bytes32 _name,
        uint256 _time_start,
        uint256 _time_end,
        uint256 _amount_cap_soft,
        uint256 _amount_cap_hard,   // required > 0
        uint8   _methods,
        uint256 _minimum_entry,
        uint256 _fixed_tokens,
        uint8   _price_addition_percentage,
        uint8   _token_share_percentage
    )
        public
        onlyDeployer
        requireInitialised
        requireSettingsNotApplied
    {

        // make sure end time is later than start time
        if(_time_end <= _time_start) {
            revert();
        }

        // if TokenSCADA requires hard cap, then we require it, otherwise we reject it if provided

        if(TokenManagerEntity.getTokenSCADARequiresHardCap() == true)
        {
            // make sure hard cap exists!
            if(_amount_cap_hard == 0) {
                revert();
            }

            // make sure soft cap is not higher than hard cap
            if(_amount_cap_soft > _amount_cap_hard) {
                revert();
            }

            if(_token_share_percentage > 0) {
                revert();
            }


        } else {

            // make sure record hard cap and soft cap is zero!
            if(_amount_cap_hard != 0) {
                revert();
            }

            if(_amount_cap_soft != 0) {
                revert();
            }

            // make sure we're not selling more than 100% of token share... as that's not possible
            if(_token_share_percentage > 100) {
                revert();
            }
        }

        FundingStage storage prevRecord = Collection[FundingStageNum];
        if(FundingStageNum > 0) {

            // new stage does not start before the previous one ends
            if( _time_start <= prevRecord.time_end ) {
                revert();
            }

            if(TokenManagerEntity.getTokenSCADARequiresHardCap() == false)
            {
                // make sure previous stage + new stage token percentage does not amount to over 90%
                if( _token_share_percentage + prevRecord.token_share_percentage > 90 ) {
                    revert();
                }
            }
        }

        FundingStage storage record = Collection[++FundingStageNum];
        record.name             = _name;
        record.time_start       = _time_start;
        record.time_end         = _time_end;
        record.amount_cap_soft  = _amount_cap_soft;
        record.amount_cap_hard  = _amount_cap_hard;

        // funding method settings
        record.methods          = _methods;
        record.minimum_entry    = _minimum_entry;

        // token settings
        record.fixed_tokens              = _fixed_tokens;
        record.price_addition_percentage = _price_addition_percentage;
        record.token_share_percentage    = _token_share_percentage;

        // state new
        record.state = getRecordState("NEW");
        record.index = FundingStageNum;

        FundingStageCreated( FundingStageNum, _name );

        adjustFundingSettingsBasedOnNewFundingStage();
    }

    function adjustFundingSettingsBasedOnNewFundingStage() internal {

        if(TokenManagerEntity.getTokenSCADARequiresHardCap() == false) {
            uint8 local_TokenSellPercentage;
            for(uint8 i = 1; i <= FundingStageNum; i++) {
                FundingStage storage rec = Collection[i];
                // cumulate sell percentages
                local_TokenSellPercentage+= rec.token_share_percentage;
            }
            TokenSellPercentage = local_TokenSellPercentage;
        }

        // set funding start
        Funding_Setting_funding_time_start = Collection[1].time_start;
        // set funding end
        Funding_Setting_funding_time_end = Collection[FundingStageNum].time_end;

        // set cashback just in case
        // cashback starts 1 day after funding status is failed
        Funding_Setting_cashback_time_start = Funding_Setting_funding_time_end + Funding_Setting_cashback_before_start_wait_duration;
        Funding_Setting_cashback_time_end = Funding_Setting_cashback_time_start + Funding_Setting_cashback_duration;
    }

    function getStageAmount(uint8 StageId) public view returns ( uint256 ) {
        return Collection[StageId].fixed_tokens;
    }

    function allowedPaymentMethod(uint8 _payment_method) public pure returns (bool) {
        if(
        _payment_method == uint8(FundingMethodIds.DIRECT_ONLY) ||
        _payment_method == uint8(FundingMethodIds.MILESTONE_ONLY)
        ){
            return true;
        } else {
            return false;
        }
    }

    function receivePayment(address _sender, uint8 _payment_method)
        payable
        public
        requireInitialised
        onlyInputPaymentMethod
        returns(bool)
    {
        // check that msg.value is higher than 0, don't really want to have to deal with minus in case the network breaks this somehow
        if(allowedPaymentMethod(_payment_method) && canAcceptPayment(msg.value) ) {

            uint256 contributed_value = msg.value;

            uint256 amountOverCap = getValueOverCurrentCap(contributed_value);
            if ( amountOverCap > 0 ) {
                // calculate how much we can accept

                // update contributed value
                contributed_value -= amountOverCap;
            }

            Collection[currentFundingStage].amount_raised+= contributed_value;
            AmountRaised+= contributed_value;

            if(_payment_method == uint8(FundingMethodIds.MILESTONE_ONLY)) {
                MilestoneAmountRaised+=contributed_value;
            }

            EventFundingReceivedPayment(_sender, _payment_method, contributed_value);

            if( FundingManagerEntity.receivePayment.value(contributed_value)( _sender, _payment_method, currentFundingStage ) ) {

                if(amountOverCap > 0) {
                    // last step, if we received more than we can accept, send remaining back
                    // amountOverCap sent back
                    if( _sender.send(this.balance) ) {
                        return true;
                    }
                    else {
                        revert();
                    }
                } else {
                    return true;
                }
            } else {
                revert();
            }

        } else {
            revert();
        }
    }

    modifier onlyInputPaymentMethod() {
        require(msg.sender != 0x0 && ( msg.sender == address(DirectInput) || msg.sender == address(MilestoneInput) ));
        _;
    }

    function canAcceptPayment(uint256 _amount) public view returns (bool) {
        if( _amount > 0 ) {
            // funding state should be IN_PROGRESS, no state changes should be required
            if( CurrentEntityState == getEntityState("IN_PROGRESS") && hasRequiredStateChanges() == false) {
                return true;
            }
        }
        return false;
    }

    function getValueOverCurrentCap(uint256 _amount) public view returns (uint256) {
        FundingStage memory record = Collection[currentFundingStage];
        uint256 remaining = record.amount_cap_hard - AmountRaised;
        if( _amount > remaining ) {
            return _amount - remaining;
        }
        return 0;
    }


    /*
    * Update Existing FundingStage
    *
    * @param        uint8 _record_id
    * @param        uint8 _new_state
    * @param        uint8 _duration
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised, updateAllowed
    *
    * @return       void
    */

    function updateFundingStage( uint8 _new_state )
        internal
        requireInitialised
        FundingStageUpdateAllowed(_new_state)
        returns (bool)
    {
        FundingStage storage rec = Collection[currentFundingStage];
        rec.state       = _new_state;
        return true;
    }


    /*
    * Modifier: Validate if record updates are allowed
    *
    * @type         modifier
    *
    * @param        uint8 _record_id
    * @param        uint8 _new_state
    * @param        uint256 _duration
    *
    * @return       bool
    */

    modifier FundingStageUpdateAllowed(uint8 _new_state) {
        require( isFundingStageUpdateAllowed( _new_state )  );
        _;
    }

    /*
     * Method: Validate if record can be updated to requested state
     *
     * @access       public
     * @type         method
     *
     * @param        uint8 _record_id
     * @param        uint8 _new_state
     *
     * @return       bool
     */
    function isFundingStageUpdateAllowed(uint8 _new_state ) public view returns (bool) {

        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();

        CurrentRecordState = 0;
        EntityStateRequired = 0;

        if(_new_state == uint8(RecordStateRequired)) {
            return true;
        }
        return false;
    }

    /*
     * Funding Phase changes
     *
     * Method: Get FundingStage Required State Changes
     *
     * @access       public
     * @type         method
     * @modifiers    onlyOwner
     *
     * @return       uint8 RecordStateRequired
     */
    function getRecordStateRequiredChanges() public view returns (uint8) {

        FundingStage memory record = Collection[currentFundingStage];
        uint8 RecordStateRequired = getRecordState("__IGNORED__");

        if(record.state == getRecordState("FINAL")) {
            return getRecordState("__IGNORED__");
        }

        /*
            If funding stage is not started and timestamp is after start time:
            - we need to change state to IN_PROGRESS so we can start receiving funds
        */
        if( getTimestamp() >= record.time_start ) {
            RecordStateRequired = getRecordState("IN_PROGRESS");
        }

        /*
            This is where we're accepting payments unless we can change state to FINAL

            1. Check if timestamp is after record time_end
            2. Check hard caps
            All lead to state change => FINAL
        */

        // Time check
        if(getTimestamp() >= record.time_end) {
            // Funding Phase ended passed
            return getRecordState("FINAL");
        }

        // will trigger in pre-ico
        // Record Hard Cap Check
        if(AmountRaised >= record.amount_cap_hard) {
            // record hard cap reached
            return getRecordState("FINAL");
        }

        // will trigger in ico
        // Global Hard Cap Check
        if(AmountRaised >= GlobalAmountCapHard) {
            // hard cap reached
            return getRecordState("FINAL");
        }

        if( record.state == RecordStateRequired ) {
            RecordStateRequired = getRecordState("__IGNORED__");
        }

        return RecordStateRequired;
    }

    function doStateChanges() public {
        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugRecordRequiredChanges( assetName, CurrentRecordState, RecordStateRequired );
        DebugEntityRequiredChanges( assetName, CurrentEntityState, EntityStateRequired );

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {
            // process record changes.
            RecordProcessor(CurrentRecordState, RecordStateRequired);
            DebugCallAgain(2);
            callAgain = true;
        }

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            // process entity changes.
            // if(CurrentEntityState != EntityStateRequired) {
            EntityProcessor(EntityStateRequired);
            DebugCallAgain(1);
            callAgain = true;
            //}
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;

        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();
        CurrentRecordState = 0;

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {
            hasChanges = true;
        }
        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            hasChanges = true;
        }
        return hasChanges;
    }

    // view methods decide if changes are to be made
    // in case of tasks, we do them in the Processors.

    function RecordProcessor(uint8 CurrentRecordState, uint8 RecordStateRequired) internal {
        EventRecordProcessor( assetName, CurrentRecordState, RecordStateRequired );
        updateFundingStage( RecordStateRequired );
        if( RecordStateRequired == getRecordState("FINAL") ) {
            if(currentFundingStage < FundingStageNum) {
                // jump to next stage
                currentFundingStage++;
            }
        }
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {
        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Do State Specific Updates
        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        if ( EntityStateRequired == getEntityState("FUNDING_ENDED") ) {
            /*
                STATE: FUNDING_ENDED
                @Processor hook
                Action: Check if funding is successful or not, and move state to "FAILED" or "SUCCESSFUL"
            */

            // Global Hard Cap Check
            if(AmountRaised >= GlobalAmountCapSoft) {
                // hard cap reached
                CurrentEntityState = getEntityState("SUCCESSFUL");
            } else {
                CurrentEntityState = getEntityState("FAILED");
            }
        }


    }

    /*
     * Method: Get Record and Entity State Changes
     *
     * @access       public
     * @type         method
     * @modifiers    onlyOwner
     *
     * @return       ( uint8 CurrentRecordState, uint8 RecordStateRequired, uint8 EntityStateRequired)
     */
    function getRequiredStateChanges() public view returns (uint8, uint8, uint8) {

        // get FundingStage current state
        FundingStage memory record = Collection[currentFundingStage];

        uint8 CurrentRecordState = record.state;
        uint8 RecordStateRequired = getRecordStateRequiredChanges();
        uint8 EntityStateRequired = getEntityState("__IGNORED__");


        // Funding Record State Overrides
        // if(CurrentRecordState != RecordStateRequired) {
        if(RecordStateRequired != getRecordState("__IGNORED__"))
        {
            // direct state overrides by funding stage
            if(RecordStateRequired == getRecordState("IN_PROGRESS") ) {
                // both funding stage and entity states need to move to IN_PROGRESS
                EntityStateRequired = getEntityState("IN_PROGRESS");

            } else if (RecordStateRequired == getRecordState("FINAL")) {
                // funding stage moves to FINAL

                if (currentFundingStage == FundingStageNum) {
                    // if current funding is last
                    EntityStateRequired = getEntityState("FUNDING_ENDED");
                }
                else {
                    // start cooldown between funding stages
                    EntityStateRequired = getEntityState("COOLDOWN");
                }
            }

        } else {

            // Records do not require any updates.
            // Do Entity Checks

            if( CurrentEntityState == getEntityState("NEW") ) {
                /*
                    STATE: NEW
                    Processor Action: Allocate Tokens to Funding / Owners then Update to WAITING
                */
                EntityStateRequired = getEntityState("WAITING");
            } else  if ( CurrentEntityState == getEntityState("FUNDING_ENDED") ) {
                /*
                    STATE: FUNDING_ENDED
                    Processor Action: Check if funding is successful or not, and move state to "SUCCESSFUL" or "FAILED"
                */
            } else if ( CurrentEntityState == getEntityState("SUCCESSFUL") ) {
                /*
                    STATE: SUCCESSFUL
                    Processor Action: none

                    External Action:
                    FundingManager - Run Internal Processor ( deliver tokens, deliver direct funding eth )
                */

                // check funding manager has processed the FUNDING_SUCCESSFUL Task, if true => FUNDING_SUCCESSFUL_DONE
                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_SUCCESSFUL_START", "") ) == true) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                /*
                if( FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("FUNDING_SUCCESSFUL_DONE") ) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                */

            } else if ( CurrentEntityState == getEntityState("FAILED") ) {
                /*
                    STATE: FAILED
                    Processor Action: none

                    External Action:
                    FundingManager - Run Internal Processor (release tokens to owner) ( Cashback is available )
                */

                // check funding manager state, if FUNDING_NOT_PROCESSED -> getEntityState("__IGNORED__")
                // if FUNDING_FAILED_DONE

                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_FAILED_START", "") ) == true) {
                    EntityStateRequired = getEntityState("FAILED_FINAL");
                }
            } else if ( CurrentEntityState == getEntityState("SUCCESSFUL_FINAL") ) {
                /*
                    STATE: SUCCESSFUL_FINAL
                    Processor Action: none

                    External Action:
                    Application: Run Internal Processor ( Change State to IN_DEVELOPMENT )
                */
            } else if ( CurrentEntityState == getEntityState("FAILED_FINAL") ) {
                /*
                    STATE: FINAL_FAILED
                    Processor Action: none

                    External Action:
                    Application: Run Internal Processor ( Change State to FUNDING_FAILED )
                */
            }
        }


        return (CurrentRecordState, RecordStateRequired, EntityStateRequired);
    }

}