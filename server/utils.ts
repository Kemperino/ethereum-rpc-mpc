import axios from "axios";
import { RPC_URL } from "./index.js";

/**
 * Makes a JSON-RPC call to the Ethereum endpoint
 * @param {string} method - The RPC method to call
 * @param {Array} params - The parameters to pass to the method
 * @returns {Promise<any>} - The result of the RPC call
 * @throws {Error} - If the RPC call fails or returns an error
 */
export async function callRPC(method: string, params: any[]) {
    if (!method) {
      throw new Error('RPC method is required');
    }
  
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };
  
    try {
      const response = await axios.post(RPC_URL, payload);
      if (response.data.error) {
        const errorMessage = response.data.error.message || 'Unknown RPC error';
        throw new Error(`RPC Error: ${errorMessage}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`Failed RPC call to "${method}":`, errorMessage);
      
      error.rpcMethod = method;
      error.rpcParams = params;
      
      throw error;
    }
}

/**
 * Gets the chain ID from the Ethereum network
 * @returns {Promise<number>} - The chain ID as an integer
 * @throws {Error} - If the RPC call fails
 */
export async function getChainId(): Promise<number> {
  try {
    const chainIdHex = await callRPC("eth_chainId", []);
    const chainIdInt = parseInt(chainIdHex, 16);
    console.log(`Chain ID: ${chainIdHex} (${chainIdInt} in decimal)`);
    return chainIdInt;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    console.error(`Failed to get chain ID: ${errorMessage}`);
    throw error;
  }
}

export async function validateRpcUrl(url: string) {
  if (!url) {
    console.error("Error: No RPC URL provided. Please provide an RPC URL as an argument.");
    process.exit(1);
  }
  
  console.log(`Validating Ethereum RPC URL: ${url}`);
  
  try {
    // Test the connection with a simple eth_blockNumber call
    const blockNumber = await callRPC("eth_blockNumber", []);
    console.log(`✅ RPC endpoint is working. Current block number: ${blockNumber}`);
    return true;
  } catch (error: unknown) {
    // Properly handle the error based on its type
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    console.error(`❌ Failed to connect to RPC endpoint: ${errorMessage}`);
    console.error("Please check that the URL is correct and the endpoint is accessible.");
    process.exit(1);
  }
}
