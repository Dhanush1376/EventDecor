import React from 'react';
import toast from 'react-hot-toast';
import { AdminToggle } from '../AdminUIKit';

const FormGroup = ({ label, description, children }) => (
  <div className="space-y-1.5">
    <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
      {label}
    </label>
    {description && (
      <p className="text-[11.5px] text-[var(--admin-text-secondary)] -mt-0.5 mb-1.5">
        {description}
      </p>
    )}
    {children}
  </div>
);

const Input = ({ type = 'text', name, value, onChange, className = '', ...props }) => (
  <input
    type={type}
    name={name}
    value={value === undefined || value === null ? '' : value}
    onChange={onChange}
    className={`admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px] placeholder:text-[var(--admin-text-placeholder)] placeholder:opacity-55 placeholder:font-normal ${className}`}
    {...props}
  />
);

const PhoneInput = ({ name, value, onChange, placeholder = '98765 43210', ...props }) => {
  const cleanVal = (value || '').replace(/^\+?91\s*/, '').replace(/^0/, '');
  const placeholderClean = (placeholder || '').replace(/^\+?91\s*/, '');

  const handlePhoneChange = (e) => {
    let input = e.target.value.trim();
    if (input.startsWith('+91')) input = input.slice(3).trim();
    else if (input.startsWith('91') && input.length > 10) input = input.slice(2).trim();
    else if (input.startsWith('0')) input = input.slice(1).trim();

    const finalVal = input ? `+91 ${input}` : '';
    onChange({ target: { name, value: finalVal } });
  };

  return (
    <div className="relative flex items-center">
      <div className="absolute left-2.5 flex items-center gap-1 pointer-events-none select-none text-[12px] font-semibold text-[var(--admin-text-secondary)]">
        <span>🇮🇳</span>
        <span>+91</span>
        <span className="text-[var(--admin-border)] ml-0.5">|</span>
      </div>
      <input
        type="tel"
        name={name}
        value={cleanVal}
        onChange={handlePhoneChange}
        placeholder={placeholderClean}
        className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px] !pl-16 font-medium tracking-wide placeholder:text-[var(--admin-text-placeholder)] placeholder:opacity-55 placeholder:font-normal"
        {...props}
      />
    </div>
  );
};

