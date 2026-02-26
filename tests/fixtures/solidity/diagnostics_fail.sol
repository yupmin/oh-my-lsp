pragma solidity ^0.8.0;

contract Broken {
    function run() public pure returns (uint256) {
        return unknownValue;
    }
}
