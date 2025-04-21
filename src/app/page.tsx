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
  const [editingMax, setEditingMax] = useState<string | null>(null);
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Load bills from the backend API
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/bills');
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        const data = await response.json();
        // Add unique IDs to bills if they don't have them
        const billsWithIds = data.map((bill: Bill, index: number) => ({
          ...bill,
          id: bill.id || `bill-${index}`
        }));
        setBills(billsWithIds);
        setError(null);
      } catch (err) {
        console.error('Error fetching bills:', err);
        setError('Failed to load bills. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }
    
    if (!form.paidBy) {
      newErrors.paidBy = "Paid By is required";
    }
    
    if (form.participants.length === 0) {
      newErrors.participants = "At least one participant is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addBill = async () => {
    if (!validateForm()) {
      return;
    }
    
    const newBill = { 
      ...form, 
      id: form.id || `bill-${Date.now()}`,
      amount: parseFloat(form.amount), 
      maxContributions: form.maxContributions || {} 
    };
    
    try {
      setLoading(true);
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBill),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add bill');
      }
      
      const data = await response.json();
      
      if (isEditing) {
        // Update existing bill
        setBills(bills.map(bill => 
          bill.id === newBill.id ? data.bill : bill
        ));
        setIsEditing(false);
      } else {
        // Add new bill
        setBills([...bills, data.bill]);
      }
      
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Error adding bill:', err);
      setError('Failed to add bill. Please try again.');
    } finally {
      setLoading(false);
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
    setErrors({});
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
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    resetForm();
    setIsEditing(false);
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete bill');
      }
      
      setBills(bills.filter(bill => bill.id !== billId));
      setError(null);
    } catch (err) {
      console.error('Error deleting bill:', err);
      setError('Failed to delete bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setMaxContribution = (user: string, amount: string) => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount)) {
      setForm({
        ...form,
        maxContributions: {
          ...form.maxContributions,
          [user]: numAmount
        }
      });
    }
    setEditingMax(null);
    setMaxAmount('');
  };

  const removeMaxContribution = (user: string) => {
    const newMaxContributions = { ...form.maxContributions };
    delete newMaxContributions[user];
    setForm({
      ...form,
      maxContributions: newMaxContributions
    });
  };

  const resetBills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bills', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset bills');
      }
      
      setBills([]);
      setError(null);
    } catch (err) {
      console.error('Error resetting bills:', err);
      setError('Failed to reset bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const net = computeNetBalances(bills);
  const settlements = optimizeSettlements(net);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Holiday Bill Splitter</h1>
        <Button 
          variant="destructive" 
          onClick={resetBills}
          disabled={loading}
        >
          Reset All Bills
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Edit Bill' : 'Add New Bill'}
            </h2>
            {isEditing && (
              <Button 
                variant="outline" 
                onClick={cancelEdit}
                disabled={loading}
              >
                Cancel Edit
              </Button>
            )}
          </div>
          
          <div>
            <Input 
              placeholder="Description" 
              value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })} 
              className={errors.description ? "border-red-500" : ""}
              disabled={loading}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
          
          <div>
            <Input 
              placeholder="Amount" 
              type="number" 
              value={form.amount} 
              onChange={e => setForm({ ...form, amount: e.target.value })} 
              className={errors.amount ? "border-red-500" : ""}
              disabled={loading}
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>
          
          <div>
            <select 
              className={`w-full p-2 border rounded-md ${errors.paidBy ? "border-red-500" : ""}`}
              value={form.paidBy} 
              onChange={e => setForm({ ...form, paidBy: e.target.value })}
              disabled={loading}
            >
              <option value="">Paid By</option>
              {users.map(user => <option key={user}>{user}</option>)}
            </select>
            {errors.paidBy && <p className="text-red-500 text-sm mt-1">{errors.paidBy}</p>}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Select Participants</h3>
            <div className={`grid grid-cols-2 gap-2 ${errors.participants ? "border border-red-500 p-2 rounded-md" : ""}`}>
              {users.map(user => (
                <div key={user} className="space-y-1">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.participants.includes(user)} 
                      onChange={() => {
                        setForm({
                          ...form,
                          participants: form.participants.includes(user)
                            ? form.participants.filter((u: string) => u !== user)
                            : [...form.participants, user]
                        });
                      }} 
                      disabled={loading}
                    />
                    <span>{user}</span>
                  </label>
                  
                  {form.participants.includes(user) && (
                    <div className="ml-6 flex items-center space-x-2">
                      {editingMax === user ? (
                        <>
                          <Input 
                            placeholder="Max amount" 
                            type="number" 
                            value={maxAmount} 
                            onChange={e => setMaxAmount(e.target.value)}
                            className="w-24"
                            disabled={loading}
                          />
                          <Button 
                            size="sm" 
                            onClick={() => setMaxContribution(user, maxAmount)}
                            disabled={loading}
                          >
                            Set
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingMax(null)}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {form.maxContributions[user] ? (
                            <>
                              <span className="text-sm text-gray-600">
                                Max: ${form.maxContributions[user].toFixed(2)}
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => removeMaxContribution(user)}
                                disabled={loading}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingMax(user);
                                setMaxAmount('');
                              }}
                              disabled={loading}
                            >
                              Set Max
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {errors.participants && <p className="text-red-500 text-sm mt-1">{errors.participants}</p>}
          </div>

          <Button onClick={addBill} disabled={loading}>
            {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Bill' : 'Add Bill')}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold">Settlements</h2>
        {loading ? (
          <p className="text-gray-500">Loading settlements...</p>
        ) : (
          <ul className="list-disc ml-6">
            {settlements.map((s, i) => (
              <li key={i}>{s.from} pays {s.to} ${s.amount.toFixed(2)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">All Bills</h2>
        {loading ? (
          <p className="text-gray-500 text-center">Loading bills...</p>
        ) : (
          <div className="space-y-4">
            {bills.map((bill, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{bill.description}</h3>
                      <p className="text-sm text-gray-600">Paid by: {bill.paidBy}</p>
                      <p className="text-sm text-gray-600">Amount: ${bill.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Participants: {bill.participants.join(', ')}</p>
                      {Object.keys(bill.maxContributions || {}).length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Maximum Contributions:</p>
                          <ul className="list-disc ml-6 text-sm text-gray-600">
                            {Object.entries(bill.maxContributions || {}).map(([user, amount]) => (
                              <li key={user}>{user}: ${amount.toFixed(2)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => editBill(bill)}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteBill(bill.id || `bill-${index}`)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {bills.length === 0 && (
              <p className="text-gray-500 text-center">No bills added yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
