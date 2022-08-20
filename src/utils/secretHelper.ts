import { SecretNetworkClient } from 'secretjs';
import { Any } from 'secretjs/dist/protobuf_stuff/google/protobuf/any';
const Storage = window.sessionStorage;
export const ChainId: string = process.env.REACT_APP_CHAIN_ID as string;
//@ts-ignore
export const Keplr = window.keplr;
export let Querier: SecretNetworkClient;

type contractAddressRequest = {
    contractAddress: string;
}

type queryRequest = {
    contractAddress: string;
    ownerAddress: string;
}

type ContractInfoResponse = {
    contract_info: {
        name: string;
        symbol: string;
    };
}




const contractInfoQuery = {
    contract_info: {}
}

export const hasClaimed = async (
    index: number
  ): Promise<any> => {
    if (!Querier) await setupQuerier();
    
    const resp = await Querier.query.compute.queryContract({
        contractAddress: 'secret1d47hy7sjm88dpls0vu7hvmeuqkxlmtvv2dcfqv',
        query: { is_claimed: { index: index.toString() } },
    });
    console.log(resp);
    return resp;
  };


export const queryContractInfo = async({contractAddress}: contractAddressRequest): Promise<ContractInfoResponse> => {
    if (!Querier) await setupQuerier();

    return await Querier.query.compute.queryContract({
        contractAddress: contractAddress,
        query: contractInfoQuery,
    });
}

const setupQuerier = async() => {
    Querier = await SecretNetworkClient.create({
        grpcWebUrl: process.env.REACT_APP_GRPC_URL as string,
        chainId: ChainId,
    });
}