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
  
  // Initialize balances for all participants
  for (const user of participants) {
    balances[user] = 0;
  }
  
  // 1. Calculate the proportion for each person (equal split)
  const equalShare = amount / participants.length;
  
  // 2. Check for participants with maximums less than their proportion
  let totalAssigned = 0;
  let remainingParticipants: string[] = [];
  
  for (const user of participants) {
    if (maxContributions[user] !== undefined && maxContributions[user] < equalShare) {
      // Set their maximum as their debt
      balances[user] = maxContributions[user];
      totalAssigned += maxContributions[user];
    } else {
      // Add to remaining participants
      remainingParticipants.push(user);
    }
  }
  
  // 3. Distribute the remainder to all remaining participants
  const remainingAmount = amount - totalAssigned;
  
  if (remainingParticipants.length > 0) {
    const share = remainingAmount / remainingParticipants.length;
    
    for (const user of remainingParticipants) {
      balances[user] = share;
    }
  } else if (remainingAmount > 0) {
    // If all participants have maximums and there's still remaining amount,
    // the person who paid covers the difference
    balances[bill.paidBy] = remainingAmount;
  }
  
  // Log the balances for debugging
  console.log("Split bill balances:", balances);
  
  return balances;
}

function computeNetBalances(bills: Bill[]): Record<string, number> {
  const net: Record<string, number> = {};

  // Initialize net balances for all users
  for (const user of users) {
    net[user] = 0;
  }

  for (const bill of bills) {
    // Add the full amount to the payer
    net[bill.paidBy] = (net[bill.paidBy] || 0) + bill.amount;
    
    // Calculate the equal share
    const equalShare = bill.amount / bill.participants.length;
    
    // Track how much has been assigned and who has a maximum
    let totalAssigned = 0;
    const participantsWithMax: string[] = [];
    const participantsWithoutMax: string[] = [];
    
    // First pass: identify participants with maximums
    for (const participant of bill.participants) {
      // Include the payer in the calculation if they are a participant
      const maxContribution = bill.maxContributions?.[participant];
      
      if (maxContribution !== undefined && maxContribution > 0) {
        // This participant has a maximum greater than 0
        participantsWithMax.push(participant);
        // Assign their maximum
        net[participant] = (net[participant] || 0) - maxContribution;
        totalAssigned += maxContribution;
      } else {
        // This participant has no maximum (max = 0)
        participantsWithoutMax.push(participant);
      }
    }
    
    // Calculate the remaining amount to be distributed
    const remainingAmount = bill.amount - totalAssigned;
    
    // Distribute the remaining amount among participants without a maximum
    if (participantsWithoutMax.length > 0) {
      const share = remainingAmount / participantsWithoutMax.length;
      
      for (const participant of participantsWithoutMax) {
        net[participant] = (net[participant] || 0) - share;
      }
    } else if (remainingAmount > 0) {
      // If all participants have maximums and there's still remaining amount,
      // the person who paid covers the difference
      net[bill.paidBy] = (net[bill.paidBy] || 0) - remainingAmount;
    }
  }

  // Log the net balances for debugging
  console.log("Net balances:", net);

  return net;
}

function optimizeSettlements(net: Record<string, number>) {
  const creditors = [];
  const debtors = [];

  // Separate creditors (positive balance) and debtors (negative balance)
  for (const [user, balance] of Object.entries(net)) {
    if (balance > 0.01) { // Use a small threshold to avoid floating point issues
      creditors.push({ user, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ user, amount: -balance });
    }
  }

  // Sort by amount (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];

  // Match creditors with debtors
  while (creditors.length && debtors.length) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const settleAmount = Math.min(creditor.amount, debtor.amount);
    settlements.push({ from: debtor.user, to: creditor.user, amount: settleAmount });

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }

  // Log the settlements for debugging
  console.log("Settlements:", settlements);

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
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const updateMaxContribution = (user: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    
    setForm({
      ...form,
      maxContributions: {
        ...form.maxContributions,
        [user]: numValue
      }
    });
  };

  const toggleParticipant = (user: string, isChecked: boolean) => {
    let newParticipants;
    let newMaxContributions = { ...form.maxContributions };
    
    if (isChecked) {
      // Add participant
      newParticipants = [...form.participants, user];
      
      // Initialize max contribution if not already set
      if (newMaxContributions[user] === undefined) {
        newMaxContributions[user] = 0;
      }
    } else {
      // Remove participant
      newParticipants = form.participants.filter((p: string) => p !== user);
      
      // Remove max contribution
      delete newMaxContributions[user];
    }
    
    setForm({
      ...form,
      participants: newParticipants,
      maxContributions: newMaxContributions
    });
  };

  const handleSubmit = async () => {
    // Reset errors
    const newErrors: Record<string, string> = {};
    
    // Validate form
    if (!form.description) {
      newErrors.description = 'Please enter a description';
    }
    
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!form.paidBy) {
      newErrors.paidBy = 'Please select who paid';
    }
    
    if (form.participants.length === 0) {
      newErrors.participants = 'Please select at least one participant';
    }
    
    // If there are errors, update the state and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const billData = {
      ...form,
      id: form.id || `bill-${Date.now()}`,
      amount: parseFloat(form.amount)
    };

    try {
      console.log('Submitting bill:', billData);
      
      const response = await fetch('/api/bills' + (isEditing ? `?id=${billData.id}` : ''), {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save bill');
      }
      
      console.log('Bill saved successfully:', data);
      await fetchBills(); // Refresh the bills list
      resetForm();
      setErrors({}); // Clear any errors
    } catch (err) {
      setError(`Failed to save bill: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error saving bill:', err);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!billId) {
      setError('Cannot delete bill: Missing bill ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        const response = await fetch('/api/bills', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: billId }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete bill');
        }
        
        await fetchBills(); // Refresh the bills list
        if (isEditing && form.id === billId) {
          resetForm();
        }
      } catch (err) {
        setError(`Failed to delete bill: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            <div>
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>
            <div>
              <Input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <select
                className={`w-full p-2 border rounded ${errors.paidBy ? "border-red-500" : ""}`}
                value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              >
                <option value="">Who paid?</option>
                {users.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              {errors.paidBy && (
                <p className="text-red-500 text-sm mt-1">{errors.paidBy}</p>
              )}
            </div>
            <div>
              <h3 className="font-bold mb-2">Participants</h3>
              {errors.participants && (
                <p className="text-red-500 text-sm mb-2">{errors.participants}</p>
              )}
              {users.map(user => (
                <div key={user} className="mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.participants.includes(user)}
                      onChange={(e) => toggleParticipant(user, e.target.checked)}
                    />
                    {user}
                  </label>
                  
                  {form.participants.includes(user) && (
                    <div className="ml-6 mt-1">
                      <Input
                        type="number"
                        placeholder="Maximum contribution (optional)"
                        value={form.maxContributions[user] || ''}
                        onChange={(e) => updateMaxContribution(user, e.target.value)}
                      />
                    </div>
                  )}
                </div>
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
                      {bill.maxContributions && Object.keys(bill.maxContributions).length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Maximum contributions:</p>
                          <ul className="list-disc list-inside">
                            {Object.entries(bill.maxContributions).map(([user, amount]) => (
                              <li key={user}>{user}: ${amount || 'No limit'}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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
