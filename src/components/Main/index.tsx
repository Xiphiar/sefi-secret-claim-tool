import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { useState } from 'react';
import { Keplr, ChainId, hasClaimed } from '../../utils/secretHelper';
import { toast } from 'react-toastify';
import Spinner from 'react-bootstrap/Spinner'
import axios from 'axios';
import { SecretNetworkClient } from 'secretjs';

let proofResponse: any;



function Main() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const paramAddress = urlParams.get('contract')

    const [loaded, setLoaded] = useState(false);

    const [loadingClaim, setLoadingClaim] = useState(false);
    const [claimingClaim, setClaimingClaim] = useState(false);
    const [hasClaim, setHasClaim] = useState(false);
    const [alreadyClaimed, setAlreadyClaimed] = useState(false);
    const [claimAmount, setClaimAmount] = useState<number>();

    const [address, setAddress] = useState<string>();


    const connectKeplr = async () => {
        if (!Keplr) {
            toast.error('Keplr extension not found!');
            return;
        }

        //get address
        Keplr.enable(ChainId)
        const keplrOfflineSigner = Keplr.getOfflineSignerOnlyAmino(ChainId);
        const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();
        setAddress(myAddress);
        return myAddress;
    }

    const hexToDecimal = (hex: string) => parseInt(hex, 16);

    const getPendingClaim = async() => {
        setLoaded(false);
        setLoadingClaim(true);
        const myAddress = await connectKeplr();
        const goodAddr = 'secret14fa9jm9g5mjs35yxarh057lesy4zszw5gavcun'
        //const {data} = await axios.get(`https://api-bridge-mainnet.azurewebsites.net/proof/scrt/${goodAddr}`);
        const {data} = await axios.get(`https://api-bridge-mainnet.azurewebsites.net/proof/scrt/${myAddress}`);
        console.log(data.proof);
        const proof = data.proof;

        if (!proof) {
            setLoadingClaim(false);
            setLoaded(true);
            return;
        }



        const sefiAmount = hexToDecimal(proof.amount) /10e5
        if (!sefiAmount) {
            setLoadingClaim(false);
            setLoaded(true);
            return;
        }

        //query if claimed
        const claimed = await hasClaimed(proof.index);
        if (claimed) {
            setClaimAmount(sefiAmount);
            setAlreadyClaimed(true);
            setLoadingClaim(false);
            return;
        }
        proofResponse = proof;
        setClaimAmount(sefiAmount);
        setHasClaim(true);

        setLoadingClaim(false);
        setLoaded(true);
    }



    const handleClaim = async(e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setClaimingClaim(true);
        if (!proofResponse) {
            toast.error('Error: Try checking for claim again.')
            return;
        }

        const execMsg = {
            index: proofResponse.index.toString(),
            address: address,
            amount: parseInt(proofResponse.amount, 16).toString(),
            //@ts-ignore
            proof: proofResponse.proof.map(p => p.substring(2)), // map to remove the '0x's
          };

          console.log(execMsg)

          //@ts-ignore
          const keplrOfflineSigner = window.getOfflineSignerOnlyAmino(process.env.REACT_APP_CHAIN_ID as string);
        const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();

        const secretjs = await SecretNetworkClient.create({
            grpcWebUrl: process.env.REACT_APP_GRPC_URL as string,
            chainId: process.env.REACT_APP_CHAIN_ID as string,
            wallet: keplrOfflineSigner,
            walletAddress: myAddress,
            //@ts-ignore
            encryptionUtils: window.getEnigmaUtils(process.env.REACT_APP_CHAIN_ID as string),
        });

        const result = await secretjs.tx.compute.executeContract({
            sender: myAddress,
            contractAddress: 'secret1d47hy7sjm88dpls0vu7hvmeuqkxlmtvv2dcfqv',
            msg: { claim: execMsg }
        },
        {
            gasLimit: 400_000
        })

        console.log(result);

        if (result.code) {
            toast.error(result.rawLog)
        } else {

            toast.error('Claimed Successfully!')
            getPendingClaim();
        }
        
        setClaimingClaim(false);

    }
    
    
    return (
    <Container>
        <Row className="justify-content-center mb-4 mt-4 pt-4">
            <Col md="6">
                <h4 className="d-inline">Address: </h4>{address ? address : loadingClaim ? <Spinner animation="border" size="sm" /> : 'Click "Check Claim" to check for SEFI airdrop claim.'}<br />
                <h5 className="d-inline">Amount:</h5>  {claimAmount ? `${claimAmount} SEFI` : loaded ? "Not Eligible." : null} {alreadyClaimed ? <h6 className="d-inline" style={{color: 'red'}}>Claimed</h6> : null }
            </Col>
        </Row>
    <Row className="justify-content-center">
        <Col md="auto">
            <Button type="button" onClick={()=>getPendingClaim()}>
                {loadingClaim ?
                    <Spinner animation="border" variant="light" />
                :
                    'Check Claim'
                }
            </Button>
            </Col>
            <Col md="auto">
                <Button disabled={!hasClaim} onClick={handleClaim}>
                    {claimingClaim ?
                        <Spinner animation="border" variant="light" />
                    :
                        'Claim'
                    }
                </Button>
        </Col>
    </Row>

    </Container>
  );
}

export default Main;