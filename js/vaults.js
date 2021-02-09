import { abi as ethanolTokenABI } from './abi/Ethanol.js';
import { abi as ethanolVestABI } from "./abi/EthanolVault.js";

const stakeForm = document.querySelector(".stake-form");
const approveForm = document.querySelector(".approve-form");

const walletAddress = document.querySelector('.walletAddressinput');
const userLockedBalance = document.querySelector('.user-locked-balance');
const totalVaultBalance = document.querySelector('.total-locked-tokens');
// const unlockTimeDisplay = document.querySelector('.unlocking-time');


// Select dom element for timer
const days = document.querySelector('.days');
const hours = document.querySelector('.hours');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');


const EthanolAddress = '0x63D0eEa1D7C0d1e89d7e665708d7e8997C0a9eD6';
const EthanolVestAddress = '0xf34F69fB72B7B6CCDbdA906Ad58AF1EBfAa76c42';

let web3;
let EthanolToken;
let EthanolVault;
let user;
let displayTimeLeft = Date.now();

const toWei = _amount => web3.utils.toWei(_amount.toString(), 'ether');
const fromWei = _amount => web3.utils.fromWei(_amount.toString(), 'ether');

window.addEventListener('DOMContentLoaded', async () => {
  await connectDAPP();
})

const loadWeb3 = async () => {
    try {
        await ethereum.enable();
        if(!ethereum) return alert("Non-Ethereum browser detected. You should consider trying Metamask");
        web3 = new Web3(ethereum);
        // Get Network / chainId
        const _chainId = await ethereum.request({ method: 'eth_chainId' });
        if(parseInt(_chainId, 16) !== 1) return alert("Connect wallet to a main network");

        const _accounts = await ethereum.request({ method: 'eth_accounts' });
        [user] = _accounts;
        // user = "0x270f23b52f77bB83272cB3cC6e5B21d3267e5f98"
    } catch (error) {
        console.log(error.message);
        return error.message;
    }       
}

const loadBlockchainData = async () => {
    try {
        EthanolToken = new web3.eth.Contract(ethanolTokenABI, EthanolAddress);
        EthanolVault = new web3.eth.Contract(ethanolVestABI, EthanolVestAddress);
        await settings();
    } catch (error) {
        console.error(error.message);
        return error;
    }
}

const connectDAPP = async () => {
    await loadWeb3();
    await loadBlockchainData(); 
}

const settings = async () => { 
    try {
        const firstAddressPart = walletShortner(user, 0, 4);
        const lastAddressPart = walletShortner(user, 38, 42);
        const _balance = await EthanolVault.methods.getLockedTokens(user).call();

        walletAddress.textContent = `${firstAddressPart}...${lastAddressPart}`;
        userLockedBalance.textContent = `${toFixed(fromWei(_balance))} ENOL`;

        const { totalLockedTokens, result } = await getPastEvents();
        totalVaultBalance.textContent = `${toFixed(totalLockedTokens)} ENOL`;

        /* Reset timer here */
        timer(result);
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
}

const walletShortner = (_data, _start, _end) => {
    let result = '';
    for(let i = _start;  i < _end; i++) result = [...result, _data[i]];
    return result.join('');
}

const toFixed = _amount => Number(_amount).toFixed(2);

const getPastEvents = async () => {
    try {
        const latestBlockNumber = await web3.eth.getBlockNumber();

        let result = await EthanolVault.getPastEvents("_LockSavings", { fromBlock: '0', toBlock: latestBlockNumber });
        result = await formatEvents(result);
        
        const totalLockedTokens = result.reduce((prev, curr) => {
            prev += Number(curr.stake);
            return prev;
        }, [0]);
        return {
            totalLockedTokens,
            result
        };
    } catch (error) { console.log(error) }
}

const formatEvents = async _data => {
    try {
        let returnValues = [];
        returnValues = _data.map(item => {
            const { stakeholder, stake, unlockTime } = item.returnValues;
            return {
                stakeholder,
                stake: fromWei(stake),
                unlockTime
            }
        })
        return returnValues;
    } catch (error) { console.log(error) }
}

const timer = (_result) => {
    try {
        const logs = _result.filter(item => item.stakeholder === user);
        if(logs.length <= 0) return;
        let futureDate = logs[logs.length - 1].unlockTime;
        const now = Date.now();
        if(futureDate < now) futureDate = 1613458800000;

        const gap_timer = document.querySelector('.wrapper');

        displayTimeLeft = Number(futureDate) - Number(now);
        // if(displayTimeLeft <= 0) return clearInterval(gap_timer);


        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;

        const d = Math.floor(displayTimeLeft / day);
        const h = Math.floor((displayTimeLeft % day) / hour);
        const m = Math.floor((displayTimeLeft % hour) / minute);
        const s = Math.floor((displayTimeLeft % minute) / second);

        days.textContent = d;
        hours.textContent = h;
        minutes.textContent = m;
        seconds.textContent = s;

        setInterval(() => {
            timer(_result)
        }, 1000)
    } catch (error) { console.error(error.message) }
}

approveForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const input = document.querySelector('.approve-form-input').value;

        if(isNaN(input) || Number(input) < 0) return;
        await EthanolToken.methods.approve(EthanolVestAddress, toWei(input)).send({
            from: user
        });
        return alert("Transaction successful");    
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
})

stakeForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const _getLockedTokens = await EthanolVault.methods.getLockedTokens(user).call();
        const input = document.querySelector('.stake-form input').value;

        if(isNaN(input) || Number(input) < 0) return;
        if(Number(_getLockedTokens) > 0) return alert("Token has already been locked");

        await EthanolVault.methods.monthlySave("1", toWei(input)).send({
            from: user
        });
        return alert("Transaction successful");    
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
})