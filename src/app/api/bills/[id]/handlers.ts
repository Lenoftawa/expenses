import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the Bill interface
interface Bill {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  maxContributions?: Record<string, number>;
}

// Define the path to the JSON file that will store the bills
const BILLS_FILE_PATH = path.join(process.cwd(), 'data', 'bills.json');

// Ensure the data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read bills from the file
const readBills = (): Bill[] => {
  ensureDataDir();
  if (!fs.existsSync(BILLS_FILE_PATH)) {
    fs.writeFileSync(BILLS_FILE_PATH, JSON.stringify([]));
    return [];
  }
  
  try {
    const data = fs.readFileSync(BILLS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bills:', error);
    return [];
  }
};

// Write bills to the file
const writeBills = (bills: Bill[]) => {
  ensureDataDir();
  fs.writeFileSync(BILLS_FILE_PATH, JSON.stringify(bills, null, 2));
};

// GET handler to retrieve a specific bill
export async function handleGet(id: string): Promise<NextResponse> {
  try {
    const bills = readBills();
    const bill = bills.find((b) => b.id === id);
    
    if (!bill) {
      return new NextResponse(JSON.stringify({ error: 'Bill not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new NextResponse(JSON.stringify(bill), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reading bills:', error);
    return new NextResponse(JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT handler to update a specific bill
export async function handlePut(id: string, request: NextRequest): Promise<NextResponse> {
  try {
    const updatedBill = await request.json() as Bill;
    const bills = readBills();
    const index = bills.findIndex((b) => b.id === id);
    
    if (index === -1) {
      return new NextResponse(JSON.stringify({ error: 'Bill not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure the ID in the URL matches the bill
    updatedBill.id = id;
    bills[index] = updatedBill;
    writeBills(bills);
    
    return new NextResponse(JSON.stringify({ success: true, bill: updatedBill }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    return new NextResponse(JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE handler to delete a specific bill
export async function handleDelete(id: string): Promise<NextResponse> {
  try {
    const bills = readBills();
    const filteredBills = bills.filter((b) => b.id !== id);
    
    if (filteredBills.length === bills.length) {
      return new NextResponse(JSON.stringify({ error: 'Bill not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    writeBills(filteredBills);
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return new NextResponse(JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 