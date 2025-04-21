import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
const readBills = () => {
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
const writeBills = (bills: any[]) => {
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
    const bills = readBills();
    bills.push(bill);
    writeBills(bills);
    return NextResponse.json({ success: true, bill });
  } catch (error) {
    console.error('Error adding bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add bill' },
      { status: 500 }
    );
  }
}

// DELETE handler to reset all bills
export async function DELETE() {
  try {
    writeBills([]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting bills:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset bills' },
      { status: 500 }
    );
  }
} 