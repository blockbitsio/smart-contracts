const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
const web3util                  = require('web3-utils');

// these settings are used in both deployments and tests

// ethereum network related variables
let ether = 1000000000000000000;                        // 1 ether in wei
let days = 3600 * 24;                                   // 1 day in seconds
let now = parseInt(( Date.now() / 1000 ).toFixed());    // unixtime now in seconds

let solidity = {
    ether:ether,
    days:days,
    now:now
};

// Project Token settings
// hardcoded in contract atm.
let token_settings = {
    // supply: new BigNumber(500).mul(10 ** 6).mul( 10 ** 18 ),   // 500 mil tokens * decimals
    supply: 0,
    decimals: 18,                           // make sure to update supply decimals if updated
    name: "BlockBitsIO Token",
    symbol: "BBX",
    version: "1"                           // required in order to be able to deploy a new version if need arises
};

/*
    Project Token SCADA - Token Stake Calculation And Distribution Algorithm
    - TokenSCADA1Market   - requires a global hard cap, individual caps need to be 0
    - TokenSCADA2Fixed    - requires individual hard caps, global is calculated
    - TokenSCADA3Variable - requires individual hard caps, global is calculated

*/
let tokenSCADA = {
    type:"TokenSCADAVariable",
    requires_global_hard_cap: true
};

let platformWalletAddress = "0x93f46df4161f1dd333a99a2ec6f53156c027f83f";

let pre_ico_start = 1517443201;         // 00:00:01 1st of feb 2018
let pre_ico_end = 1519862399;
let ico_start = 1520640001;
let ico_end = 1525219199;

// override for tests
pre_ico_start = now + 1 * days;
pre_ico_end = now + 7 * days;
ico_start = pre_ico_end + 7 * days;
ico_end = ico_start + 30 * days;

let funding_global_soft_cap = new BigNumber(4700).mul( ether );
let funding_global_hard_cap = new BigNumber(34700).mul( ether );
let pre_amount_in_ether = new BigNumber(6700).mul( 10 ** 18 );
let ico_amount_in_ether = new BigNumber(34700).mul( 10 ** 18 ); // includes pre-ico cap, excludes extra marketing

let extra_marketing = {
    "hard_cap":300 * solidity.ether,    // 300 ether hard cap
    "tokens_per_eth":20000,             // 20 000 BBX per ETH
    "start_date":pre_ico_start,
    "end_date":ico_start
};

let pre_ico_settings = {
    name: "PRE ICO",                                        //  bytes32 _name,
    start_time: pre_ico_start,                              //  uint256 _time_start,
    end_time: pre_ico_end,                                  //  uint256 _time_end,
    amount_cap_soft: 0,                                     //  uint256 _amount_cap_soft,
    amount_cap_hard: pre_amount_in_ether,                   //  uint256 _amount_cap_hard,
    methods: 3,                                             //  uint8   _methods, 3 = DIRECT_AND_MILESTONE
    minimum_entry: 0,                                       //  uint256 _minimum_entry,
    fixed_tokens: 9800,                                     //  uint256 _fixed_tokens
    price_addition_percentage: 0,                           //  uint8   _price_addition_percentage
    token_share_percentage: 0,                              //  uint8
};



let ico_settings = {
    name: "ICO",
    start_time: ico_start,
    end_time: ico_end,
    amount_cap_soft: 0,
    amount_cap_hard: ico_amount_in_ether,                   // includes pre-ico cap
    methods: 3,
    minimum_entry: 0,
    fixed_tokens: 7000,
    price_addition_percentage: 0,                           //  add this many percentages to previous stage parity
    token_share_percentage: 0,
};

let funding_periods = [pre_ico_settings, ico_settings];


if(tokenSCADA.requires_global_hard_cap === false) {
    // remove hard caps if SCADA requires them to not be set
    funding_global_soft_cap = 0;
    funding_global_hard_cap = 0;
    for(let i = 0; i < funding_periods.length; i++) {
        funding_global_soft_cap+= funding_periods[i].amount_cap_soft;
        funding_global_hard_cap+= funding_periods[i].amount_cap_hard;
        funding_periods[i].amount_cap_soft = 0;
        funding_periods[i].amount_cap_hard = 0;
    }
}


let project_milestones = [];

project_milestones.push(
    {
        name: "Milestone 1",                    // bytes32 _name
        description: "Minimalistic Platform",   // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 20,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 2",                    // bytes32 _name
        description: "3rd Party Launch Functionality",  // string description
        duration: 180 * days,                   // uint256 _duration
        funding_percentage: 20,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 3",                    // bytes32 _name
        description: "Code Upgrade Tools and Token Buyback", // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 10,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 4",                    // bytes32 _name
        description: "Basic Risk indicators and Collaboration tools",            // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 15,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 5",                    // bytes32 _name
        description: "Advanced functionality",  // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 15,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 6",                    // bytes32 _name
        description: "Token Holder Upgrades",   // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 10,                 // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 7",                    // bytes32 _name
        description: "Full Decentralization",   // string description
        duration: 90 * days,                    // uint256 _duration
        funding_percentage: 10,                 // uint8   _funding_percentage
    }
);

let emergency_fund_percentage = 10;


let token_sale_percentage = 57;

/*
for(let i = 0; i < funding_periods.length; i++) {
    token_sale_percentage+=funding_periods[i].token_share_percentage;
}
*/

let project_bylaws = {

    // Token bylaws
    // (0 to 100) what percentage of the whole token supply is to be sold in the funding process
    "token_sale_percentage": token_sale_percentage,
    // Can the application mint new tokens after initial supply is created? ( true / false )
    "token_fixed_supply": true,
    // Are the project owner's tokens locked until project state == COMPLETED
    "owner_tokens_locked": true,
    // token sale calculation and distribution algorithm
    "tokenSCADA": "TokenSCADA3Variable",

    // Funding bylaws
    // SCADA requires global soft and hard caps
    "funding_global_soft_cap": funding_global_soft_cap,
    "funding_global_hard_cap": funding_global_hard_cap,

    // Bounty
    "token_bounty_percentage": 3,

    // Proposal Bylaws
    // (X days) proposal voting duration
    "proposal_voting_duration": 7 * days,

    // Meeting Bylaws
    // (X days) how many days a meeting needs to be created in advance
    "meeting_time_set_req": 7 * days,

    // Milestone Bylaws
    // (unixtime) milestone development starts 14 days after ico ends
    "development_start": ico_end + 14 * days,
    "min_postponing": 7 * days,
    "max_postponing": 90 * days,

    // if this is available, emergency fund will be crated out of total milestone funding amount.
    // the rest gets then split up into milestone balances using their respective percentage settings
    "emergency_fund_percentage": emergency_fund_percentage,

    // Cashback Bylaws
    "cashback_investor_no": 7 * days,
    "cashback_owner_mia_dur": 3650 * days

};

let application_settings = {
    bylaws:project_bylaws,
    funding_periods:funding_periods,
    milestones:project_milestones,
    token:token_settings,
    tokenSCADA:tokenSCADA,
    solidity:solidity,
    doDeployments: true, // true
    platformWalletAddress: platformWalletAddress,
    extra_marketing:extra_marketing
};

module.exports = {
    application_settings:application_settings
};
