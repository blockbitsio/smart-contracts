BlockBits.io Smart Contracts
===================

# Coverage Report Log
[https://docs.blockbits.io/extra/reports/index.html](https://docs.blockbits.io/extra/reports/index.html)

# Istanbul Coverage Report
[https://docs.blockbits.io/extra/coverage/index.html](https://docs.blockbits.io/extra/coverage/index.html)

# SETUP INSTRUCTIONS
Clone repository

```git clone https://github.com/blockbitsio/smart-contracts blockbits```

Change directory into the blockbits folder

```cd blockbits```

Install dependencies
```npm run install```

Install solc-binary on your system

Follow: [https://solidity.readthedocs.io/en/latest/installing-solidity.html#binary-packages](https://solidity.readthedocs.io/en/latest/installing-solidity.html#binary-packages)


# Available Commands
Once you have everything installed

## Running tests
```npm run test```

## Running coverage tests
```npm run coverage```

## Running tests and coverage tests and logging output
```npm run html```

```npm run testToHtml```

```npm run coverageToHtml```

# Structure

----------------------------
|Path | Description|
|:--- | :--- |
| build/ | Built Contracts | 
| contracts/ | Smart Contract Sources | 
| migrations/ | Truffle Migrations and Deployment Scripts| 
| output/ | HTML Test and Coverage Reports output directory | 
| scripts/ | TestRPC, SolCoverage Scripts | 
| test/ | Truffle Test Suite | 
| test/app/ | Test Builder Application Helper | 
| test/helpers/ | General Test Helpers | 
| test/mocks/ | Smart Contract - Test Mocks | 
| test/tests/ | Truffle Tests | 
----------------------------

# Technical Documentation
View Live Documentation at [http://docs.blockbits.io](http://docs.blockbits.io) or Sources at [https://github.com/blockbitsio/documentation](https://github.com/blockbitsio/documentation)

# License
MIT License