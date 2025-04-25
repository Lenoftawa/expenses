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

// This is a simple in-memory store for demonstration
// In production, you would use a database
let bills: any[] = [];

// GET handler to retrieve all bills
export async function GET() {
  return NextResponse.json(bills);
}

// POST handler to add a new bill
export async function POST(request: NextRequest) {
  const bill = await request.json();
  bills.push(bill);
  return NextResponse.json(bill);
}

// PUT handler to update an existing bill
export async function PUT(request: NextRequest) {
  const updatedBill = await request.json();
  bills = bills.map(bill => 
    bill.id === updatedBill.id ? updatedBill : bill
  );
  return NextResponse.json(updatedBill);
}

// DELETE handler to reset all bills
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  bills = bills.filter(bill => bill.id !== id);
  return NextResponse.json({ success: true });
} 