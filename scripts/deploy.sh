#! /bin/bash

sh scripts/testrpc.sh
./node_modules/.bin/truffle deploy --network rpc --reset
