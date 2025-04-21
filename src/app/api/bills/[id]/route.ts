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

// GET handler to retrieve a specific bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bills = readBills();
  const bill = bills.find((b: any) => b.id === params.id);
  
  if (!bill) {
    return NextResponse.json(
      { error: 'Bill not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(bill);
}

// PUT handler to update a specific bill
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedBill = await request.json();
    const bills = readBills();
    const index = bills.findIndex((b: any) => b.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    // Ensure the ID in the URL matches the bill
    updatedBill.id = params.id;
    bills[index] = updatedBill;
    writeBills(bills);
    
    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a specific bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bills = readBills();
    const filteredBills = bills.filter((b: any) => b.id !== params.id);
    
    if (filteredBills.length === bills.length) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    writeBills(filteredBills);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
} 