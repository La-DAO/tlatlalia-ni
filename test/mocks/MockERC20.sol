// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  // mocking WETH
  function deposit() public payable {
    _mint(msg.sender, msg.value);
  }

  // mocking WETH
  function withdraw(uint256 value) public {
    _burn(msg.sender, value);
    payable(msg.sender).transfer(value);
  }

  function mint(address to, uint256 value) public {
    _mint(to, value);
  }

  function burn(address from, uint256 value) public {
    _burn(from, value);
  }
}
