const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
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

let token_settings = {
    supply: new BigNumber(500).mul(10 ** 6).mul( 10 ** 18 ),   // 500 mil tokens * decimals
    decimals: 18,                           // make sure to update supply decimals if updated
    name: "BlockBitsIO Token",
    symbol: "BBX",
    version: "v1"                           // required in order to be able to deploy a new version if need arises
};

/*
    Project Token SCADA - Token Stake Calculation And Distribution Algorithm
    - TokenSCADA1Market   - requires a global hard cap, individual caps need to be 0
    - TokenSCADA2Fixed    - requires individual hard caps, global is calculated
    - TokenSCADA3Variable - requires individual hard caps, global is calculated
*/
let tokenSCADA = {
    type:"TokenSCADA1Market",
    requires_global_hard_cap: false
};

let funding_global_soft_cap = new BigNumber(10000).mul( 10 ** 18 );
let funding_global_hard_cap = new BigNumber(30000).mul( 10 ** 18 );

let funding_next_phase_price_increase = 20; // percentage increase in next funding phase

let pre_ico_duration = 7 * days;
let pre_ico_start = now + 10 * days;
let pre_ico_end = pre_ico_start + pre_ico_duration;

let pre_ico_settings = {
    name: "PRE ICO",                            //  bytes32 _name,
    start_time: pre_ico_start,                  //  uint256 _time_start,
    end_time: pre_ico_end,                      //  uint256 _time_end,
    amount_cap_soft: 0,                         //  uint256 _amount_cap_soft,
    amount_cap_hard: 0,                         //  uint256 _amount_cap_hard,
    methods: 3,                                 //  uint8   _methods, 3 = DIRECT_AND_MILESTONE
    minimum_entry: new BigNumber(1).mul(ether), //  uint256 _minimum_entry,
    start_parity: 0,                            //  uint256 _start_parity,
    price_addition_percentage: 0,               //  uint8   _price_addition_percentage
    token_share_percentage: 10,                 //  uint8
};

let ico_duration = 30 * days;
let ico_start = pre_ico_end + 7 * days;
let ico_end = ico_start + ico_duration;

let ico_settings = {
    name: "ICO",
    start_time: ico_start,
    end_time: ico_end,
    amount_cap_soft: 0,
    amount_cap_hard: 0,
    methods: 3,
    minimum_entry: 0,
    start_parity: 0,
    price_addition_percentage: 20,               //  add this many percentages to previous stage parity
    token_share_percentage: 40,
};

let funding_periods = [pre_ico_settings, ico_settings];

/*
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
*/

let project_milestones = [];

project_milestones.push(
    {
        name: "Milestone 1",            // string _name
        description: "Description",     // bytes32 _description_hash
        duration: 90 * days,            // uint256 _duration
        funding_percentage: 20,         // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 2",            // string _name
        description: "2 Description",   // bytes32 _description_hash
        duration: 90 * days,             // uint256 _duration
        funding_percentage: 20,         // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 3",            // string _name
        description: "3 Description",   // bytes32 _description_hash
        duration: 120 * days,           // uint256 _duration
        funding_percentage: 20,         // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 4",            // string _name
        description: "4 Description",   // bytes32 _description_hash
        duration: 120 * days,           // uint256 _duration
        funding_percentage: 20,         // uint8   _funding_percentage
    }
);

project_milestones.push(
    {
        name: "Milestone 5",            // string _name
        description: "5 Description",   // bytes32 _description_hash
        duration: 120 * days,           // uint256 _duration
        funding_percentage: 20,         // uint8   _funding_percentage
    }
);

let emergency_fund_percentage = 10;


let token_sale_percentage = 0;
for(let i = 0; i < funding_periods.length; i++) {
    token_sale_percentage+=funding_periods[i].token_share_percentage;
}


let project_bylaws = {

    // Token bylaws
    // (0 to 100) what percentage of the whole token supply is to be sold in the funding process
    "token_sale_percentage": token_sale_percentage,
    // Can the application mint new tokens after initial supply is created? ( true / false )
    "token_fixed_supply": true,
    // Are the project owner's tokens locked until project state == COMPLETED
    "owner_tokens_locked": true,
    // token sale calculation and distribution algorithm
    "tokenSCADA": "TokenSCADA1Market",

    // Funding bylaws
    // SCADA requires global soft and hard caps
    "funding_global_soft_cap": funding_global_soft_cap,
    "funding_global_hard_cap": funding_global_hard_cap,

    // Bounty
    "token_bounty_percentage": 1,

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
    "cashback_owner_mia_dur": 365 * days

};

let application_settings = {
    bylaws:project_bylaws,
    funding_periods:funding_periods,
    milestones:project_milestones,
    token:token_settings,
    tokenSCADA:tokenSCADA,
    solidity:solidity,
    doDeployments: true,
    platformWalletAddress: "0x93f46df4161f1dd333a99a2ec6f53156c027f83f"
};

module.exports = {
    application_settings:application_settings
};
