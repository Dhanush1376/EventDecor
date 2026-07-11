import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function RuleBuilder() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const rulesRes = await api.get(`/campaigns/${campaignId}/rules`);
      setRules(rulesRes.data.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    triggerEvent: 'on_checkout',
    conditions: { logic: 'AND', conditions: [] },
    outcomes: [],
  });

  const addCondition = () => {
    setNewRule((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        conditions: [
          ...prev.conditions.conditions,
          { field: 'order.total', operator: 'greater_than', value: '' },
        ],
      },
    }));
  };

  const updateCondition = (index, field, value) => {
    const updatedConditions = [...newRule.conditions.conditions];
    updatedConditions[index][field] = value;
    setNewRule((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, conditions: updatedConditions },
    }));
  };

  const removeCondition = (index) => {
    const updatedConditions = [...newRule.conditions.conditions];
    updatedConditions.splice(index, 1);
    setNewRule((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, conditions: updatedConditions },
    }));
  };

  const addOutcome = () => {
    setNewRule((prev) => ({
      ...prev,
      outcomes: [...prev.outcomes, { type: 'credit_wallet', value: { amount: '' } }],
    }));
  };

  const updateOutcome = (index, field, value) => {
    const updatedOutcomes = [...newRule.outcomes];
    if (field === 'type') {
      updatedOutcomes[index].type = value;
      updatedOutcomes[index].value = {};
    } else {
      updatedOutcomes[index].value[field] = value;
    }
    setNewRule((prev) => ({ ...prev, outcomes: updatedOutcomes }));
  };

  const removeOutcome = (index) => {
    const updatedOutcomes = [...newRule.outcomes];
    updatedOutcomes.splice(index, 1);
    setNewRule((prev) => ({ ...prev, outcomes: updatedOutcomes }));
  };

  const handleSaveRule = async () => {
    if (!newRule.name) {
      toast.error('Rule name is required');
      return;
    }
    try {
      const res = await api.post('/campaigns/rules', { ...newRule, campaignId });
      if (res.data?.success) {
        toast.success('Rule created successfully');
        setNewRule({
          name: '',
          description: '',
          triggerEvent: 'on_checkout',
          conditions: { logic: 'AND', conditions: [] },
          outcomes: [],
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to create rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/campaigns/rules/${id}`);
      toast.success('Rule deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Rule Builder</h1>
          <p className="text-sm text-gray-500">Configure visual IF/THEN rules for this campaign</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: New Rule Form */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-bold mb-4">Create New Rule</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Rule Name
              </label>
              <input
                type="text"
                className="w-full border rounded p-2 text-sm"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g. Summer 500 Cashback"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Trigger Event
              </label>
              <select
                className="w-full border rounded p-2 text-sm"
                value={newRule.triggerEvent}
                onChange={(e) => setNewRule({ ...newRule, triggerEvent: e.target.value })}
              >
                <option value="on_checkout">On Checkout Success</option>
                <option value="on_signup">On User Signup</option>
                <option value="on_review">On Product Review</option>
              </select>
            </div>

            {/* IF CONDITIONS */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm">IF Conditions (Logic: AND)</h4>
                <button
                  onClick={addCondition}
                  className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Condition
                </button>
              </div>

              {newRule.conditions.conditions.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  No conditions set. Rule will apply unconditionally.
                </p>
              ) : (
                <div className="space-y-2">
                  {newRule.conditions.conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 border rounded">
                      <select
                        className="text-xs border p-1 rounded"
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                      >
                        <option value="order.total">Order Total</option>
                        <option value="user.loyaltyTier">User Loyalty Tier</option>
                        <option value="order.itemsCount">Item Count</option>
                      </select>
                      <select
                        className="text-xs border p-1 rounded"
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      >
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                        <option value="equals">=</option>
                      </select>
                      <input
                        type="text"
                        className="text-xs border p-1 rounded w-20"
                        placeholder="Value"
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                      />
                      <button
                        onClick={() => removeCondition(idx)}
                        className="text-red-500 hover:text-red-700 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* THEN OUTCOMES */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-blue-900">THEN Outcomes</h4>
                <button
                  onClick={addOutcome}
                  className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Outcome
                </button>
              </div>

              {newRule.outcomes.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No outcomes set.</p>
              ) : (
                <div className="space-y-2">
                  {newRule.outcomes.map((out, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 bg-white p-2 border rounded border-blue-100"
                    >
                      <select
                        className="text-xs border p-1 rounded"
                        value={out.type}
                        onChange={(e) => updateOutcome(idx, 'type', e.target.value)}
                      >
                        <option value="credit_wallet">Credit Wallet</option>
                        <option value="issue_coupon">Issue Coupon</option>
                        <option value="tier_upgrade">Upgrade Tier</option>
                      </select>
                      {out.type === 'credit_wallet' && (
                        <input
                          type="number"
                          className="text-xs border p-1 rounded w-24"
                          placeholder="Amount (₹)"
                          value={out.value.amount || ''}
                          onChange={(e) => updateOutcome(idx, 'amount', e.target.value)}
                        />
                      )}
                      {out.type === 'issue_coupon' && (
                        <input
                          type="number"
                          className="text-xs border p-1 rounded w-24"
                          placeholder="Discount %"
                          value={out.value.discountValue || ''}
                          onChange={(e) => updateOutcome(idx, 'discountValue', e.target.value)}
                        />
                      )}
                      <button
                        onClick={() => removeOutcome(idx)}
                        className="text-red-500 hover:text-red-700 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveRule}
              className="w-full bg-black text-white p-3 rounded font-bold hover:bg-gray-800 flex justify-center items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Rule
            </button>
          </div>
        </div>

        {/* Right: Existing Rules List */}
        <div>
          <h3 className="text-lg font-bold mb-4">Active Rules ({rules.length})</h3>
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={rule._id} className="bg-white border rounded-lg p-4 shadow-sm relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleDeleteRule(rule._id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-gray-900">
                  {index + 1}. {rule.name}
                </h4>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase font-bold text-gray-500 my-2 inline-block">
                  Trigger: {rule.triggerEvent}
                </span>

                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <span className="font-bold">IF</span>{' '}
                  {rule.conditions.conditions.length === 0
                    ? 'Always'
                    : rule.conditions.conditions
                        .map((c) => `${c.field} ${c.operator} ${c.value}`)
                        .join(` ${rule.conditions.logic} `)}
                </div>

                <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                  <span className="font-bold">THEN</span>{' '}
                  {rule.outcomes
                    .map((o) => `${o.type.replace('_', ' ')} (${JSON.stringify(o.value)})`)
                    .join(' AND ')}
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-gray-500 text-sm">
                No rules created yet. Start by building a rule on the left.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