const Select = ({ name, value, onChange, options = [], className = '', ...props }) => (
  <select
    name={name}
    value={value === undefined || value === null ? '' : value}
    onChange={onChange}
    className={`admin-select h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px] ${className}`}
    {...props}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

const Checkbox = ({ label, name, checked, onChange, description }) => (
  <div
    className={`h-full flex ${description ? 'items-start' : 'items-center'} gap-3 p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-[4px] transition-all`}
  >
    <AdminToggle
      checked={!!checked}
      onChange={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
      size="sm"
    />
    <div className={`${description ? 'pt-0.5' : ''} flex-1 min-w-0`}>
      <label className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight cursor-pointer select-none block">
        {label}
      </label>
      {description && (
        <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-1 leading-normal">
          {description}
        </p>
      )}
    </div>
  </div>
);

export const SaveButton = ({ saving, label = 'Save Settings' }) => (
  <button
    type="submit"
    disabled={saving}
    className="h-9 px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
  >
    <span className="material-symbols-outlined text-[16px]">save</span>
    <span>{saving ? 'Saving...' : label}</span>
  </button>
);

export const GeneralSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Store Name">
        <Input name="storeName" value={formData.storeName} onChange={handleChange} required />
      </FormGroup>
      <FormGroup label="Support Email">
        <Input
          type="email"
          name="supportEmail"
          value={formData.supportEmail}
          onChange={handleChange}
          placeholder="e.g. support@example.com"
        />
      </FormGroup>
      <FormGroup label="Primary Phone Number">
        <PhoneInput
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="98765 43210"
        />
      </FormGroup>
      <FormGroup label="Alternate Phone Number">
        <PhoneInput
          name="alternatePhone"
          value={formData.alternatePhone}
          onChange={handleChange}
          placeholder="98765 43211"
        />
      </FormGroup>
      <FormGroup label="WhatsApp Number">
        <PhoneInput
          name="whatsappNumber"
          value={formData.whatsappNumber}
          onChange={handleChange}
          placeholder="98765 43210"
        />
      </FormGroup>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
      <Checkbox
        name="storeEnabled"
        checked={formData.storeEnabled}
        onChange={handleChange}
        label="Enable Storefront"
      />
      <Checkbox
        name="maintenanceMode"
        checked={formData.maintenanceMode}
        onChange={handleChange}
        label="Enable Maintenance Mode"
      />
    </div>

    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const StoreDetailsLegalPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-7">
    {/* 1. General Info & Storefront Controls */}
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormGroup label="Store Name">
          <Input name="storeName" value={formData.storeName} onChange={handleChange} required />
        </FormGroup>
        <FormGroup label="Tagline">
          <Input
            name="tagline"
            value={formData.tagline}
            onChange={handleChange}
            placeholder="Enter brand tagline"
          />
        </FormGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Checkbox
          name="storeEnabled"
          checked={formData.storeEnabled}
          onChange={handleChange}
          label="Enable Storefront"
        />
        <Checkbox
          name="maintenanceMode"
          checked={formData.maintenanceMode}
          onChange={handleChange}
          label="Enable Maintenance Mode"
        />
      </div>
    </div>

    {/* 2. Contact Details & Customer Support */}
    <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)]">
      <h4 className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
        Contact Details
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormGroup label="Support Email">
          <Input
            type="email"
            name="supportEmail"
            value={formData.supportEmail}
            onChange={handleChange}
            placeholder="support@example.com"
          />
        </FormGroup>
        <FormGroup label="Support Hours">
          <Input
            name="supportHours"
            value={formData.supportHours}
            onChange={handleChange}
            placeholder="Mon - Sat, 10 AM to 6 PM"
          />
        </FormGroup>
        <FormGroup label="Primary Phone Number">
          <PhoneInput
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="98765 43210"
          />
        </FormGroup>
        <FormGroup label="Alternate Phone Number">
          <PhoneInput
            name="alternatePhone"
            value={formData.alternatePhone}
            onChange={handleChange}
            placeholder="98765 43211"
          />
        </FormGroup>
        <div className="md:col-span-2">
          <FormGroup label="WhatsApp Number">
            <PhoneInput
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="98765 43210"
            />
          </FormGroup>
        </div>
      </div>
    </div>

    {/* 3. Physical Address & Location */}
    <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)]">
      <h4 className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
        Store Location
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <FormGroup label="Physical Address">
            <textarea
              name="address"
              rows={2}
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Street address, landmark"
              className="admin-textarea"
            />
          </FormGroup>
        </div>
        <FormGroup label="City">
          <Input name="city" value={formData.city} onChange={handleChange} placeholder="City" />
        </FormGroup>
        <FormGroup label="State">
          <Input name="state" value={formData.state} onChange={handleChange} placeholder="State" />
        </FormGroup>
        <FormGroup label="Postal Code">
          <Input
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            placeholder="PIN Code"
          />
        </FormGroup>
        <FormGroup label="Country">
          <Input
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Country"
          />
        </FormGroup>
      </div>
    </div>

    {/* 4. Legal & Corporate Identity */}
    <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)]">
      <h4 className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
        Legal & Company
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormGroup label="Brand / Display Name">
          <Input
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Brand name"
          />
        </FormGroup>
        <FormGroup label="Registered Legal Company Name">
          <Input
            name="legalCompanyName"
            value={formData.legalCompanyName}
            onChange={handleChange}
            placeholder="Registered company name"
          />
        </FormGroup>
        <FormGroup label="CIN (Corporate Identification Number)">
          <Input name="cin" value={formData.cin} onChange={handleChange} placeholder="CIN number" />
        </FormGroup>
        <div className="md:col-span-2">
          <FormGroup label="Registered Address">
            <textarea
              name="registeredAddress"
              rows={2}
              value={formData.registeredAddress || ''}
              onChange={handleChange}
              placeholder="Registered corporate address"
              className="admin-textarea"
            />
          </FormGroup>
        </div>
      </div>
    </div>

    {/* Form Footer / Save Bar */}
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const ShippingSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Base Delivery Charge (₹)">
        <Input
          type="number"
          name="deliveryCharge"
          value={formData.deliveryCharge}
          onChange={handleChange}
          min="0"
        />
      </FormGroup>
      <FormGroup label="Free Shipping Threshold (₹)">
        <Input
          type="number"
          name="freeShippingThreshold"
          value={formData.freeShippingThreshold}
          onChange={handleChange}
          min="0"
        />
      </FormGroup>
      <FormGroup label="Estimated Delivery Days">
        <Input
          name="estimatedDeliveryDays"
          value={formData.estimatedDeliveryDays}
          onChange={handleChange}
          placeholder="e.g. 5-7"
        />
      </FormGroup>
    </div>

    <div className="pt-1">
      <Checkbox
        name="enableFreeShipping"
        checked={formData.enableFreeShipping}
        onChange={handleChange}
        label="Enable Free Shipping Over Threshold"
      />
    </div>

    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const ShippingOrdersPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    {/* 1. Shipping & Delivery Configuration */}
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
        <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
          local_shipping
        </span>
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
          Shipping & Delivery Charges
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormGroup label="Standard Delivery Fee (₹)">
          <Input
            type="number"
            name="deliveryCharge"
            value={formData.deliveryCharge}
            onChange={handleChange}
            min="0"
          />
        </FormGroup>
        <FormGroup label="Free Delivery on Orders Above (₹)">
          <Input
            type="number"
            name="freeShippingThreshold"
            value={formData.freeShippingThreshold}
            onChange={handleChange}
            min="0"
          />
        </FormGroup>
        <FormGroup label="Estimated Delivery Time">
          <Input
            name="estimatedDeliveryDays"
            value={formData.estimatedDeliveryDays}
            onChange={handleChange}
            placeholder="e.g. 4-6 business days"
          />
        </FormGroup>
        <FormGroup label="Packaging & Handling Fee (₹)">
          <Input
            type="number"
            name="packagingFee"
            value={formData.packagingFee}
            onChange={handleChange}
            min="0"
          />
        </FormGroup>
        <FormGroup label="Store Dispatch Pincode">
          <Input
            name="originPincode"
            value={formData.originPincode}
            onChange={handleChange}
            placeholder="e.g. 523001"
          />
        </FormGroup>
        <FormGroup label="Primary Courier Partner">
          <Input
            name="defaultCourierPartner"
            value={formData.defaultCourierPartner}
            onChange={handleChange}
            placeholder="e.g. BlueDart Express, Delhivery, DTDC"
          />
        </FormGroup>
      </div>
    </div>

    {/* 2. Order Limits & Platform Rules */}
    <div className="space-y-5 pt-4 border-t border-[var(--admin-border-subtle)]">
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
        <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
          shopping_bag
        </span>
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
          Order Limits & Checkout Rules
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormGroup label="Max Different Products in One Order">
          <Input
            type="number"
            name="maxItemsPerOrder"
            value={formData.maxItemsPerOrder}
            onChange={handleChange}
            min="1"
          />
        </FormGroup>
        <FormGroup label="Max Quantity Allowed per Product">
          <Input
            type="number"
            name="maxQuantityPerItem"
            value={formData.maxQuantityPerItem}
            onChange={handleChange}
            min="1"
          />
        </FormGroup>
        <FormGroup label="Minimum Allowed Order Amount (₹)">
          <Input
            type="number"
            name="minOrderValue"
            value={formData.minOrderValue}
            onChange={handleChange}
            min="0"
          />
        </FormGroup>
        <FormGroup label="Maximum Allowed Order Amount (₹)">
          <Input
            type="number"
            name="maxOrderValue"
            value={formData.maxOrderValue}
            onChange={handleChange}
            min="0"
          />
        </FormGroup>
        <div className="md:col-span-2">
          <FormGroup label="Standard Platform & Service Fee (₹)">
            <Input
              type="number"
              name="platformFee"
              value={formData.platformFee}
              onChange={handleChange}
              min="0"
            />
          </FormGroup>
        </div>
      </div>
    </div>

    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const PaymentSettingsPanel = ({ formData, handleChange, handleSave, saving }) => {
  const isRazorpayActive = Boolean(formData.enableRazorpay);
  const isCodActive = Boolean(formData.enableCOD);

  const handleToggleRazorpay = (e) => {
    const nextChecked = e.target.checked;
    if (!nextChecked && !isCodActive) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    handleChange(e);
  };

  const handleToggleCOD = (e) => {
    const nextChecked = e.target.checked;
    if (!nextChecked && !isRazorpayActive) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    handleChange(e);
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.enableRazorpay && !formData.enableCOD) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    handleSave(e);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!isRazorpayActive && !isCodActive && (
          <div className="md:col-span-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-[4px] flex items-center gap-2.5 text-amber-800 text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
            <span>Both methods are currently disabled. Please enable at least one to save.</span>
          </div>
        )}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Checkbox
            name="enableRazorpay"
            checked={formData.enableRazorpay}
            onChange={handleToggleRazorpay}
            label="Enable Razorpay Gateway"
            description={
              isRazorpayActive && !isCodActive
                ? 'Only active payment method (cannot be disabled while Cash on Delivery is off)'
                : undefined
            }
          />
          <Checkbox
            name="enableCOD"
            checked={formData.enableCOD}
            onChange={handleToggleCOD}
            label="Enable Cash on Delivery"
            description={
              !isRazorpayActive && isCodActive
                ? 'Only active payment method (cannot be disabled while Razorpay Gateway is off)'
                : undefined
            }
          />
        </div>
        {formData.enableCOD && (
          <>
            <FormGroup label="COD OTP Verification Channel">
              <Select
                name="codOtpChannel"
                value={
                  formData.codOtpChannel === 'both' ? 'phone' : formData.codOtpChannel || 'phone'
                }
                onChange={handleChange}
                options={[
                  { value: 'phone', label: 'Phone (SMS Verification)' },
                  { value: 'email', label: 'Email (Verification Code)' },
                ]}
              />
            </FormGroup>
            <FormGroup label="COD Handling Fee (₹)">
              <Input type="number" name="codFee" value={formData.codFee} onChange={handleChange} />
            </FormGroup>
            <FormGroup label="Minimum Order for COD (₹)">
              <Input
                type="number"
                name="codMinOrder"
                value={formData.codMinOrder}
                onChange={handleChange}
              />
            </FormGroup>
            <FormGroup label="Maximum Order for COD (₹)">
              <Input
                type="number"
                name="codMaxOrder"
                value={formData.codMaxOrder}
                onChange={handleChange}
              />
            </FormGroup>
          </>
        )}
      </div>
      <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
};

