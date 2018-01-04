/*

 * @name        Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Any contract inheriting this will be usable as an Asset in the Application Entity

*/

pragma solidity ^0.4.17;
import "./ApplicationEntityABI.sol";

contract ApplicationAsset {

    event EventAppAssetOwnerSet(bytes32 indexed _name, address indexed _owner);
    event EventRunBeforeInit(bytes32 indexed _name);
    event EventRunBeforeApplyingSettings(bytes32 indexed _name);


    mapping (bytes32 => uint8) public EntityStates;
    mapping (bytes32 => uint8) public RecordStates;
    uint8 public CurrentEntityState;

    event EventEntityProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);
    event DebugEntityRequiredChanges( bytes32 _assetName, uint8 indexed _current, uint8 indexed _required );

    bytes32 public assetName;

    /* Asset records */
    uint8 public RecordNum = 0;

    /* Asset initialised or not */
    bool public _initialized = false;

    /* Asset settings present or not */
    bool public _settingsApplied = false;

    /* Asset owner ( ApplicationEntity address ) */
    address public owner = address(0x0) ;
    address public deployerAddress;

    function ApplicationAsset() public {
        deployerAddress = msg.sender;
    }

    function setInitialApplicationAddress(address _ownerAddress) public onlyDeployer requireNotInitialised {
        owner = _ownerAddress;
    }

    function setInitialOwnerAndName(bytes32 _name) external
        requireNotInitialised
        onlyOwner
        returns (bool)
    {
        // init states
        setAssetStates();
        assetName = _name;
        // set initial state
        CurrentEntityState = getEntityState("NEW");
        runBeforeInitialization();
        _initialized = true;
        EventAppAssetOwnerSet(_name, owner);
        return true;
    }

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]     = 0;
        EntityStates["NEW"]             = 1;
        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
    }

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getEntityState(bytes32 name) public view returns (uint8) {
        return EntityStates[name];
    }

    function runBeforeInitialization() internal requireNotInitialised  {
        EventRunBeforeInit(assetName);
    }

    function applyAndLockSettings()
        public
        onlyDeployer
        requireInitialised
        requireSettingsNotApplied
        returns(bool)
    {
        runBeforeApplyingSettings();
        _settingsApplied = true;
        return true;
    }

    function runBeforeApplyingSettings() internal requireInitialised requireSettingsNotApplied  {
        EventRunBeforeApplyingSettings(assetName);
    }

    function transferToNewOwner(address _newOwner) public requireInitialised onlyOwner returns (bool) {
        require(owner != address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        EventAppAssetOwnerSet(assetName, owner);
        return true;
    }

    function getApplicationAssetAddressByName(bytes32 _name)
        public
        view
        returns(address)
    {
        address asset = ApplicationEntityABI(owner).getAssetAddressByName(_name);
        if( asset != address(0x0) ) {
            return asset;
        } else {
            revert();
        }
    }

    function getApplicationState() public view returns (uint8) {
        return ApplicationEntityABI(owner).CurrentEntityState();
    }

    function getApplicationEntityState(bytes32 name) public view returns (uint8) {
        return ApplicationEntityABI(owner).getEntityState(name);
    }

    function getAppBylawUint256(bytes32 name) public view requireInitialised returns (uint256) {
        ApplicationEntityABI CurrentApp = ApplicationEntityABI(owner);
        return CurrentApp.getBylawUint256(name);
    }

    function getAppBylawBytes32(bytes32 name) public view requireInitialised returns (bytes32) {
        ApplicationEntityABI CurrentApp = ApplicationEntityABI(owner);
        return CurrentApp.getBylawBytes32(name);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyApplicationEntity() {
        require(msg.sender == owner);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false);
        _;
    }

    modifier requireSettingsApplied() {
        require(_settingsApplied == true);
        _;
    }

    modifier requireSettingsNotApplied() {
        require(_settingsApplied == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress);
        _;
    }

    modifier onlyAsset(bytes32 _name) {
        address AssetAddress = getApplicationAssetAddressByName(_name);
        require( msg.sender == AssetAddress);
        _;
    }

    function getTimestamp() view public returns (uint256) {
        return now;
    }


}
