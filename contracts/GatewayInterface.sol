/*

 * source       https://github.com/blockbitsio/

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Application

 ENS: gateway.main.blockbits.eth will point directly to this contract.

    ADD ENS domain ownership / transfer methods

*/

pragma solidity ^0.4.17;

import "./ApplicationEntityABI.sol";

contract GatewayInterface {

    event EventGatewayNewLinkRequest ( address indexed newAddress );
    event EventGatewayNewAddress ( address indexed newAddress );

    address public currentApplicationEntityAddress;
    ApplicationEntityABI private currentApp;

    address public deployerAddress;

    function GatewayInterface() public {
        deployerAddress = msg.sender;
    }

    /**
    @notice Get current ApplicationEntity Contract address
    @return {
        "currentApplicationEntityAddress": Currently bound application address
    }
    */
    function getApplicationAddress() external view returns (address) {
        return currentApplicationEntityAddress;
    }


    /**
    @notice ApplicationEntity Contract requests to be linked
    @dev modifier validCodeUpgradeInitiator
    @param _newAddress address, The address of the application contract
    @param _sourceCodeUrl bytes32, The url of the application source code on etherscan
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function requestCodeUpgrade( address _newAddress, bytes32 _sourceCodeUrl )
        external
        validCodeUpgradeInitiator
        returns (bool)
    {
        require(_newAddress != address(0x0));

        EventGatewayNewLinkRequest ( _newAddress );

        /*
            case 1 - Newly Deployed Gateway and Application

            gateway links to app and initializes
        */
        if(currentApplicationEntityAddress == address(0x0)) {

            if(!ApplicationEntityABI(_newAddress).initializeAssetsToThisApplication()) {
                revert();
            }
            link(_newAddress);
            return true;
        } else {
            /*
                case 2 - Actual Code Upgrade Request

                - Current app should exist already
                - Current app
                    - Create a proposal
                    - Vote on result
                    - Get Result
                    - Approve Result
            */
            currentApp.createCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
        }
    }

    /**
    @notice ApplicationEntity Contract approves code Upgrade
    @dev modifier onlyCurrentApplicationEntity
    @param _newAddress address, The address of the new application contract
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function approveCodeUpgrade( address _newAddress ) external returns (bool) {
        require(msg.sender == currentApplicationEntityAddress);
        uint8 atState = currentApp.CurrentEntityState();
        lockCurrentApp();
        if(!currentApp.transferAssetsToNewApplication(_newAddress)) {
            revert();
        }
        link(_newAddress);
        currentApp.setUpgradeState( atState );
        return true;
    }

    /**
    @notice Locks current application entity
    @dev Internally used by gateway to lock current application entity before switching to the new one
    */
    function lockCurrentApp() internal {
        if(!currentApp.lock()) {
            revert();
        }
    }

    /**
    @notice Link to new Application Entity
    @param _newAddress address, The address of the new application contract
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function link( address _newAddress ) internal returns (bool) {

        currentApplicationEntityAddress = _newAddress;
        currentApp = ApplicationEntityABI(currentApplicationEntityAddress);
        if( !currentApp.initialize() ) {
            revert();
        }
        EventGatewayNewAddress(currentApplicationEntityAddress);
        return true;
    }


    /**
    @notice Get current News Contract address
    @return {
        "address": 0x address of the News Contract
    }
    */
    function getNewsContractAddress() external view returns (address) {
        return currentApp.NewsContractEntity();
    }

    /**
    @notice Get current Listing Contract address
    @return {
        "address": 0x address of the Listing Contract
    }
    */
    function getListingContractAddress() external view returns (address) {
        return currentApp.ListingContractEntity();
    }

    /*
    * Validates if new application's deployer is allowed to upgrade current app
    */

    /**
    @notice Validates if new application's deployer is allowed to upgrade current app
    */
    modifier validCodeUpgradeInitiator() {
        bool valid = false;

        ApplicationEntityABI newDeployedApp = ApplicationEntityABI(msg.sender);
        address newDeployer = newDeployedApp.deployerAddress();

        if(newDeployer == deployerAddress) {
            valid = true;
        } else {
            if(currentApplicationEntityAddress != address(0x0)) {
                currentApp = ApplicationEntityABI(currentApplicationEntityAddress);
                if(currentApp.canInitiateCodeUpgrade(newDeployer)) {
                    valid = true;
                }
            }
        }

        // ok if current app accepts newDeployer as a token holder that can do a code upgrade
        // ok if newDeployer is oldDeployer
        require( valid == true );
        _;
    }
}