export const PaymentsTaxesPanel = ({
  paymentsFormData = {},
  taxesFormData = {},
  onPaymentsChange,
  onTaxesChange,
  handleSave,
  saving,
}) => {
  const isRazorpayActive = Boolean(paymentsFormData.enableRazorpay);
  const isCodActive = Boolean(paymentsFormData.enableCOD);

  const handleToggleRazorpay = (e) => {
    const nextChecked = e.target.checked;
    if (!nextChecked && !isCodActive) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    onPaymentsChange(e);
  };

  const handleToggleCOD = (e) => {
    const nextChecked = e.target.checked;
    if (!nextChecked && !isRazorpayActive) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    onPaymentsChange(e);
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (!paymentsFormData.enableRazorpay && !paymentsFormData.enableCOD) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    handleSave(e);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-8">
      {/* 1. Payment Methods & Gateways */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
            payments
          </span>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
            Payment Methods & Gateways
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {!isRazorpayActive && !isCodActive && (
            <div className="md:col-span-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-[4px] flex items-center gap-2.5 text-amber-800 text-xs font-semibold">
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              <span>Both methods are currently disabled. Please enable at least one to save.</span>
            </div>
          )}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              name="enableRazorpay"
              checked={paymentsFormData.enableRazorpay}
              onChange={handleToggleRazorpay}
              label="Enable Razorpay Gateway"
              description={
                isRazorpayActive && !isCodActive
                  ? 'Only active payment method (cannot be disabled while Cash on Delivery is off)'
                  : undefined
              }
            />
            <Checkbox
              name="enableCOD"
              checked={paymentsFormData.enableCOD}
              onChange={handleToggleCOD}
              label="Enable Cash on Delivery"
              description={
                !isRazorpayActive && isCodActive
                  ? 'Only active payment method (cannot be disabled while Razorpay Gateway is off)'
                  : undefined
              }
            />
          </div>
          {paymentsFormData.enableCOD && (
            <>
              <FormGroup label="COD OTP Verification Channel">
                <Select
                  name="codOtpChannel"
                  value={
                    paymentsFormData.codOtpChannel === 'both'
                      ? 'phone'
                      : paymentsFormData.codOtpChannel || 'phone'
                  }
                  onChange={onPaymentsChange}
                  options={[
                    { value: 'phone', label: 'Phone (SMS Verification)' },
                    { value: 'email', label: 'Email (Verification Code)' },
                  ]}
                />
              </FormGroup>
              <FormGroup label="COD Handling Fee (₹)">
                <Input
                  type="number"
                  name="codFee"
                  value={paymentsFormData.codFee}
                  onChange={onPaymentsChange}
                />
              </FormGroup>
              <FormGroup label="Minimum Order for COD (₹)">
                <Input
                  type="number"
                  name="codMinOrder"
                  value={paymentsFormData.codMinOrder}
                  onChange={onPaymentsChange}
                />
              </FormGroup>
              <FormGroup label="Maximum Order for COD (₹)">
                <Input
                  type="number"
                  name="codMaxOrder"
                  value={paymentsFormData.codMaxOrder}
                  onChange={onPaymentsChange}
                />
              </FormGroup>
            </>
          )}
        </div>
      </div>

      {/* 2. Taxes, GST & Invoicing */}
      <div className="space-y-5 pt-4 border-t border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
            receipt_long
          </span>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
            Taxes, GST & Invoicing
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              name="gstEnabled"
              checked={taxesFormData.gstEnabled}
              onChange={onTaxesChange}
              label="Enable GST Computation"
            />
            <Checkbox
              name="taxInclusive"
              checked={taxesFormData.taxInclusive}
              onChange={onTaxesChange}
              label="Prices are Tax Inclusive"
            />
          </div>
          <FormGroup label="GST Number">
            <Input
              name="gstNumber"
              value={taxesFormData.gstNumber}
              onChange={onTaxesChange}
              placeholder="e.g. 29AAAAA0000A1Z5"
            />
          </FormGroup>
          <FormGroup label="Base GST Rate (e.g. 0.18 for 18%)">
            <Input
              type="number"
              step="0.01"
              name="gstRate"
              value={taxesFormData.gstRate}
              onChange={onTaxesChange}
            />
          </FormGroup>
          <FormGroup label="CGST Rate (e.g. 0.09 for 9%)">
            <Input
              type="number"
              step="0.01"
              name="cgstRate"
              value={taxesFormData.cgstRate}
              onChange={onTaxesChange}
            />
          </FormGroup>
          <FormGroup label="SGST Rate (e.g. 0.09 for 9%)">
            <Input
              type="number"
              step="0.01"
              name="sgstRate"
              value={taxesFormData.sgstRate}
              onChange={onTaxesChange}
            />
          </FormGroup>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
};

export const ReturnSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Checkbox
        name="enableReturns"
        checked={formData.enableReturns}
        onChange={handleChange}
        label="Enable Returns"
      />
      <Checkbox
        name="enableExchanges"
        checked={formData.enableExchanges}
        onChange={handleChange}
        label="Enable Exchanges"
      />

      <FormGroup label="Return Window (Days)">
        <Input
          type="number"
          name="returnWindowDays"
          value={formData.returnWindowDays}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Exchange Window (Days)">
        <Input
          type="number"
          name="exchangeWindowDays"
          value={formData.exchangeWindowDays}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Return Processing Time">
        <Input
          name="returnProcessingDays"
          value={formData.returnProcessingDays}
          onChange={handleChange}
          placeholder="e.g. 3-5 business days"
        />
      </FormGroup>
      <FormGroup label="Refund Processing Timeline">
        <Input
          name="refundProcessingDays"
          value={formData.refundProcessingDays}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const LoyaltySettingsPanel = ({
  formData,
  handleChange,
  handleCustomChange,
  handleSave,
  saving,
}) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-1">Earnings</h4>
        <hr className="border-[var(--admin-border-subtle)] mb-4" />
      </div>
      <FormGroup label="Siri Coins per ₹1 Spent">
        <Input
          type="number"
          step="0.01"
          name="coinsPerRupee"
          value={formData.coinsPerRupee}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Welcome Bonus (Wallet Cash)">
        <Input
          type="number"
          name="welcomeBonus"
          value={formData.welcomeBonus}
          onChange={handleChange}
        />
      </FormGroup>

      <div className="md:col-span-2 mt-4">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-1">Review Rewards</h4>
        <hr className="border-[var(--admin-border-subtle)] mb-4" />
      </div>
      <FormGroup label="Text Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardText"
          value={formData.reviewRewardText}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Photo Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardPhoto"
          value={formData.reviewRewardPhoto}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Video Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardVideo"
          value={formData.reviewRewardVideo}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Review Siri Coins Bonus">
        <Input
          type="number"
          name="reviewCoinsBonus"
          value={formData.reviewCoinsBonus}
          onChange={handleChange}
        />
      </FormGroup>
    </div>

    {formData.tiers && (
      <div className="mt-8">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-4">Loyalty Tiers</h4>
        <div className="admin-card-inset p-4 space-y-4 rounded-[var(--admin-radius-lg)]">
          {formData.tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <FormGroup label="Tier Name">
                <input
                  type="text"
                  value={tier.name || ''}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, name: e.target.value } : t,
                    );
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Min Spend (₹)">
                <input
                  type="number"
                  value={tier.minSpend === undefined ? '' : tier.minSpend}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, minSpend: Number(e.target.value) } : t,
                    );
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Cashback Rate (e.g. 0.05 for 5%)">
                <input
                  type="number"
                  step="0.01"
                  value={tier.cashbackRate === undefined ? '' : tier.cashbackRate}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, cashbackRate: Number(e.target.value) } : t,
                    );
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const OrderSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Max Items Per Order">
        <Input
          type="number"
          name="maxItemsPerOrder"
          value={formData.maxItemsPerOrder}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Max Quantity Per Item">
        <Input
          type="number"
          name="maxQuantityPerItem"
          value={formData.maxQuantityPerItem}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Minimum Order Value (₹)">
        <Input
          type="number"
          name="minOrderValue"
          value={formData.minOrderValue}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Maximum Order Value (₹)">
        <Input
          type="number"
          name="maxOrderValue"
          value={formData.maxOrderValue}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Platform Fee (₹)">
        <Input
          type="number"
          name="platformFee"
          value={formData.platformFee}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const TaxSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2 space-y-3">
        <Checkbox
          name="gstEnabled"
          checked={formData.gstEnabled}
          onChange={handleChange}
          label="Enable GST Computation"
        />
        <Checkbox
          name="taxInclusive"
          checked={formData.taxInclusive}
          onChange={handleChange}
          label="Prices are Tax Inclusive"
        />
      </div>
      <FormGroup label="GST Number">
        <Input name="gstNumber" value={formData.gstNumber} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Base GST Rate (e.g. 0.18 for 18%)">
        <Input
          type="number"
          step="0.01"
          name="gstRate"
          value={formData.gstRate}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="CGST Rate (e.g. 0.09 for 9%)">
        <Input
          type="number"
          step="0.01"
          name="cgstRate"
          value={formData.cgstRate}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="SGST Rate (e.g. 0.09 for 9%)">
        <Input
          type="number"
          step="0.01"
          name="sgstRate"
          value={formData.sgstRate}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const ContactSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Email Address">
        <Input type="email" name="email" value={formData.email} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Primary Phone Number">
        <PhoneInput
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="98765 43210"
        />
      </FormGroup>
      <FormGroup label="Alternate Phone Number">
        <PhoneInput
          name="alternatePhone"
          value={formData.alternatePhone}
          onChange={handleChange}
          placeholder="98765 43211"
        />
      </FormGroup>
      <FormGroup label="WhatsApp Number">
        <PhoneInput
          name="whatsappNumber"
          value={formData.whatsappNumber}
          onChange={handleChange}
          placeholder="98765 43210"
        />
      </FormGroup>
      <FormGroup label="Support Hours">
        <Input name="supportHours" value={formData.supportHours} onChange={handleChange} />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Physical Address">
          <textarea
            name="address"
            rows={3}
            value={formData.address || ''}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
      <FormGroup label="City">
        <Input
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="e.g. Ongole"
        />
      </FormGroup>
      <FormGroup label="State">
        <Input
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="e.g. Andhra Pradesh"
        />
      </FormGroup>
      <FormGroup label="Postal Code">
        <Input
          name="postalCode"
          value={formData.postalCode}
          onChange={handleChange}
          placeholder="e.g. 523001"
        />
      </FormGroup>
      <FormGroup label="Country">
        <Input
          name="country"
          value={formData.country}
          onChange={handleChange}
          placeholder="e.g. India"
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const LegalSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Brand / Display Name">
        <Input name="companyName" value={formData.companyName} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Registered Legal Company Name">
        <Input
          name="legalCompanyName"
          value={formData.legalCompanyName}
          onChange={handleChange}
          placeholder="e.g. Siri Arts and Crafts Private Limited"
        />
      </FormGroup>
      <FormGroup label="CIN (Corporate Identification Number)">
        <Input name="cin" value={formData.cin} onChange={handleChange} />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Registered Address">
          <textarea
            name="registeredAddress"
            rows={3}
            value={formData.registeredAddress || ''}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const CancellationSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <Checkbox
          name="allowCustomerCancellation"
          checked={formData.allowCustomerCancellation || formData.allowCancellation}
          onChange={handleChange}
          label="Allow Customer Cancellation"
        />
      </div>
      {(formData.allowCustomerCancellation || formData.allowCancellation) && (
        <>
          <FormGroup label="Cancellation Window (Hours)">
            <Input
              type="number"
              name="cancellationWindowHours"
              value={formData.cancellationWindowHours}
              onChange={handleChange}
            />
          </FormGroup>
          <FormGroup label="Refund Timeline">
            <Input
              type="text"
              name="refundTimeline"
              value={formData.refundTimeline}
              onChange={handleChange}
            />
          </FormGroup>
        </>
      )}
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const StorefrontSettingsPanel = ({ formData, handleChange, handleSave, saving }) => {
  const currentAuthMethod = formData.customerAuthMethod || 'both';

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* 1. Customer Authentication Modal Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
            badge
          </span>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
            Customer Login & Auth Modal Methods
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Option 1: Combined */}
          <div
            onClick={() => handleChange({ target: { name: 'customerAuthMethod', value: 'both' } })}
            className={`p-3.5 rounded-[6px] border cursor-pointer transition-all flex items-center justify-between ${
              currentAuthMethod === 'both'
                ? 'bg-[var(--admin-accent)]/10 border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-xs'
                : 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[19px] text-[var(--admin-accent)]">
                devices
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Combined (Phone or Email in 1)
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                currentAuthMethod === 'both'
                  ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]'
                  : 'border-[var(--admin-border)]'
              }`}
            >
              {currentAuthMethod === 'both' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* Option 2: Phone Only */}
          <div
            onClick={() =>
              handleChange({ target: { name: 'customerAuthMethod', value: 'phone_only' } })
            }
            className={`p-3.5 rounded-[6px] border cursor-pointer transition-all flex items-center justify-between ${
              currentAuthMethod === 'phone_only'
                ? 'bg-[var(--admin-accent)]/10 border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-xs'
                : 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[19px] text-[var(--admin-accent)]">
                smartphone
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Mobile Phone Only
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                currentAuthMethod === 'phone_only'
                  ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]'
                  : 'border-[var(--admin-border)]'
              }`}
            >
              {currentAuthMethod === 'phone_only' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* Option 3: Email Only */}
          <div
            onClick={() =>
              handleChange({ target: { name: 'customerAuthMethod', value: 'email_only' } })
            }
            className={`p-3.5 rounded-[6px] border cursor-pointer transition-all flex items-center justify-between ${
              currentAuthMethod === 'email_only'
                ? 'bg-[var(--admin-accent)]/10 border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-xs'
                : 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[19px] text-[var(--admin-accent)]">
                mail
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Email Only
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                currentAuthMethod === 'email_only'
                  ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]'
                  : 'border-[var(--admin-border)]'
              }`}
            >
              {currentAuthMethod === 'email_only' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEO & Search Visibility */}
      <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-2 pb-1 border-b border-[var(--admin-border-subtle)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
            travel_explore
          </span>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-wide">
            SEO & Search Visibility
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <FormGroup label="Default SEO Title">
              <Input name="seoTitle" value={formData.seoTitle} onChange={handleChange} />
            </FormGroup>
          </div>
          <div className="md:col-span-2">
            <FormGroup label="Default SEO Meta Description">
              <textarea
                name="seoDescription"
                rows={3}
                value={formData.seoDescription || ''}
                onChange={handleChange}
                className="admin-textarea"
              />
            </FormGroup>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
};
