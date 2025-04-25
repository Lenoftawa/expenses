import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the Bill interface
interface Bill {
  id?: string;
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

// GET handler to retrieve all bills
export async function GET() {
  const bills = readBills();
  return NextResponse.json(bills);
}

// POST handler to add a new bill
export async function POST(request: NextRequest) {
  try {
    const bill = await request.json();
    
    // Validate required fields
    if (!bill.description || !bill.amount || !bill.paidBy || !bill.participants || bill.participants.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Ensure amount is a number
    bill.amount = parseFloat(bill.amount);
    if (isNaN(bill.amount) || bill.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    
    // Ensure id exists
    if (!bill.id) {
      bill.id = `bill-${Date.now()}`;
    }
    
    const bills = readBills();
    bills.push(bill);
    writeBills(bills);
    
    console.log('Bill added successfully:', bill);
    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error adding bill:', error);
    return NextResponse.json({ error: 'Failed to add bill' }, { status: 500 });
  }
}

// PUT handler to update an existing bill
export async function PUT(request: NextRequest) {
  const updatedBill = await request.json();
  const bills = readBills();
  const updatedBills = bills.map((bill: Bill) => 
    bill.id === updatedBill.id ? updatedBill : bill
  );
  writeBills(updatedBills);
  return NextResponse.json(updatedBill);
}

// DELETE handler to delete a specific bill
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }
    
    const bills = readBills();
    const filteredBills = bills.filter((bill: Bill) => bill.id !== id);
    
    // Check if any bill was actually removed
    if (filteredBills.length === bills.length) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }
    
    writeBills(filteredBills);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
} 