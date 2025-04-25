'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Bill {
  id?: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  maxContributions?: Record<string, number>;
}

const users = ["Jacqueline", "Kevin", "Kimberly", "Silvia", "Verana"];

function splitBill(bill: Bill): Record<string, number> {
  const balances: Record<string, number> = {};
  const { amount, participants, maxContributions = {} } = bill;

  let fixedTotal = 0;
  let remainingParticipants: string[] = [];

  for (const user of participants) {
    if (maxContributions[user] !== undefined) {
      balances[user] = maxContributions[user];
      fixedTotal += maxContributions[user];
    } else {
      remainingParticipants.push(user);
    }
  }

  const remainingAmount = amount - fixedTotal;
  const share = remainingAmount / remainingParticipants.length;

  for (const user of remainingParticipants) {
    balances[user] = share;
  }

  return balances;
}

function computeNetBalances(bills: Bill[]): Record<string, number> {
  const net: Record<string, number> = {};

  for (const bill of bills) {
    const split = splitBill(bill);

    for (const user of Object.keys(split)) {
      net[user] = (net[user] || 0) - split[user];
    }

    net[bill.paidBy] = (net[bill.paidBy] || 0) + bill.amount;
  }

  return net;
}

function optimizeSettlements(net: Record<string, number>) {
  const creditors = [];
  const debtors = [];

  for (const [user, balance] of Object.entries(net)) {
    if (balance > 0) creditors.push({ user, amount: balance });
    else if (balance < 0) debtors.push({ user, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];

  while (creditors.length && debtors.length) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const settleAmount = Math.min(creditor.amount, debtor.amount);
    settlements.push({ from: debtor.user, to: creditor.user, amount: settleAmount });

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return settlements;
}

export default function Home() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [form, setForm] = useState<any>({ 
    id: '',
    description: '', 
    amount: 0, 
    paidBy: '', 
    participants: [],
    maxContributions: {} 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bills from API on component mount
  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills');
      if (!response.ok) throw new Error('Failed to fetch bills');
      const data = await response.json();
      setBills(data);
    } catch (err) {
      setError('Failed to load bills');
      console.error('Error fetching bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      description: '',
      amount: 0,
      paidBy: '',
      participants: [],
      maxContributions: {}
    });
    setIsEditing(false);
  };

  const editBill = (bill: Bill) => {
    setForm({
      id: bill.id,
      description: bill.description,
      amount: bill.amount,
      paidBy: bill.paidBy,
      participants: [...bill.participants],
      maxContributions: { ...bill.maxContributions }
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (form.description && form.amount && form.paidBy && form.participants.length > 0) {
      const billData = {
        ...form,
        id: form.id || `bill-${Date.now()}`,
        amount: parseFloat(form.amount)
      };

      try {
        const response = await fetch('/api/bills' + (isEditing ? `?id=${billData.id}` : ''), {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(billData),
        });

        if (!response.ok) throw new Error('Failed to save bill');
        
        await fetchBills(); // Refresh the bills list
        resetForm();
      } catch (err) {
        setError('Failed to save bill');
        console.error('Error saving bill:', err);
      }
    }
  };

  const deleteBill = async (billId: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        const response = await fetch('/api/bills', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: billId }),
        });

        if (!response.ok) throw new Error('Failed to delete bill');
        
        await fetchBills(); // Refresh the bills list
        if (isEditing && form.id === billId) {
          resetForm();
        }
      } catch (err) {
        setError('Failed to delete bill');
        console.error('Error deleting bill:', err);
      }
    }
  };

  const net = computeNetBalances(bills);
  const settlements = optimizeSettlements(net);

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchBills}>Retry</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Holiday Bill Splitter</h1>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {isEditing ? 'Edit Bill' : 'Add New Bill'}
              </h2>
              {isEditing && (
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
            <Input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <select
              className="w-full p-2 border rounded"
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
            >
              <option value="">Who paid?</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
            <div>
              <h3 className="font-bold mb-2">Participants</h3>
              {users.map(user => (
                <label key={user} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.participants.includes(user)}
                    onChange={(e) => {
                      const newParticipants = e.target.checked
                        ? [...form.participants, user]
                        : form.participants.filter((p: string) => p !== user);
                      setForm({ ...form, participants: newParticipants });
                    }}
                  />
                  {user}
                </label>
              ))}
            </div>
            <Button
              onClick={handleSubmit}
            >
              {isEditing ? 'Update Bill' : 'Add Bill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Settlements</h2>
          <Card className="p-4 mb-4">
            <CardContent>
              {settlements.length > 0 ? (
                <ul className="space-y-2">
                  {settlements.map((settlement, index) => (
                    <li key={index} className="text-sm">
                      {settlement.from} pays {settlement.to} ${settlement.amount.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No settlements needed</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">All Bills</h2>
          <div className="space-y-4">
            {bills.map((bill) => (
              <Card key={bill.id} className="p-4">
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{bill.description}</h3>
                      <p>Amount: ${bill.amount}</p>
                      <p>Paid by: {bill.paidBy}</p>
                      <p>Participants: {bill.participants.join(', ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => editBill(bill)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => deleteBill(bill.id!)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
